import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/lib/app-context";
import { Layout } from "@/components/shared/layout";
import LoginPage from "@/app/login/page";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import ProductsPage from "@/app/(dashboard)/products/page";
import StockMovementsPage from "@/app/(dashboard)/stock-movements/page";
import InvoicesPage from "@/app/(dashboard)/invoices/page";
import WarehousesPage from "@/app/(dashboard)/warehouses/page";
import UsersPage from "@/app/(dashboard)/users/page";
import SubscriptionsPage from "@/app/(dashboard)/subscriptions/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import LogsPage from "@/app/(dashboard)/logs/page";
import ReportsPage from "@/app/(dashboard)/reports/page";
import NotFound from "@/app/not-found";
import "@/styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function Routes() {
  const { user } = useApp();

  function PermissionGuard({ 
    children, 
    permissions, 
    requireAny = true 
  }: { 
    children: React.ReactNode; 
    permissions: string[]; 
    requireAny?: boolean; // true = any permission, false = all permissions
  }) {
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

  return (
    <Switch>
       
      <Route path="/">
      {() => (
          <PermissionGuard permissions={["view-dashboard"]}>
            <DashboardPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/dashboard">
      {() => (
          <PermissionGuard permissions={["view-dashboard"]}>
            <DashboardPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/products">
      {() => (
          <PermissionGuard permissions={["view-products"]}>
            <ProductsPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/stock-movements">
      {() => (
          <PermissionGuard permissions={["view-movements"]}>
            <StockMovementsPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/invoices">
      {() => (
          <PermissionGuard permissions={["view-invoices"]}>
            <InvoicesPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/reports">
      {() => (
          <PermissionGuard permissions={["view-reports"]}>
            <ReportsPage />
          </PermissionGuard>
        )}
      </Route>
      <Route path="/warehouses">
        {() => (
          <PermissionGuard permissions={["view-warehouses"]}>
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
        {() => (user?.role === 'super_admin' ? <SubscriptionsPage /> : <NotFound />)}
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
  const base = typeof window !== "undefined" ? "" : ""; // Simplified for now
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter>
            <Gate />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
