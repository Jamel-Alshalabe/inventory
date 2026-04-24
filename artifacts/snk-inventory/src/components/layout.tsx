import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowUpDown,
  FileText,
  Warehouse as WarehouseIcon,
  Users,
  Settings as SettingsIcon,
  ScrollText,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
  CreditCard,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permissions?: string[];
  role?: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, permissions: ["view-dashboard"] },
  { href: "/products", label: "المنتجات", icon: Package, permissions: ["view-products"] },
  { href: "/stock-movements", label: "حركة المخزون", icon: ArrowUpDown, permissions: ["view-movements"] },
  { href: "/invoices", label: "الفواتير", icon: FileText, permissions: ["view-invoices"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, permissions: ["view-reports"] },
  { href: "/warehouses", label: "المخازن", icon: WarehouseIcon, permissions: ["manage-warehouses"] },
  { href: "/users", label: "المستخدمين", icon: Users, permissions: ["view-users"] },
  { href: "/subscriptions", label: "الاشتراكات", icon: CreditCard, role: "super_admin" },
  { href: "/settings", label: "الإعدادات", icon: SettingsIcon, permissions: ["manage-settings"] },
  { href: "/logs", label: "سجل العمليات", icon: ScrollText, permissions: ["view-logs"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, warehouses, selectedWarehouseId, setSelectedWarehouseId, settings, logout } =
    useApp();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!user) return <>{children}</>;

  const visibleNav = NAV.filter((n) => {
    // Check role-based access first
    if (n.role && user.role !== n.role) {
      return false;
    }
    // If no permissions specified, show to everyone
    if (!n.permissions || n.permissions.length === 0) {
      return true;
    }
    // Check if user has all required permissions
    return n.permissions.every((p) => user.permissions.includes(p));
  });

  const lockedWarehouse = user.role === "user" && !!user.assignedWarehouseId;
  const currentName = settings.companyName || "شركة سنك";

  return (
    <div className="min-h-screen flex bg-background text-foreground" dir="rtl">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Right sidebar */}
      <aside className={`
        ${isMobile 
          ? `fixed top-0 right-0 h-screen z-50 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`
          : 'w-64 sticky top-0 h-screen self-start shrink-0'
        } 
        border-l border-border bg-[#0d0d1a] flex flex-col
      `}>
        <div className="px-5 py-5 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-lg shadow-lg">
              سنك
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate text-white text-base" data-testid="text-company-name">
                {currentName}
              </div>
              <div className="text-xs text-slate-400">نظام إدارة المخزون</div>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-slate-800/50"
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 sidebar-scrollbar">
          {visibleNav.map((n, index) => {
            const Icon = n.icon;
            const active =
              location === n.href ||
              (n.href !== "/" && location.startsWith(n.href));
            return (
              <Link 
                key={n.href} 
                href={n.href} 
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/30 border-r-2 border-blue-400"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                }`}
                data-testid={`link-nav-${n.href.replace(/\//g, "-")}`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </nav>
       
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center px-4 md:px-6 gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-foreground hover:bg-accent/50"
          >
            <Menu className="size-5" />
          </Button>
          
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {/* Warehouse Selector */}
            <div className="flex items-center gap-2 hidden lg:flex">
              <span className="text-sm text-muted-foreground">المخزن</span>
              <Select
                value={selectedWarehouseId ? String(selectedWarehouseId) : ""}
                onValueChange={(v) => setSelectedWarehouseId(v ? Number(v) : null)}
                disabled={lockedWarehouse || !Array.isArray(warehouses) || warehouses.length === 0}
              >
                <SelectTrigger className="w-32 md:w-48" data-testid="select-warehouse">
                  <SelectValue placeholder="اختر المخزن" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(warehouses) ? warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile warehouse selector */}
            <div className="flex items-center gap-2 lg:hidden">
              <Select
                value={selectedWarehouseId ? String(selectedWarehouseId) : ""}
                onValueChange={(v) => setSelectedWarehouseId(v ? Number(v) : null)}
                disabled={lockedWarehouse || !Array.isArray(warehouses) || warehouses.length === 0}
              >
                <SelectTrigger className="w-24" data-testid="select-warehouse-mobile">
                  <SelectValue placeholder="مخزن" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(warehouses) ? warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-accent/50">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-foreground">
                      {user.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email || `${user.username}@snk.com`}
                    </div>
                  </div>
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white text-sm font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email || `${user.username}@snk.com`}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-muted-foreground">
                  <User className="mr-2 size-4" />
                  {user.role === "admin" ? "مدير النظام" : user.role === "user" ? "مستخدم" : "مراجع"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void logout()}
                  className="text-red-500 focus:text-red-500 focus:bg-red-50"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 size-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden custom-scrollbar">{children}</main>
      </div>
    </div>
  );
}
