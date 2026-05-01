import { useEffect, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { CURRENCIES } from "@/lib/currencies";
import { useMutation } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { customFetch } from "@/services/api/custom-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  User, 
  Lock, 
  MapPin, 
  Phone, 
  Globe, 
  Save, 
  UserCircle,
  ShieldCheck,
  Settings2
} from "lucide-react";

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
      toast({ title: "تم تغيير اسم المستخدم بنجاح" });
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
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
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
      toast({ title: "تم تحديث إعدادات الشركة بنجاح" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500 max-w-5xl" dir="rtl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Settings2 className="size-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">الإعدادات</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isSuperAdmin ? "إدارة تفاصيل حسابك الشخصي وأمانك" : "إدارة بيانات مؤسستك وتفضيلات حسابك"}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={isSuperAdmin ? "account" : "company"} className="w-full">
        <TabsList className="bg-[#1a1a3a] border border-[#2a2a4a] p-1 mb-8 w-fit">
          {!isSuperAdmin && (
            <TabsTrigger 
              value="company" 
              className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 transition-all"
            >
              <Building2 className="size-4" />
              <span>بيانات الشركة</span>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="account" 
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 transition-all"
          >
            <UserCircle className="size-4" />
            <span>بيانات الحساب</span>
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 transition-all"
          >
            <ShieldCheck className="size-4" />
            <span>الأمان</span>
          </TabsTrigger>
        </TabsList>

        {!isSuperAdmin && (
          <TabsContent value="company" className="mt-0 space-y-6">
            <Card className="bg-[#131328]/80 border-[#2a2a4a] shadow-xl backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-[#1a1a3a]/50 border-b border-[#2a2a4a]">
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Building2 className="size-5 text-blue-400" />
                  بيانات المؤسسة
                </CardTitle>
                <CardDescription className="text-slate-400">هذه البيانات ستظهر على الفواتير والتقارير</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-slate-200 font-medium">اسم الشركة</Label>
                    <div className="relative group">
                      <Input 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)} 
                        placeholder="أدخل اسم الشركة"
                        className="bg-[#0c0b1a] border-[#2a2a4a] text-white pr-10 focus:border-blue-500/50 focus:ring-blue-500/10 h-12"
                      />
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-200 font-medium">رقم الهاتف</Label>
                    <div className="relative group">
                      <Input 
                        value={companyPhone} 
                        onChange={(e) => setCompanyPhone(e.target.value)} 
                        placeholder="أدخل رقم هاتف الشركة"
                        className="bg-[#0c0b1a] border-[#2a2a4a] text-white pr-10 focus:border-blue-500/50 focus:ring-blue-500/10 h-12"
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-slate-200 font-medium">العنوان</Label>
                    <div className="relative group">
                      <Input 
                        value={companyAddress} 
                        onChange={(e) => setCompanyAddress(e.target.value)} 
                        placeholder="أدخل عنوان الشركة التفصيلي"
                        className="bg-[#0c0b1a] border-[#2a2a4a] text-white pr-10 focus:border-blue-500/50 focus:ring-blue-500/10 h-12"
                      />
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-200 font-medium">عملة النظام</Label>
                    <Combobox
                      options={CURRENCIES}
                      value={currency}
                      onValueChange={setCurrency}
                      placeholder="اختر العملة"
                      searchPlaceholder="بحث عن عملة..."
                      className="w-full bg-[#0c0b1a] border-[#2a2a4a] text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Globe className="size-3" />
                      تستخدم هذه العملة في كافة المعاملات المالية
                    </p>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-[#2a2a4a] flex justify-end">
                  <Button
                    onClick={() => saveCompanySettings.mutate()}
                    disabled={saveCompanySettings.isPending}
                    className="min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 shadow-lg shadow-blue-900/20 font-bold"
                  >
                    {saveCompanySettings.isPending ? "جاري الحفظ..." : (
                      <>
                        <Save className="size-5" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="account" className="mt-0">
          <Card className="bg-[#131328]/80 border-[#2a2a4a] shadow-xl backdrop-blur-sm overflow-hidden max-w-2xl">
            <CardHeader className="bg-[#1a1a3a]/50 border-b border-[#2a2a4a]">
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <UserCircle className="size-5 text-blue-400" />
                بيانات الحساب الشخصي
              </CardTitle>
              <CardDescription className="text-slate-400">إدارة معلومات الدخول الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-200 font-medium">اسم المستخدم</Label>
                <div className="flex gap-4">
                  <div className="relative group flex-1">
                    <Input 
                      value={newUsername} 
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-[#0c0b1a] border-[#2a2a4a] text-white pr-10 focus:border-blue-500/50 focus:ring-blue-500/10 h-12"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => saveUsername.mutate()}
                    disabled={saveUsername.isPending}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-8 h-12 font-bold"
                  >
                    {saveUsername.isPending ? "جاري التحديث..." : "تحديث"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">اسم المستخدم الذي تستخدمه لتسجيل الدخول إلى النظام</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <Card className="bg-[#131328]/80 border-[#2a2a4a] shadow-xl backdrop-blur-sm overflow-hidden max-w-2xl">
            <CardHeader className="bg-[#1a1a3a]/50 border-b border-[#2a2a4a]">
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Lock className="size-5 text-red-400" />
                تغيير كلمة المرور
              </CardTitle>
              <CardDescription className="text-slate-400">تأكد من اختيار كلمة مرور قوية لحماية حسابك</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-200 font-medium">كلمة المرور الجديدة</Label>
                <div className="flex gap-4">
                  <div className="relative group flex-1">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-[#0c0b1a] border-[#2a2a4a] text-white pr-10 focus:border-red-500/50 focus:ring-red-500/10 h-12"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => savePassword.mutate()}
                    disabled={!newPassword || savePassword.isPending}
                    className="px-8 h-12 bg-red-600 hover:bg-red-700 font-bold"
                  >
                    {savePassword.isPending ? "جاري التغيير..." : "تغيير"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">يجب أن تحتوي كلمة المرور على 8 رموز على الأقل</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

