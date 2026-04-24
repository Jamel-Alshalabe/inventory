import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser, type Warehouse, type Role } from "./api";

type AppContextValue = {
  user: AuthUser | null;
  loading: boolean;
  warehouses: Warehouse[];
  selectedWarehouseId: number | null;
  setSelectedWarehouseId: (id: number | null) => void;
  settings: Record<string, string>;
  refreshUser: () => Promise<void>;
  refreshWarehouses: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
};

type RefreshUserOptions = {
  preserveSessionOnAuthError?: boolean;
};

const Ctx = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  user: "snk:user",
  token: "snk:token",
  legacyToken: "auth_token",
  sessionTime: "snk:session_time",
  warehouse: "snk:warehouse",
} as const;

const getStoredToken = (): string | null => {
  const primaryToken = localStorage.getItem(STORAGE_KEYS.token);
  if (primaryToken) return primaryToken;

  const legacyToken = localStorage.getItem(STORAGE_KEYS.legacyToken);
  if (legacyToken) {
    localStorage.setItem(STORAGE_KEYS.token, legacyToken);
    return legacyToken;
  }

  return null;
};

const saveTokenToStorage = (token?: string) => {
  if (!token) return;
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.legacyToken, token);
};

const clearStoredSession = () => {
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.sessionTime);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
};

// Helper functions for localStorage
const saveUserToStorage = (user: AuthUser | null, token?: string) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    saveTokenToStorage(token ?? getStoredToken() ?? undefined);
  } else {
    clearStoredSession();
  }
};

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.user);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading from storage:", error);
    return null;
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseIdRaw] = useState<number | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const setSelectedWarehouseId = useCallback((id: number | null) => {
    setSelectedWarehouseIdRaw(id);
    if (id) localStorage.setItem(STORAGE_KEYS.warehouse, String(id));
    else localStorage.removeItem(STORAGE_KEYS.warehouse);
  }, []);

  const refreshUser = useCallback(async (options?: RefreshUserOptions) => {
    try {
      const userResponse = await api.getMe();

      if (userResponse.user) {
        const authUser: AuthUser = {
          id: userResponse.user.id,
          username: userResponse.user.username,
          role: userResponse.user.role as Role,
          permissions: (userResponse.user as any).permissions || [],
          assignedWarehouseId: userResponse.user.assignedWarehouseId ?? null,
          assignedWarehouseName: userResponse.user.assignedWarehouseName ?? null,
          maxWarehouses: (userResponse.user as any).max_warehouses || 1,
        };
        setUser(authUser);
        const existingToken = getStoredToken();
        saveUserToStorage(authUser, existingToken || undefined);
      } else {
        setUser(null);
        saveUserToStorage(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      
      // Check if it's an auth error (401/403)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) {
          if (options?.preserveSessionOnAuthError) {
            const storedUser = loadUserFromStorage();
            const storedToken = getStoredToken();

            if (storedUser) {
              setUser(storedUser);
              saveUserToStorage(storedUser, storedToken || undefined);
              return;
            }
          }

          setUser(null);
          saveUserToStorage(null);
          return;
        }
      }

      const storedUser = loadUserFromStorage();
      const storedToken = getStoredToken();

      if (storedUser) {
        setUser(storedUser);
        saveUserToStorage(storedUser, storedToken || undefined);
      } else {
        setUser(null);
        saveUserToStorage(null);
      }
    }
  }, []);

  const refreshWarehouses = useCallback(async () => {
    try {
      const ws = await api.listWarehouses();
      setWarehouses(ws);
    } catch {
      setWarehouses([]);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch {
      setSettings({});
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await api.login({ username, password });
      const authUser: AuthUser = {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role as Role,
        permissions: (response.user as any).permissions || [], // Copy permissions from API response
        assignedWarehouseId: response.user.assignedWarehouseId ?? null,
        assignedWarehouseName: response.user.assignedWarehouseName ?? null,
        maxWarehouses: (response.user as any).max_warehouses || 1,
      };
      setUser(authUser);

      saveUserToStorage(authUser, (response as any).token);
      
      await Promise.all([refreshWarehouses(), refreshSettings()]);
    },
    [refreshWarehouses, refreshSettings],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    saveUserToStorage(null);
    setWarehouses([]);
    setSelectedWarehouseId(null);
  }, [setSelectedWarehouseId]);

  // Initial auth check - only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        if (isMounted) {
          const storedUser = loadUserFromStorage();
          const storedToken = getStoredToken();

          if (storedUser) {
            setUser(storedUser);

            if (storedToken) {
              try {
                await refreshUser({ preserveSessionOnAuthError: true });
              } catch (refreshError) {
                console.warn("API refresh failed, but keeping stored user:", refreshError);
                saveUserToStorage(storedUser, storedToken);
              }
            }
          } else {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      void refreshWarehouses();
      void refreshSettings();
    }
  }, [user, refreshWarehouses, refreshSettings]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "user" && user.assignedWarehouseId) {
      setSelectedWarehouseIdRaw(user.assignedWarehouseId);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.warehouse);
    if (saved && warehouses.find((w) => w.id === Number(saved))) {
      setSelectedWarehouseIdRaw(Number(saved));
    } else if (warehouses.length > 0 && selectedWarehouseId === null) {
      setSelectedWarehouseIdRaw(warehouses[0].id);
    }
  }, [user, warehouses, selectedWarehouseId]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      loading,
      warehouses,
      selectedWarehouseId,
      setSelectedWarehouseId,
      settings,
      refreshUser,
      refreshWarehouses,
      refreshSettings,
      login,
      logout,
    }),
    [
      user,
      loading,
      warehouses,
      selectedWarehouseId,
      setSelectedWarehouseId,
      settings,
      refreshUser,
      refreshWarehouses,
      refreshSettings,
      login,
      logout,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}

export function warehouseQuery(id: number | null): string {
  return id ? `?warehouse_id=${id}` : "";
}
