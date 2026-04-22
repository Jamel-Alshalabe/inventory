import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/lib/app-context";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import MovementsPage from "@/pages/movements";
import InvoicesPage from "@/pages/invoices";
import WarehousesPage from "@/pages/warehouses";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  if (user?.role !== "admin") {
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
      <Route path="/products" component={ProductsPage} />
      <Route path="/movements/in">{() => <MovementsPage type="in" />}</Route>
      <Route path="/movements/out">{() => <MovementsPage type="out" />}</Route>
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/warehouses">
        {() => (
          <AdminOnly>
            <WarehousesPage />
          </AdminOnly>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <AdminOnly>
            <UsersPage />
          </AdminOnly>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <AdminOnly>
            <SettingsPage />
          </AdminOnly>
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
