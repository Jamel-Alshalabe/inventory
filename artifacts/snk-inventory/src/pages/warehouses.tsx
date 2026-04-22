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
import { Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { refreshWarehouses } = useApp();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-page"],
    queryFn: () => api.get<Warehouse[]>("/warehouses"),
  });

  const createMut = useMutation({
    mutationFn: () => api.post<Warehouse>("/warehouses", { name }),
    onSuccess: () => {
      toast({ title: "تم إضافة المخزن" });
      qc.invalidateQueries({ queryKey: ["warehouses-page"] });
      void refreshWarehouses();
      setOpen(false);
      setName("");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/warehouses/${id}`),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["warehouses-page"] });
      void refreshWarehouses();
      setDeleteOpen(false);
      setSelectedWarehouse(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المخازن</h1>
          <p className="text-muted-foreground text-sm mt-1">{warehouses.length} مخزن</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-warehouse">
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
        {warehouses.map((w) => (
          <Card key={w.id} className="p-5" data-testid={`card-warehouse-${w.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <WarehouseIcon className="size-5" />
                </div>
                <div>
                  <div className="font-bold">{w.name}</div>
                  <div className="text-sm text-muted-foreground">{w.productCount} منتج</div>
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
            <p className="text-sm text-muted-foreground">
              📦 المنتجات والحركات لن تُحذف وستبقى في النظام
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
