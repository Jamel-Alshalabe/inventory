import { useState, type FormEvent } from "react";
import { useApp, type AuthUser } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Extended user type that matches actual API response
interface UserWithPermissions extends Omit<AuthUser, 'role'> {
  permissions?: string[];
  role?: string;
}

// Routes ordered by priority with their required permissions
const ROUTES_BY_PRIORITY = [
  { path: "/dashboard", permissions: ["view-dashboard"] },
  { path: "/products", permissions: ["view-products"] },
  { path: "/invoices", permissions: ["view-invoices"] },
  { path: "/stock-movements", permissions: ["view-movements"] },
  { path: "/warehouses", permissions: ["view-warehouses"] },
  { path: "/users", permissions: ["view-users"] },
  { path: "/reports", permissions: ["view-reports"] },
  { path: "/settings", permissions: ["manage-settings"] },
  { path: "/logs", permissions: [] }, // No permissions required
] as const;

function getFirstAccessibleRoute(user: UserWithPermissions | null): string {
  if (!user) return "/login";

  // Super admin can access subscriptions
  if (user.role === "super_admin") {
    return "/subscriptions";
  }

  const userPermissions = user.permissions || [];

  // Find first route user has permission for
  for (const route of ROUTES_BY_PRIORITY) {
    if (route.permissions.length === 0) return route.path;
    
    const hasPermission = route.permissions.some((p) =>
      userPermissions.includes(p)
    );
    if (hasPermission) return route.path;
  }

  // Fallback to login if no permissions
  return "/login";
}

export default function LoginPage() {
  const { login, user } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Use only the app context login method
      const loggedInUser = await login(username.trim(), password);
      
      // Get the first accessible route based on user permissions
      const targetRoute = getFirstAccessibleRoute(loggedInUser as UserWithPermissions);
      
      // إظهار تنبيه نجاح
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "جاري التحويل...",
      });
      
      // وجه إلى أول صفحة متاحة فوراً
      setLocation(targetRoute);
      
    } catch (e: any) {
      let title = "خطأ في تسجيل الدخول";
      let description = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.";

      // معالجة الأخطاء بناءً على الحالة (Status Code)
      if (e?.status === 403 || (e instanceof Error && e.message.includes("403"))) {
        title = "انتهت صلاحية الاشتراك";
        description = "نأسف، ولكن اشتراككم الحالي قد انتهى. يرجى التواصل مع الإدارة لتجديد الاشتراك واستعادة الوصول الكامل للنظام.";
      } else if (e?.status === 401 || (e instanceof Error && (e.message.includes("401") || e.message.includes("Unauthorized")))) {
        title = "بيانات الدخول غير صحيحة";
        description = "اسم المستخدم أو كلمة المرور التي أدخلتها غير مطابقة لسجلاتنا. يرجى التأكد والمحاولة مرة أخرى.";
      } else if (e?.status === 500) {
        title = "مشكلة في النظام";
        description = "نواجه صعوبة في الاتصال بالخادم حالياً. يرجى التواصل مع الدعم الفني إذا استمرت المشكلة.";
      } else {
        description = e instanceof Error ? e.message : description;
      }

      toast({
        title: title,
        description: description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{background: "linear-gradient(135deg,#050510 0%,#0a0a1a 50%,#0f1a3d 100%)"}} dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md p-8 bg-[#131328]/90 border-[#2a2a4a]/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl relative animate-in fade-in zoom-in-95 duration-500">
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-lg blur opacity-50"></div>
        
        <div className="relative">
          <div className="text-center mb-8">
            <div className="size-24 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
              <Warehouse className="size-12" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              نظام إدارة المخزون
            </h1>
            <p className="text-slate-400 text-sm">قطع غيار السيارات</p>
          </div>
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Username Field */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">اسم المستخدم</Label>
            <div className="relative group">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="أدخل اسم المستخدم..."
                data-testid="input-username"
                autoComplete="username"
                className="bg-[#0c0b1a]/80 border-[#2a2a4a]/60 text-white placeholder:text-slate-500 h-12 pr-4 pl-10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-[#3a3a5a]/60"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <LogIn className="size-4" />
              </div>
            </div>
          </div>

          {/* Password Field with Toggle */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">كلمة المرور</Label>
            <div className="relative group">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="أدخل كلمة المرور..."
                data-testid="input-password"
                autoComplete="current-password"
                className="bg-[#0c0b1a]/80 border-[#2a2a4a]/60 text-white placeholder:text-slate-500 h-12 pr-4 pl-12 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-[#3a3a5a]/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-base shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]" 
            disabled={loading} 
            data-testid="button-login"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin ml-2" />
                جاري تسجيل الدخول...
              </>
            ) : (
              <>
                <LogIn className="size-5 ml-2" />
                تسجيل الدخول
              </>
            )}
          </Button>
        </form>

        
        
        </div>
      </Card>
    </div>
  );
}
