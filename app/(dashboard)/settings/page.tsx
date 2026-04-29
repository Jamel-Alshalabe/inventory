import { useEffect, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { CURRENCIES } from "@/lib/currencies";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { api } from "@/services/api/api";
import { customFetch } from "@/services/api/custom-fetch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, refreshUser, settings, updateSettings } = useApp();
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  useEffect(() => {
    if (user) setNewUsername(user.username);
  }, [user]);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setCurrency(settings.currency || "ج.م");
      setCompanyPhone(settings.companyPhone || "");
      setCompanyAddress(settings.companyAddress || "");
    }
  }, [settings]);

  
  const saveUsername = useMutation({
    mutationFn: () =>
      customFetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      }),
    onSuccess: async () => {
      toast({ title: "تم تغيير اسم المستخدم" });
      await refreshUser();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const savePassword = useMutation({
    mutationFn: () =>
      customFetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      }),
    onSuccess: () => {
      toast({ title: "تم تغيير كلمة المرور" });
      setNewPassword("");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const saveCompanySettings = useMutation({
    mutationFn: () => updateSettings({
      companyName,
      currency,
      companyPhone,
      companyAddress,
    }),
    onSuccess: () => {
      toast({ title: "تم تحديث إعدادات الشركة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isSuperAdmin ? "إعدادات الحساب الشخصي" : "إعدادات الشركة والحساب"}
        </p>
      </div>
      
      {/* Company Settings - Only for non-super_admin users */}
      {!isSuperAdmin && (
        <Card className="p-6 space-y-4">
          <h2 className="font-bold text-lg">معلومات الشركة</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="أدخل اسم الشركة"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input 
                value={companyPhone} 
                onChange={(e) => setCompanyPhone(e.target.value)} 
                placeholder="أدخل رقم هاتف الشركة"
              />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input 
                value={companyAddress} 
                onChange={(e) => setCompanyAddress(e.target.value)} 
                placeholder="أدخل عنوان الشركة"
              />
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Combobox
                options={CURRENCIES}
                value={currency}
                onValueChange={setCurrency}
                placeholder="اختر العملة"
                searchPlaceholder="بحث عن عملة..."
              />
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button
              onClick={() => saveCompanySettings.mutate()}
              disabled={saveCompanySettings.isPending}
              className="w-full"
            >
              {saveCompanySettings.isPending ? "جاري الحفظ..." : "حفظ معلومات الشركة"}
            </Button>
          </div>
        </Card>
      )}
      
      {/* Account Settings - For all users */}
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">معلومات الحساب</h2>
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
