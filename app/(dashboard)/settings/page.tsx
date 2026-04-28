import { useEffect, useState } from "react";
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
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDG">الجنيه السوداني (SDG) ج.س</SelectItem>
                  <SelectItem value="SAR">الريال السعودي (SAR) ر.س</SelectItem>
                  <SelectItem value="EGP">الجنيه المصري (EGP) ج.م</SelectItem>
                  <SelectItem value="AED">الدرهم الإماراتي (AED) د.إ</SelectItem>
                  <SelectItem value="KWD">الدينار الكويتي (KWD) د.ك</SelectItem>
                  <SelectItem value="QAR">الريال القطري (QAR) ر.ق</SelectItem>
                  <SelectItem value="BHD">الدينار البحريني (BHD) د.ب</SelectItem>
                  <SelectItem value="OMR">الريال العماني (OMR) ر.ع</SelectItem>
                  <SelectItem value="JOD">الدينار الأردني (JOD) د.أ</SelectItem>
                  <SelectItem value="LBP">الليرة اللبنانية (LBP) ل.ل</SelectItem>
                  <SelectItem value="IQD">الدينار العراقي (IQD) د.ع</SelectItem>
                  <SelectItem value="SYP">الليرة السورية (SYP) ل.س</SelectItem>
                  <SelectItem value="PSG">الشيقل الفلسطيني (PSG) ₪</SelectItem>
                  <SelectItem value="MAD">الدرهم المغربي (MAD) د.م.</SelectItem>
                  <SelectItem value="TND">الدينار التونسي (TND) د.ت</SelectItem>
                  <SelectItem value="DZD">الدينار الجزائري (DZD) د.ج</SelectItem>
                  <SelectItem value="LYD">الدينار الليبي (LYD) ل.د</SelectItem>
                  <SelectItem value="NGN">النيرة النيجيرية (NGN) ₦</SelectItem>
                  <SelectItem value="KES">الشلن الكيني (KES) KSh</SelectItem>
                  <SelectItem value="UGX">الشلن الأوغندي (UGX) Sh</SelectItem>
                  <SelectItem value="TZS">الشلن التنزاني (TZS) TSh</SelectItem>
                  <SelectItem value="BWP">بولا بوتسوانا (BWP) P</SelectItem>
                  <SelectItem value="ZWL">الدولار الزيمبابوي (ZWL) Z$</SelectItem>
                  <SelectItem value="ZAR">الراند جنوب أفريقي (ZAR) R</SelectItem>
                  <SelectItem value="GHS">السيدي الغاني (GHS) ₵</SelectItem>
                  <SelectItem value="ETB">البر الإثيوبي (ETB) Br</SelectItem>
                  <SelectItem value="MUR">روبية موريشيوس (MUR) ₨</SelectItem>
                  <SelectItem value="SCR">روبية سيشل (SCR) ₨</SelectItem>
                  <SelectItem value="COM">فرنك جزر القمر (COM) Fr</SelectItem>
                  <SelectItem value="MGA">أرياري مدغشقر (MGA) Ar</SelectItem>
                  <SelectItem value="XOF">فرنك غرب إفريقيا (XOF) Fr</SelectItem>
                  <SelectItem value="XAF">فرنك وسط إفريقيا (XAF) Fr</SelectItem>
                  <SelectItem value="AOA">كوانزا أنجولا (AOA) Kz</SelectItem>
                  <SelectItem value="MZN">متيكال موزمبيق (MZN) MT</SelectItem>
                  <SelectItem value="RWF">فرنك رواندا (RWF) Fr</SelectItem>
                  <SelectItem value="BDI">فرنك بوروندي (BDI) Fr</SelectItem>
                  <SelectItem value="DJF">فرنك جيبوتي (DJF) Fr</SelectItem>
                  <SelectItem value="SOS">شلن الصومال (SOS) Sh</SelectItem>
                  <SelectItem value="ERI">نافكا إريتريا (ERI) Nfk</SelectItem>
                  <SelectItem value="USD">الدولار الأمريكي (USD) $</SelectItem>
                  <SelectItem value="EUR">اليورو (EUR) €</SelectItem>
                  <SelectItem value="GBP">الجنيه الإسترليني (GBP) £</SelectItem>
                  <SelectItem value="JPY">الين الياباني (JPY) ¥</SelectItem>
                  <SelectItem value="CNY">اليوان الصيني (CNY) ¥</SelectItem>
                  <SelectItem value="INR">الروبية الهندية (INR) ₹</SelectItem>
                  <SelectItem value="AUD">الدولار الأسترالي (AUD) A$</SelectItem>
                  <SelectItem value="NZD">دولار نيوزيلندا (NZD) NZ$</SelectItem>
                  <SelectItem value="SGD">دولار سنغافورة (SGD) S$</SelectItem>
                  <SelectItem value="HKD">دولار هونغ كونغ (HKD) HK$</SelectItem>
                  <SelectItem value="KRW">الوون الكوري (KRW) ₩</SelectItem>
                  <SelectItem value="MYR">الرينجيت الماليزي (MYR) RM</SelectItem>
                  <SelectItem value="THB">البات التايلاندي (THB) ฿</SelectItem>
                  <SelectItem value="IDR">الروبية الإندونيسية (IDR) Rp</SelectItem>
                  <SelectItem value="PHP">البيزو الفلبيني (PHP) ₱</SelectItem>
                  <SelectItem value="VND">الدونج الفيتنامي (VND) ₫</SelectItem>
                  <SelectItem value="RUB">الروبل الروسي (RUB) ₽</SelectItem>
                  <SelectItem value="CHF">الفرنك السويسري (CHF)</SelectItem>
                  <SelectItem value="SEK">الكرونة السويدية (SEK) kr</SelectItem>
                  <SelectItem value="NOK">الكرونة النرويجية (NOK) kr</SelectItem>
                  <SelectItem value="DKK">الكرونة الدنماركية (DKK) kr</SelectItem>
                  <SelectItem value="CZK">الكرونة التشيكية (CZK) Kč</SelectItem>
                  <SelectItem value="PLN">الزلوتي البولندي (PLN) zł</SelectItem>
                  <SelectItem value="HUF">الفورينت المجري (HUF) Ft</SelectItem>
                  <SelectItem value="RON">الليو الروماني (RON) lei</SelectItem>
                  <SelectItem value="BGN">اللفا البلغاري (BGN) лв</SelectItem>
                  <SelectItem value="UZS">سوم أوزبكستاني (UZS) so'm</SelectItem>
                  <SelectItem value="GEL">لاري جورجيا (GEL) ₾</SelectItem>
                  <SelectItem value="AMD">درام أرمينيا (AMD) ֏</SelectItem>
                  <SelectItem value="AZN">مانات أذربيجان (AZN) ₼</SelectItem>
                  <SelectItem value="CAD">الدولار الكندي (CAD) C$</SelectItem>
                  <SelectItem value="MXN">البيزو المكسيكي (MXN) $</SelectItem>
                  <SelectItem value="BRL">الريال البرازيلي (BRL) R$</SelectItem>
                  <SelectItem value="CLP">البيزو التشيلي (CLP) $</SelectItem>
                  <SelectItem value="COP">البيزو الكولومبي (COP) $</SelectItem>
                  <SelectItem value="PEN">السول البيروفي (PEN) S/</SelectItem>
                  <SelectItem value="UYU">البيزو الأوروغواياني (UYU) $U</SelectItem>
                </SelectContent>
              </Select>
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
