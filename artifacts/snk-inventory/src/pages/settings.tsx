import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, refreshUser } = useApp();
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user) setNewUsername(user.username);
  }, [user]);

  
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إعدادات الحساب</p>
      </div>
      
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
