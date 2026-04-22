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
  const [currency, setCurrency] = useState("ج.م");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceLocation, setInvoiceLocation] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setCurrency(settings.currency ?? "ج.م");
    setInvoicePhone(settings.invoicePhone ?? "");
    setInvoiceLocation(settings.invoiceLocation ?? "");
  }, [settings]);

  useEffect(() => {
    if (user) setNewUsername(user.username);
  }, [user]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put("/settings", { currency }),
    onSuccess: async () => {
      toast({ title: "تم حفظ العملة" });
      await refreshSettings();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const saveInvoiceSettings = useMutation({
    mutationFn: () =>
      api.put("/settings", { invoicePhone, invoiceLocation }),
    onSuccess: async () => {
      toast({ title: "تم حفظ بيانات الفاتورة" });
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>اختر العملة</Label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <optgroup label="الشرق الأوسط وشمال أفريقيا">
                <option value="SDG">الجنيه السوداني (SDG) ج.س</option>
                <option value="SAR">الريال السعودي (SAR) ر.س</option>
                <option value="EGP">الجنيه المصري (EGP) ج.م</option>
                <option value="AED">الدرهم الإماراتي (AED) د.إ</option>
                <option value="KWD">الدينار الكويتي (KWD) د.ك</option>
                <option value="QAR">الريال القطري (QAR) ر.ق</option>
                <option value="BHD">الدينار البحريني (BHD) د.ب</option>
                <option value="OMR">الريال العماني (OMR) ر.ع</option>
                <option value="JOD">الدينار الأردني (JOD) د.أ</option>
                <option value="LBP">الليرة اللبنانية (LBP) ل.ل</option>
                <option value="IQD">الدينار العراقي (IQD) د.ع</option>
                <option value="SYP">الليرة السورية (SYP) ل.س</option>
                <option value="PSG">الشيقل الفلسطيني (PSG) ₪</option>
                <option value="MAD">الدرهم المغربي (MAD) د.م.</option>
                <option value="TND">الدينار التونسي (TND) د.ت</option>
                <option value="DZD">الدينار الجزائري (DZD) د.ج</option>
                <option value="LYD">الدينار الليبي (LYD) ل.د</option>
              </optgroup>
              <optgroup label="إفريقيا جنوب الصحراء">
                <option value="NGN">النيرة النيجيرية (NGN) ₦</option>
                <option value="KES">الشلن الكيني (KES) KSh</option>
                <option value="UGX">الشلن الأوغندي (UGX) Sh</option>
                <option value="TZS">الشلن التنزاني (TZS) TSh</option>
                <option value="BWP">بولا بوتسوانا (BWP) P</option>
                <option value="ZWL">الدولار الزيمبابوي (ZWL) Z$</option>
                <option value="ZAR">الراند جنوب أفريقي (ZAR) R</option>
                <option value="GHS">السيدي الغاني (GHS) ₵</option>
                <option value="ETB">البر الإثيوبي (ETB) Br</option>
                <option value="MUR">روبية موريشيوس (MUR) ₨</option>
                <option value="SCR">روبية سيشل (SCR) ₨</option>
                <option value="COM">فرنك جزر القمر (COM) Fr</option>
                <option value="MGA">أرياري مدغشقر (MGA) Ar</option>
                <option value="XOF">فرنك غرب إفريقيا (XOF) Fr</option>
                <option value="XAF">فرنك وسط إفريقيا (XAF) Fr</option>
                <option value="AOA">كوانزا أنجولا (AOA) Kz</option>
                <option value="MZN">متيكال موزمبيق (MZN) MT</option>
                <option value="RWF">فرنك رواندا (RWF) Fr</option>
                <option value="BDI">فرنك بوروندي (BDI) Fr</option>
                <option value="DJF">فرنك جيبوتي (DJF) Fr</option>
                <option value="SOS">شلن الصومال (SOS) Sh</option>
                <option value="ERI">نافكا إريتريا (ERI) Nfk</option>
              </optgroup>
              <optgroup label="العملات العالمية الأساسية">
                <option value="USD">الدولار الأمريكي (USD) $</option>
                <option value="EUR">اليورو (EUR) €</option>
                <option value="GBP">الجنيه الإسترليني (GBP) £</option>
              </optgroup>
              <optgroup label="آسيا والمحيط الهادئ">
                <option value="JPY">الين الياباني (JPY) ¥</option>
                <option value="CNY">اليوان الصيني (CNY) ¥</option>
                <option value="INR">الروبية الهندية (INR) ₹</option>
                <option value="AUD">الدولار الأسترالي (AUD) A$</option>
                <option value="NZD">دولار نيوزيلندا (NZD) NZ$</option>
                <option value="SGD">دولار سنغافورة (SGD) S$</option>
                <option value="HKD">دولار هونغ كونغ (HKD) HK$</option>
                <option value="KRW">الوون الكوري (KRW) ₩</option>
                <option value="MYR">الرينجيت الماليزي (MYR) RM</option>
                <option value="THB">البات التايلاندي (THB) ฿</option>
                <option value="IDR">الروبية الإندونيسية (IDR) Rp</option>
                <option value="PHP">البيزو الفلبيني (PHP) ₱</option>
                <option value="VND">الدونج الفيتنامي (VND) ₫</option>
              </optgroup>
              <optgroup label="أوروبا وآسيا الوسطى">
                <option value="RUB">الروبل الروسي (RUB) ₽</option>
                <option value="CHF">الفرنك السويسري (CHF)</option>
                <option value="SEK">الكرونة السويدية (SEK) kr</option>
                <option value="NOK">الكرونة النرويجية (NOK) kr</option>
                <option value="DKK">الكرونة الدنماركية (DKK) kr</option>
                <option value="CZK">الكرونة التشيكية (CZK) Kč</option>
                <option value="PLN">الزلوتي البولندي (PLN) zł</option>
                <option value="HUF">الفورينت المجري (HUF) Ft</option>
                <option value="RON">الليو الروماني (RON) lei</option>
                <option value="BGN">اللفا البلغاري (BGN) лв</option>
                <option value="UZS">سوم أوزبكستاني (UZS) so'm</option>
                <option value="GEL">لاري جورجيا (GEL) ₾</option>
                <option value="AMD">درام أرمينيا (AMD) ֏</option>
                <option value="AZN">مانات أذربيجان (AZN) ₼</option>
              </optgroup>
              <optgroup label="أمريكا اللاتينية">
                <option value="CAD">الدولار الكندي (CAD) C$</option>
                <option value="MXN">البيزو المكسيكي (MXN) $</option>
                <option value="BRL">الريال البرازيلي (BRL) R$</option>
                <option value="CLP">البيزو التشيلي (CLP) $</option>
                <option value="COP">البيزو الكولومبي (COP) $</option>
                <option value="PEN">السول البيروفي (PEN) S/</option>
                <option value="UYU">البيزو الأوروغواياني (UYU) $U</option>
              </optgroup>
            </select>
          </div>
        </div>
        <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
          حفظ العملة
        </Button>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">بيانات الفاتورة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>رقم الهاتف</Label>
            <Input 
              value={invoicePhone} 
              onChange={(e) => setInvoicePhone(e.target.value)} 
              placeholder="أدخل رقم الهاتف"
            />
          </div>
          <div className="space-y-2">
            <Label>الموقع</Label>
            <Input 
              value={invoiceLocation} 
              onChange={(e) => setInvoiceLocation(e.target.value)} 
              placeholder="أدخل موقع المخزن"
            />
          </div>
        </div>
        <Button onClick={() => saveInvoiceSettings.mutate()} disabled={saveInvoiceSettings.isPending}>
          حفظ بيانات الفاتورة
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
