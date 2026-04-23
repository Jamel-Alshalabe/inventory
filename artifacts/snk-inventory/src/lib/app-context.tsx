import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser, type Warehouse } from "./api";

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

const Ctx = createContext<AppContextValue | null>(null);

// Helper functions for localStorage
const saveUserToStorage = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem('snk:user', JSON.stringify(user));
  } else {
    localStorage.removeItem('snk:user');
  }
};

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem('snk:user');
    return stored ? JSON.parse(stored) : null;
  } catch {
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
    if (id) localStorage.setItem("snk:warehouse", String(id));
    else localStorage.removeItem("snk:warehouse");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userResponse = await api.getMe();
      // Convert API response to AuthUser format
      if (userResponse.user) {
        const authUser: AuthUser = {
          id: userResponse.user.id,
          username: userResponse.user.username,
          role: userResponse.user.role,
          permissions: [], // TODO: Get permissions from backend or calculate based on role
          assignedWarehouseId: userResponse.user.assignedWarehouseId ?? null,
          assignedWarehouseName: userResponse.user.assignedWarehouseName ?? null,
        };
        setUser(authUser);
        saveUserToStorage(authUser);
      } else {
        setUser(null);
        saveUserToStorage(null);
      }
    } catch (error) {
      // User is not authenticated - this is normal on initial load
      setUser(null);
      saveUserToStorage(null);
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
      // Convert API response to AuthUser format
      const authUser: AuthUser = {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role,
        permissions: (response.user as any).permissions || [], // Copy permissions from API response
        assignedWarehouseId: response.user.assignedWarehouseId ?? null,
        assignedWarehouseName: response.user.assignedWarehouseName ?? null,
      };
      setUser(authUser);
      saveUserToStorage(authUser);
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
          // First, try to load user from localStorage for instant UI
          const storedUser = loadUserFromStorage();
          if (storedUser) {
            setUser(storedUser);
          }
          
          // Then verify with API to get fresh data
          await refreshUser();
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
    const saved = localStorage.getItem("snk:warehouse");
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
