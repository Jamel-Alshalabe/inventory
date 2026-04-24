import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/lib/app-context";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import StockMovementsPage from "@/pages/stock-movements";
import InvoicesPage from "@/pages/invoices";
import WarehousesPage from "@/pages/warehouses";
import UsersPage from "@/pages/users";
import SubscriptionsPage from "@/pages/subscriptions";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function PermissionGuard({ 
  children, 
  permissions, 
  requireAny = true 
}: { 
  children: React.ReactNode; 
  permissions: string[]; 
  requireAny?: boolean; // true = any permission, false = all permissions
}) {
  const { user } = useApp();
  
  if (!user?.permissions || user.permissions.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        ليس لديك صلاحية للوصول لهذه الصفحة
      </div>
    );
  }
  
  const hasPermission = requireAny
    ? permissions.some(permission => user.permissions.includes(permission))
    : permissions.every(permission => user.permissions.includes(permission));
    
  if (!hasPermission) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        ليس لديك صلاحية للوصول لهذه الصفحة
      </div>
    );
  }
  
  return <>{children}</>;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/stock-movements" component={StockMovementsPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/warehouses">
        {() => (
          <PermissionGuard permissions={["manage-warehouses"]}>
            <WarehousesPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <PermissionGuard permissions={["view-users"]}>
            <UsersPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/subscriptions">
        {() => {
          const { user } = useApp();
          return user?.role === 'super_admin' ? <SubscriptionsPage /> : <NotFound />;
        }}
      </Route>
      <Route path="/settings">
        {() => (
          <PermissionGuard permissions={["manage-settings"]}>
            <SettingsPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/logs" component={LogsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Gate() {
  const { user, loading } = useApp();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return (
    <Layout>
      <Routes />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Gate />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
