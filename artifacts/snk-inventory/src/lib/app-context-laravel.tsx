import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, type AuthUser, type Warehouse } from "./api-client";

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
      const user = await apiClient.getCurrentUser();
      setUser(user);
    } catch (error) {
      // User is not authenticated
      setUser(null);
    }
  }, []);

  const refreshWarehouses = useCallback(async () => {
    try {
      const ws = await apiClient.getWarehouses();
      setWarehouses(ws);
    } catch {
      setWarehouses([]);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await apiClient.getSettings();
      setSettings(s);
    } catch {
      setSettings({});
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await apiClient.login({ username, password });
      setUser(response.user);
      await Promise.all([refreshWarehouses(), refreshSettings()]);
    },
    [refreshWarehouses, refreshSettings],
  );

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    setWarehouses([]);
    setSelectedWarehouseId(null);
  }, [setSelectedWarehouseId]);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

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
