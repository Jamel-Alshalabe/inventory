import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
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
          <div className="size-20 mx-auto rounded-xl bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold mb-3">
            سنك
          </div>
          <h1 className="text-2xl font-bold text-slate-100">شركة سنك</h1>
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
              className="bg-[#0e0c20] text-white "
            />
          </div>
          {err && (
            <div
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md"
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
