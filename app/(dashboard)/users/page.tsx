import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser, type Warehouse } from "@/services/api/api";
import { customFetch } from "@/services/api/custom-fetch";
import { useApp } from "@/lib/app-context";
import { useDebounce } from "@/hooks/use-debounce";
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
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Eye, Shield, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { PageLoader } from "@/components/ui/page-loader";

export default function UsersPage() {
  const { warehouses: warehousesResponse, user: me } = useApp();

  // Extract warehouses array from response
  const warehouses = Array.isArray(warehousesResponse)
    ? warehousesResponse
    : (Array.isArray((warehousesResponse as any)?.data) ? (warehousesResponse as any)?.data : []);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 800); // Increased from 500ms to 800ms

  // Determine filtering info for display
  const isSuperAdmin = (me?.role as string) === 'super_admin';
  const filterInfo = isSuperAdmin 
    ? "جميع المستخدمين" 
    : "المستخدمين التابعين لك";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "editor" | "auditor">("user");
  const [warehouseId, setWarehouseId] = useState<string>(""); 
  const [maxWarehouses, setMaxWarehouses] = useState<number>(1);
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCurrency, setCompanyCurrency] = useState("ج.م");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Task 5: Auto-select permissions based on role
  const handleRoleChange = (newRole: string) => {
    setRole(newRole as any);
    if (me?.role === 'admin') {
      if (newRole === 'admin') {
        // Manager: All permissions except subscriptions
        const allExceptSubs = availablePermissions
          .filter(p => !p.name.includes('subscription'))
          .map(p => p.name);
        setSelectedPermissions(allExceptSubs);
      } else if (newRole === 'auditor') {
        // Auditor: All 'view' permissions
        const viewOnly = availablePermissions
          .filter(p => p.name.startsWith('view-'))
          .map(p => p.name);
        setSelectedPermissions(viewOnly);
      } else {
        setSelectedPermissions([]);
      }
    }
  };

  const { data: response = { data: [] }, isLoading, isFetching } = useQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: () => api.listUsers({ q: debouncedSearch }),
  });

  // Fetch all warehouses for assignment
  const { data: allWarehousesResponse = [] } = useQuery({
    queryKey: ["all-warehouses"],
    queryFn: () => api.listWarehouses(),
    enabled: !!me,
  });

  const allWarehouses = Array.isArray(allWarehousesResponse) 
    ? allWarehousesResponse 
    : (allWarehousesResponse as any)?.data || [];

  // Extract users array from response
  const users = Array.isArray(response) ? response : response?.data || [];
  const displayUsers = users.length > 0 ? users : [];

  // Loading state
  const isDataLoading = isLoading || (isFetching && users.length === 0);

  // Fetch available permissions
  const { data: permissionsResponse = { permissions: [], grouped: {} } } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => customFetch<{ 
      permissions: Array<{ id: number; name: string; display_name: string }>,
      grouped: Record<string, Array<{ id: number; name: string; display_name: string }>>
    }>("/api/users/permissions"),
    enabled: (me?.role as string) === 'admin' || (me?.role as string) === 'super_admin',
  });

  const availablePermissions = permissionsResponse.permissions || [];
  const groupedPermissions = permissionsResponse.grouped || {};

  // Type for permission object
  type Permission = {
    id: number;
    name: string;
    display_name: string;
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "id",
      header: "المعرف",
      cell: ({ row }) => <span className="font-medium">#{row.getValue("id")}</span>,
    },
    {
      accessorKey: "username",
      header: "اسم المستخدم",
      cell: ({ row }) => <span className="font-semibold">{row.getValue("username")}</span>,
    },
    {
      accessorKey: "role",
      header: "الدور",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge
            className={
              role === "admin"
                ? "bg-primary text-primary-foreground"
                : role === "user"
                ? "bg-accent text-accent-foreground"
                : role === "auditor"
                ? "bg-blue-500 text-white"
                : "bg-muted"
            }
          >
            {role === "admin" ? "مدير" : role === "user" ? "مستخدم" : role === "auditor" ? "مراجع" : role}
          </Badge>
        );
      },
    },
    {
      accessorKey: "max_warehouses",
      header: "أقصى عدد مخازن",
      cell: ({ row }) => <span>{row.getValue("max_warehouses") || 1}</span>,
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex gap-1">
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
                    setEmail(u.email || "");
                    setRole(u.role as any);
                    setWarehouseId(u.assignedWarehouseId?.toString() || "");
                    setMaxWarehouses(u.maxWarehouses || 1);
                    setCompanyName(u.companyName || "");
                    setCompanyPhone(u.companyPhone || "");
                    setPhone2(u.phone2 || "");
                    setCompanyAddress(u.companyAddress || "");
                    setCompanyCurrency(u.companyCurrency || "ج.م");
                    // Force a small delay or ensure we use the fresh data from the row
                    const currentPermissions = Array.isArray(u.permissions) ? u.permissions : [];
                    setSelectedPermissions([...currentPermissions]);
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
        );
      },
    },
  ], [me?.id]);

  const createMut = useMutation({
    mutationFn: async () => {
      // For super_admin: only send username, password, role, max_warehouses
      // For admin: send username, password, role, assignedWarehouseId, permissions
      const requestData = isSuperAdmin
        ? {
            username,
            password,
            role,
            max_warehouses: maxWarehouses,
          }
        : {
            username,
            password,
            role,
            assignedWarehouseId: warehouseId ? Number(warehouseId) : null,
            permissions: selectedPermissions,
          };

      try {
        const response = await api.createUser(requestData);
        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "تم إضافة المستخدم",
        variant: "success",
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("user");
      setWarehouseId("");
      setMaxWarehouses(1);
      setCompanyName("");
      setCompanyPhone("");
      setPhone2("");
      setCompanyAddress("");
      setCompanyCurrency("ج.م");
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
        variant: "success",
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) =>
      customFetch(`/api/users/${selectedUser?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ 
        title: "تم التحديث",
        variant: "success",
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      setSelectedUser(null);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("user");
      setMaxWarehouses(1);
      setCompanyName("");
      setCompanyPhone("");
      setPhone2("");
      setCompanyAddress("");
      setCompanyCurrency("ج.م");
      setSelectedPermissions([]);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (isDataLoading) return <PageLoader text="جاري تحميل قائمة المستخدمين..." />;
  if (!me) return <PageLoader text="جاري التحقق من الهوية..." />;

  return (
    <div className="space-y-6 w-full">
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
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="user">مستخدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && (
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
              )}
            </div>
            {/* Warehouse Assignment - Visible for both Super Admin (assigning to manager) and Admin (assigning to staff) */}
            <div className="space-y-2 mt-4">
              <Label>إسناد مخزن</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مخزناً" />
                </SelectTrigger>
                <SelectContent>
                  {allWarehouses.map((w: Warehouse) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name} {isSuperAdmin && w.admin?.username ? `(${w.admin.username})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions Section - Only for Admins (not superadmin) */}
            {(me?.role as string) === 'admin' && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <Label className="text-base font-bold">صلاحيات المستخدم</Label>
                </div>
                
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(groupedPermissions)
                    .filter(([category]) => category !== 'الاشتراكات')
                    .map(([category, perms]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-bold text-muted-foreground bg-muted/30 px-2 py-1 rounded border-r-2 border-primary">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 px-1">
                        {perms.map((permission: Permission) => (
                          <div key={permission.id} className="flex items-center gap-2 hover:bg-muted/20 p-1 rounded transition-colors">
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
                              className="text-xs cursor-pointer leading-none"
                            >
                              {permission.display_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedPermissions.length > 0 && (
                  <div className="text-xs font-medium text-primary bg-primary/5 p-2 rounded border border-primary/10">
                    تم اختيار {selectedPermissions.length} صلاحية
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-6">
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
      
      <Card className="p-0 overflow-hidden border-gray-700 shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center ">
          <h3 className="text-lg font-semibold text-white">
            قائمة المستخدمين
          </h3>
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded">
            {`عرض: ${filterInfo} (${displayUsers.length} مستخدم)`}
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:max-w-md py-4">
          <Search className="size-4 text-slate-400 shrink-0" />
          <Input
            placeholder="بحث بالمستخدم..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="bg-[#0e0c20] text-white placeholder:text-slate-500 w-full"
          />
        </div>
        
        <DataTable 
          columns={columns} 
          data={displayUsers} 
          emptyMessage="لا يوجد مستخدمين"
          isLoading={isDataLoading}
          // Remove searchKey and searchPlaceholder to hide the internal DataTable search
        />
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
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
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
            )}
          </div>

          {/* Warehouse Assignment - Visible for both Super Admin and Admin */}
          <div className="space-y-2 mt-4">
            <Label>إسناد مخزن</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مخزناً" />
              </SelectTrigger>
              <SelectContent>
                {allWarehouses.map((w: Warehouse) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name} {isSuperAdmin && (w as any).admin?.username ? `(${(w as any).admin.username})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Section - Only for Admins (not superadmin) */}
          {(me?.role as string) === 'admin' && (
            <div className="space-y-4 border-t pt-4 mt-4 px-6 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <Label className="text-base font-bold">تعديل الصلاحيات</Label>
              </div>
              
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(groupedPermissions)
                  .filter(([category]) => category !== 'الاشتراكات')
                  .map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground bg-muted/30 px-2 py-1 rounded border-r-2 border-primary">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 px-1">
                      {perms.map((permission: Permission) => (
                        <div key={permission.id} className="flex items-center gap-2 hover:bg-muted/20 p-1 rounded transition-colors">
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
                            className="text-xs cursor-pointer leading-none"
                          >
                            {permission.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPermissions.length > 0 && (
                <div className="text-xs font-medium text-primary bg-primary/5 p-2 rounded border border-primary/10">
                  تم اختيار {selectedPermissions.length} صلاحية
                </div>
              )}
            </div>
          )}

            <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => updateMut.mutate({
                username,
                email: email || null,
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
                   (selectedUser?.role as any) === "auditor" ? "مراجع" : selectedUser?.role}
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

