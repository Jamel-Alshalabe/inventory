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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Eye, Shield } from "lucide-react";

export default function UsersPage() {
  const { warehouses, user: me } = useApp();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Determine filtering info for display
  const isSuperAdmin = me?.role === 'super_admin';
  const filterInfo = isSuperAdmin 
    ? "جميع المستخدمين" 
    : "المستخدمين التابعين لك";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "editor">("user");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [maxWarehouses, setMaxWarehouses] = useState<number>(1);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  
  const { data: response = { data: [] }, isLoading, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });

  // Extract users array from response
  const users = Array.isArray(response) ? response : response?.data || [];
  const displayUsers = users.length > 0 ? users : [];

  // Loading state
  const isDataLoading = isLoading || (isFetching && users.length === 0);

  // Fetch available permissions
  const { data: permissionsResponse = { permissions: [] } } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => customFetch<{ permissions: Array<{ id: number; name: string; display_name: string }> }>("/api/users/permissions"),
    enabled: me?.role === 'admin' || me?.role === 'super_admin',
  });

  const availablePermissions = permissionsResponse.permissions || [];

  // Type for permission object
  type Permission = {
    id: number;
    name: string;
    display_name: string;
  };

  // Debug: Log users data
 

  const createMut = useMutation({
    mutationFn: async () => {
      console.log('Frontend Debug - State values:', { username, password, role, warehouseId, maxWarehouses });
      
      const requestData = {
        username,
        password,
        role,
        assignedWarehouseId: warehouseId ? Number(warehouseId) : null,
        max_warehouses: maxWarehouses,
        permissions: selectedPermissions,
      };
      
      console.log('Frontend Debug - Creating user with data:', requestData);
      
      try {
        const response = await api.createUser(requestData);
        
        return response;
      } catch (error) {
        console.error('Frontend Debug - Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({ 
        title: "تم إضافة المستخدم",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setUsername("");
      setPassword("");
      setRole("user");
      setWarehouseId("");
      setMaxWarehouses(1);
      setSelectedPermissions([]);
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل إضافة المستخدم", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      toast({ 
        title: "تم الحذف",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<AuthUser>) =>
      api.updateUser(selectedUser?.id || 0, data),
    onSuccess: () => {
      toast({ 
        title: "تم التحديث",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      setSelectedUser(null);
      setUsername("");
      setPassword("");
      setRole("user");
      setMaxWarehouses(1);
      setSelectedPermissions([]);
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
                <Label>الدور</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="user">مستخدم</SelectItem>
                    <SelectItem value="editor">مراجع حسابات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>أقصى عدد من المخازن</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={maxWarehouses}
                  onChange={(e) => setMaxWarehouses(Number(e.target.value))}
                  data-testid="input-max-warehouses"
                />
              </div>
            </div>
            
            {/* Permissions Section - Only for Admins */}
            {(me?.role === 'admin' || me?.role === 'super_admin') && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <Label className="text-base font-medium">الصلاحيات</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
                  {availablePermissions.map((permission: Permission) => (
                    <div key={permission.id} className="flex items-center space-gap-2 space-x-2">
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={selectedPermissions.includes(permission.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permission.name]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== permission.name));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`permission-${permission.id}`} 
                        className="text-sm cursor-pointer"
                      >
                        {permission.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedPermissions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    تم اختيار {selectedPermissions.length} صلاحية
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  createMut.mutate();
                }}
                disabled={!username || createMut.isPending}
                data-testid="button-save"
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="p-5">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {isDataLoading ? "جاري تحميل المستخدمين..." : "قائمة المستخدمين"}
          </h3>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded">
            {isDataLoading ? (
              "جاري التحميل..."
            ) : (
              `عرض: ${filterInfo} (${displayUsers.length} مستخدم)`
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المعرف</TableHead>
              <TableHead className="text-right">اسم المستخدم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">أقصى عدد مخازن</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              displayUsers.map((u) => (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell className="font-medium text-right">{u.id}</TableCell>
                <TableCell className="font-semibold text-right">{u.username}</TableCell>
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
                    {u.role === "admin" ? "مدير" : u.role === "user" ? "مستخدم" : u.role === "editor" ? "مراجع حسابات" : u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{u.max_warehouses || 1}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 ">
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
                            setRole(u.role as "admin" | "user" | "editor");
                            setWarehouseId(u.assignedWarehouseId?.toString() || "");
                            setMaxWarehouses(u.max_warehouses || 1);
                            setSelectedPermissions(u.permissions || []);
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
            )))}
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
              <Label>الدور</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="editor">مراجع حسابات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>أقصى عدد مخازن</Label>
              <Input
                type="number"
                min="1"
                value={maxWarehouses}
                onChange={(e) => setMaxWarehouses(Number(e.target.value))}
              />
            </div>
          </div>
          
          {/* Permissions Section - Only for Admins */}
          {(me?.role === 'admin' || me?.role === 'super_admin') && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <Label className="text-base font-medium">الصلاحيات</Label>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
                {availablePermissions.map((permission: Permission) => (
                  <div key={permission.id} className="flex items-center space-gap-2 space-x-2">
                    <Checkbox
                      id={`edit-permission-${permission.id}`}
                      checked={selectedPermissions.includes(permission.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, permission.name]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(p => p !== permission.name));
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`edit-permission-${permission.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {permission.display_name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedPermissions.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  تم اختيار {selectedPermissions.length} صلاحية
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => updateMut.mutate({
                username,
                ...(password && { password }),
                role: role as any,
                assignedWarehouseId: warehouseId ? parseInt(warehouseId) : null,
                maxWarehouses: maxWarehouses,
                permissions: selectedPermissions,
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
                <Label className="text-sm text-muted-foreground">الدور</Label>
                <p className="font-semibold">
                  {(selectedUser?.role as any) === "admin" ? "مدير" : 
                   (selectedUser?.role as any) === "user" ? "مستخدم" : 
                   (selectedUser?.role as any) === "editor" ? "مراجع حسابات" : selectedUser?.role}
                </p>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">أقصى عدد مخازن</Label>
                <p className="font-semibold">{selectedUser?.max_warehouses || 1}</p>
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
