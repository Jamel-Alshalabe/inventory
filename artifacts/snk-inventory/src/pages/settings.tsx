import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { settings, refreshSettings, user, refreshUser } = useApp();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [currency, setCurrency] = useState("ج.م");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setCompanyName(settings.companyName ?? "");
    setCompanyPhone(settings.companyPhone ?? "");
    setCompanyAddress(settings.companyAddress ?? "");
    setCurrency(settings.currency ?? "ج.م");
  }, [settings]);

  useEffect(() => {
    if (user) setNewUsername(user.username);
  }, [user]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put("/settings", { companyName, companyPhone, companyAddress, currency }),
    onSuccess: async () => {
      toast({ title: "تم الحفظ" });
      await refreshSettings();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const saveUsername = useMutation({
    mutationFn: () => api.put("/account/username", { username: newUsername }),
    onSuccess: async () => {
      toast({ title: "تم تغيير اسم المستخدم" });
      await refreshUser();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const savePassword = useMutation({
    mutationFn: () => api.put("/account/password", { password: newPassword }),
    onSuccess: () => {
      toast({ title: "تم تغيير كلمة المرور" });
      setNewPassword("");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إعدادات الشركة والحساب</p>
      </div>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">بيانات الشركة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>اسم الشركة</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="input-company-name"
            />
          </div>
          <div className="space-y-2">
            <Label>الهاتف</Label>
            <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>العملة</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>العنوان</Label>
            <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
          حفظ
        </Button>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">حسابي</h2>
        <div className="space-y-2">
          <Label>اسم المستخدم</Label>
          <div className="flex gap-2">
            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => saveUsername.mutate()}
              disabled={saveUsername.isPending}
            >
              تحديث
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>كلمة مرور جديدة</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••"
            />
            <Button
              variant="outline"
              onClick={() => savePassword.mutate()}
              disabled={!newPassword || savePassword.isPending}
            >
              تغيير
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
