import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Warehouse as WarehouseIcon,
  Users,
  Settings as SettingsIcon,
  ScrollText,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  roles?: ("admin" | "user" | "auditor")[];
};

const NAV: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/movements/in", label: "الوارد", icon: ArrowDownToLine },
  { href: "/movements/out", label: "الصادر", icon: ArrowUpFromLine },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/warehouses", label: "المخازن", icon: WarehouseIcon, roles: ["admin"] },
  { href: "/users", label: "المستخدمين", icon: Users, roles: ["admin"] },
  { href: "/logs", label: "سجل الأنشطة", icon: ScrollText },
  { href: "/settings", label: "الإعدادات", icon: SettingsIcon, roles: ["admin"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, warehouses, selectedWarehouseId, setSelectedWarehouseId, settings, logout } =
    useApp();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const lockedWarehouse = user.role === "user" && !!user.assignedWarehouseId;
  const currentName =
    settings.companyName || "شركة سنك لقطع غيار السيارات";

  return (
    <div className="min-h-screen flex bg-background text-foreground" dir="rtl">
      {/* Right sidebar */}
      <aside className="w-64 shrink-0 border-l border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-lg">
              سنك
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate" data-testid="text-company-name">
                {currentName}
              </div>
              <div className="text-xs text-muted-foreground">نظام إدارة المخزون</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map((n) => {
            const Icon = n.icon;
            const active =
              location === n.href ||
              (n.href !== "/" && location.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}>
                <a
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover-elevate ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80"
                  }`}
                  data-testid={`link-nav-${n.href.replace(/\//g, "-")}`}
                >
                  <Icon className="size-4" />
                  <span>{n.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs">
            <div className="text-muted-foreground">المستخدم</div>
            <div className="font-semibold" data-testid="text-current-user">
              {user.username}
            </div>
            <div className="text-muted-foreground mt-1">
              {user.role === "admin" ? "مدير النظام" : user.role === "user" ? "مستخدم" : "مراجع"}
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 mt-1"
            onClick={() => void logout()}
            data-testid="button-logout"
          >
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center px-6 gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">المخزن</span>
            <Select
              value={selectedWarehouseId ? String(selectedWarehouseId) : ""}
              onValueChange={(v) => setSelectedWarehouseId(v ? Number(v) : null)}
              disabled={lockedWarehouse || warehouses.length === 0}
            >
              <SelectTrigger className="w-56" data-testid="select-warehouse">
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name} ({w.productCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
