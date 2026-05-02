import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Warehouse } from "@/services/api/api";
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
import { Plus, Trash2, Warehouse as WarehouseIcon, User, AlertCircle, Search } from "lucide-react";

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { refreshWarehouses, user } = useApp();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["warehouses-page"] });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, qc]);

  const { data: warehousesResponse = { data: [] } } = useQuery({
    queryKey: ["warehouses-page", searchQuery],
    queryFn: () => {
      const url = searchQuery ? `/api/warehouses?q=${encodeURIComponent(searchQuery)}` : '/api/warehouses';
      return fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      }).then(res => res.json()).then(data => ({ data }));
    },
  });
  const warehouses = (warehousesResponse as any).data || [];

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

  const u = user as any;
  const maxW = u?.maxWarehouses || 1;
  const canCreateMoreWarehouses = u?.role === 'super_admin' || 
    u?.role === 'admin' || 
    (maxW && warehouses.length < maxW);

  return (
    <div className="space-y-8 p-4 sm:p-8 min-h-screen" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500">
            المخازن
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/40 px-3 py-1 rounded-full border border-slate-700/50">
              <WarehouseIcon className="size-3.5 text-blue-400" />
              <span>{warehouses.length} مخزن متاح</span>
            </div>
            {u?.role !== 'super_admin' && (
              <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/40 px-3 py-1 rounded-full border border-slate-700/50">
                <AlertCircle className="size-3.5 text-amber-400" />
                <span>الحد المسموح: {warehouses.length}/{maxW}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
            <Input
              placeholder="بحث في المخازن..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0e0c20] border-slate-700 text-white focus:ring-blue-500/50 pr-10 w-64"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 hover:scale-105 flex items-center gap-2"
                data-testid="button-add-warehouse"
                disabled={!canCreateMoreWarehouses}
              >
                <Plus className="size-4" />
                <span>مخزن جديد</span>
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="bg-[#0b0b1a] border border-slate-700/50 text-white">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">إضافة مخزن جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">اسم المخزن</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#0e0c20] border-slate-700 text-white focus:ring-blue-500/50"
                    placeholder="مثال: مخزن المنتجات الرئيسية"
                    data-testid="input-warehouse-name"
                  />
                </div>
                {!canCreateMoreWarehouses && u?.role !== 'super_admin' && (
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertCircle className="size-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-200">
                      لقد وصلت إلى الحد الأقصى للمخازن المسموح به ({maxW})
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-700 text-slate-400 hover:bg-slate-800">
                  إلغاء
                </Button>
                <Button 
                  onClick={() => createMut.mutate()} 
                  disabled={!name || createMut.isPending}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {createMut.isPending && <div className="size-4 animate-spin ml-2 border-2 border-white/30 border-t-white rounded-full" />}
                  حفظ المخزن
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {warehouses.map((w: Warehouse) => (
          <Card 
            key={w.id} 
            className="group relative overflow-hidden p-6 bg-gradient-to-br from-[#111127]/80 to-[#1a1a2e]/80 border border-slate-700/30 backdrop-blur-2xl transition-all duration-500 hover:scale-[1.03] hover:border-blue-500/30 shadow-2xl"
            data-testid={`card-warehouse-${w.id}`}
          >
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <WarehouseIcon className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors line-clamp-1">{w.name}</h3>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWarehouse(w);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>

              {(w as any).admin && u?.role === 'super_admin' && (
                <div className="flex items-center gap-3 pt-4 border-t border-slate-700/30 mt-auto">
                  <div className="size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <User className="size-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">مسؤول المخزن</span>
                    <span className="text-sm text-slate-300 font-medium">{(w as any).admin.username}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute -bottom-6 -right-6 size-32 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-colors duration-500" />
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
          </Card>
        ))}
      </div>

      {canCreateMoreWarehouses && warehouses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-20 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-6">
            <WarehouseIcon className="size-10 text-slate-400" />
          </div>
          <p className="text-slate-400 text-lg font-medium">لا توجد مخازن مضافة بعد</p>
          <Button 
            variant="outline" 
            onClick={() => setOpen(true)}
            className="border-slate-700 text-slate-400 hover:bg-slate-800"
          >
            اضغط لإضافة أول مخزن
          </Button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl" className="bg-[#16162b] border border-slate-700/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <AlertCircle className="size-6 text-red-500" />
              تأكيد حذف المخزن
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <p className="text-slate-300">
                هل أنت متأكد من أنك تريد حذف المخزن "<span className="font-bold text-white text-lg">{selectedWarehouse?.name}</span>"؟
              </p>
            </div>
            
            <div className="space-y-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-sm text-red-400 font-bold flex items-center gap-2">
                ⚠️ تحذير شديد:
              </p>
              <ul className="text-sm text-red-200/80 space-y-2 list-disc list-inside">
                <li>سيتم حذف جميع المنتجات داخل المخزن نهائياً.</li>
                <li>سيتم مسح جميع سجلات الحركات المرتبطة.</li>
                <li>هذا الإجراء لا يمكن التراجع عنه بأي حال.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-slate-700 text-slate-400 hover:bg-slate-800">
              إلغاء التراجع
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
              onClick={() => {
                if (selectedWarehouse) {
                  deleteMut.mutate(selectedWarehouse.id);
                }
              }}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <div className="size-4 animate-spin ml-2 border-2 border-white/30 border-t-white rounded-full" />}
              تأكيد الحذف النهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
