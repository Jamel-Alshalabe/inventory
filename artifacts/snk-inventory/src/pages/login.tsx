import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="size-14 mx-auto rounded-xl bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold mb-3">
            سنك
          </div>
          <h1 className="text-2xl font-bold">شركة سنك</h1>
          <p className="text-muted-foreground text-sm mt-1">نظام إدارة مخزون قطع غيار السيارات</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>اسم المستخدم</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              data-testid="input-username"
            />
          </div>
          <div className="space-y-2">
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
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
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
            {loading && <Loader2 className="size-4 animate-spin ml-2" />}
            دخول
          </Button>
        </form>
        <div className="mt-6 text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
          <div className="font-semibold mb-1">حسابات تجريبية:</div>
          <div>المدير: admin / admin123</div>
          <div>مستخدم: user / user123</div>
          <div>مراجع: auditor / auditor123</div>
        </div>
      </Card>
    </div>
  );
}
