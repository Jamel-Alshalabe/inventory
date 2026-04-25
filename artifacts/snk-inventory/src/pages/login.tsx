import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login } = useApp();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Use only the app context login method
      await login(username.trim(), password);
      
      // Get user data from localStorage after login
      const storedUser = localStorage.getItem('snk:user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const pageOrder = [
        { href: '/dashboard', permission: 'view-dashboard' },
        { href: '/products', permission: 'view-products' },
        { href: '/stock-movements', permission: 'view-movements' },
        { href: '/invoices', permission: 'view-invoices' },
        { href: '/reports', permission: 'view-reports' },
        { href: '/warehouses', permission: 'manage-warehouses' },
        { href: '/users', permission: 'view-users' },
        { href: '/settings', permission: 'manage-settings' },
        { href: '/logs', permission: 'view-logs' },
      ];
      
      // Find first page user has permission for, or default to users page for superadmin
      const firstAccessiblePage = pageOrder.find(page => 
        user?.permissions?.includes(page.permission)
      ) || { href: '/users', permission: 'view-users' };
      
      setLocation(firstAccessiblePage.href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: "linear-gradient(135deg,#08081a 0%,#1a1a2e 50%,#0a246b 100%)"}} dir="rtl">
      <Card className="w-full max-w-md p-8 bg-[#16162b] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="size-20 mx-auto rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl font-bold mb-3">
            <LogIn className="size-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">تسجيل الدخول</h1>
          <p className="text-slate-400 text-sm mt-1">نظام إدارة مخزون قطع غيار السيارات</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-400 mb-2">اسم المستخدم</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              data-testid="input-username"
              autoComplete="username"
              className="bg-[#0e0c20] text-white "
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">كلمة المرور</Label>
            <Input
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
              autoComplete="current-password"
              className="bg-[#0e0c20] text-white "
            />
          </div>
          {err && (
            <div
              className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md border border-red-500/30"
              data-testid="text-login-error"
            >
              {err}
            </div>
          )}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading} data-testid="button-login">
            {!loading && <LogIn className="size-4 ml-2" />}
            {loading && <Loader2 className="size-4 animate-spin ml-2" />}
            تسجيل الدخول
          </Button>
        </form>
       
      </Card>
    </div>
  );
}
