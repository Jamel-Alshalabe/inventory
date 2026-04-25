import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Warehouse } from "@/lib/api";
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
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { Plus, Trash2, Warehouse as WarehouseIcon, User, AlertCircle } from "lucide-react";

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { refreshWarehouses, user } = useApp();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");

  const { data: warehousesResponse = { data: [] } } = useQuery({
    queryKey: ["warehouses-page"],
    queryFn: () => api.listWarehouses(),
  });
  const warehouses = warehousesResponse.data || [];

  const createMut = useMutation({
    mutationFn: () => api.createWarehouse({ name }),
    onSuccess: () => {
      toast({ 
        title: "تم إضافة المخزن",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["warehouses-page"] });
      qc.invalidateQueries({ queryKey: ["/api/warehouses"] });
      void refreshWarehouses();
      setOpen(false);
      setName("");
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء إضافة المخزن";
      
      if (error?.message) {
        if (error.message.includes("الحد الأقصى المسموح به")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: "خطأ", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteWarehouse(id),
    onSuccess: () => {
      toast({ 
        title: "تم الحذف",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["warehouses-page"] });
      qc.invalidateQueries({ queryKey: ["/api/warehouses"] });
      void refreshWarehouses();
      setDeleteOpen(false);
      setSelectedWarehouse(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Check if user can create more warehouses
  const canCreateMoreWarehouses = user?.role === 'super_admin' || 
    (user?.maxWarehouses && warehouses.length < user.maxWarehouses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المخازن</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground text-sm">{warehouses.length} مخزن</p>
            {user?.role !== 'super_admin' && user?.maxWarehouses && (
              <p className="text-muted-foreground text-sm">
                الحد المسموح: {warehouses.length}/{user.maxWarehouses}
              </p>
            )}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-add-warehouse"
              disabled={!canCreateMoreWarehouses}
            >
              <Plus className="size-4 ml-2" />
              مخزن جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>مخزن جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>اسم المخزن</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-warehouse-name"
              />
            </div>
            {!canCreateMoreWarehouses && user?.role !== 'super_admin' && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle className="size-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  لقد وصلت إلى الحد الأقصى للمخازن المسموح به ({user?.maxWarehouses})
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending}>
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w: Warehouse) => (
          <Card key={w.id} className="p-5" data-testid={`card-warehouse-${w.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <WarehouseIcon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{w.name}</div>
                  <div className="text-sm text-muted-foreground">{w.productCount} منتج</div>
                  {w.admin && user?.role === 'super_admin' && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {w.admin.username}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedWarehouse(w);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد حذف المخزن</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              هل أنت متأكد من أنك تريد حذف المخزن "<span className="font-semibold text-foreground">{selectedWarehouse?.name}</span>"؟
            </p>
            <p className="text-sm text-destructive font-medium">
              🚨 **تحذير:** سيتم حذف جميع المنتجات التي بداخل هذا المخزن أيضاً
            </p>
            <p className="text-sm text-muted-foreground">
              📦 جميع المنتجات والحركات المرتبطة بهذا المخزن سيتم حذفها نهائياً
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
                if (selectedWarehouse) {
                  deleteMut.mutate(selectedWarehouse.id);
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
