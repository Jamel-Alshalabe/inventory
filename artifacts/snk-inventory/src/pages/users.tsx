import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Eye } from "lucide-react";

export default function UsersPage() {
  const { warehouses, user: me } = useApp();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "auditor">("user");
  const [warehouseId, setWarehouseId] = useState<string>("");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<AuthUser[]>("/users"),
  });

  // Add dummy data for testing
  const mockUsers: AuthUser[] = [
    { id: 1, username: "أحمد محمد", role: "admin", assignedWarehouseId: null, assignedWarehouseName: null },
    { id: 2, username: "فاطمة علي", role: "user", assignedWarehouseId: 1, assignedWarehouseName: "المخزن الرئيسي" },
    { id: 3, username: "محمد خالد", role: "auditor", assignedWarehouseId: 2, assignedWarehouseName: "مخزن الفرع" },
    { id: 4, username: "نورة سعد", role: "user", assignedWarehouseId: null, assignedWarehouseName: null },
    { id: 5, username: "عبدالله عمر", role: "admin", assignedWarehouseId: 1, assignedWarehouseName: "المخزن الرئيسي" },
  ];

  const displayUsers = users.length > 0 ? users : mockUsers;

  const createMut = useMutation({
    mutationFn: () =>
      api.post<AuthUser>("/users", {
        username,
        password,
        role,
        assignedWarehouseId: warehouseId ? Number(warehouseId) : null,
      }),
    onSuccess: () => {
      toast({ title: "تم إضافة المستخدم" });
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setUsername("");
      setPassword("");
      setRole("user");
      setWarehouseId("");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/users/${id}`),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<AuthUser>) =>
      api.put<AuthUser>(`/users/${selectedUser?.id}`, data),
    onSuccess: () => {
      toast({ title: "تم التحديث" });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      setSelectedUser(null);
      setUsername("");
      setPassword("");
      setRole("user");
      setWarehouseId("");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المستخدمين</h1>
          <p className="text-muted-foreground text-sm mt-1">{displayUsers.length} مستخدم</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="size-4 ml-2" />
              مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>مستخدم جديد</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="user">مستخدم</SelectItem>
                    <SelectItem value="auditor">مراجع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المخزن المخصص</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="(جميع المخازن)" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={!username || !password || createMut.isPending}
                data-testid="button-save"
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>الصلاحية</TableHead>
              <TableHead>المخزن</TableHead>
              <TableHead className="w-32 text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayUsers.map((u) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell className="font-semibold">{u.username}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      u.role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : u.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                    }
                  >
                    {u.role === "admin" ? "مدير" : u.role === "user" ? "مستخدم" : "مراجع"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.assignedWarehouseName ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedUser(u);
                        setViewOpen(true);
                      }}
                    >
                      <Eye className="size-4" />
                    </Button>
                    {u.id !== me?.id && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(u);
                            setUsername(u.username);
                            setRole(u.role);
                            setWarehouseId(u.assignedWarehouseId?.toString() || "");
                            setEditOpen(true);
                          }}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(u);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                placeholder="اتركه فارغاً إذا كنت لا تريد تغييره"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="auditor">مراجع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المخزن المخصص</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="(جميع المخازن)" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => updateMut.mutate({
                username,
                ...(password && { password }),
                role,
                assignedWarehouseId: warehouseId ? Number(warehouseId) : null,
              })}
              disabled={!username || updateMut.isPending}
              data-testid="button-update"
            >
              تحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">اسم المستخدم</Label>
                <p className="font-semibold">{selectedUser?.username}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">الصلاحية</Label>
                <p className="font-semibold">
                  {selectedUser?.role === "admin" ? "مدير" : 
                   selectedUser?.role === "user" ? "مستخدم" : "مراجع"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">المخزن المخصص</Label>
                <p className="font-semibold">{selectedUser?.assignedWarehouseName || "جميع المخازن"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">معرف المستخدم</Label>
                <p className="font-semibold">#{selectedUser?.id}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              هل أنت متأكد من أنك تريد حذف المستخدم "<span className="font-semibold text-foreground">{selectedUser?.username}</span>"؟
            </p>
            <p className="text-sm text-destructive">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  deleteMut.mutate(selectedUser.id);
                }
              }}
              disabled={deleteMut.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
