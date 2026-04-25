import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtMoney, type Product } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileSpreadsheet, Download, Search } from "lucide-react";

type FormState = {
  id?: number;
  name: string;
  code: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
};

const empty: FormState = { name: "", code: "", buyPrice: "0", sellPrice: "0", quantity: "0" };

export default function ProductsPage() {
  const { user, selectedWarehouseId } = useApp();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<FormState>(empty);
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState<FormState>(empty);
  const qc = useQueryClient();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const { toast } = useToast();

  const { data: dataResponse, isLoading } = useQuery({
    queryKey: ["products", selectedWarehouseId],
    queryFn: () => {
      console.log('Fetching products with warehouseId:', selectedWarehouseId);
      return api.listProducts(selectedWarehouseId ? { warehouseId: selectedWarehouseId } : undefined);
    },
    retry: 2,
    staleTime: 30000,
  });
  const data = Array.isArray(dataResponse) ? dataResponse : (dataResponse?.data || []);

  const createMut = useMutation({
    mutationFn: (data: Omit<Product, "id" | "createdAt" | "warehouseName">) => api.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setCreateOpen(false);
      setCreate(empty);
      toast({
        title: "نجاح",
        description: "تم إضافة المنتج بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل إضافة المنتج",
        variant: "destructive",
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => api.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setEditOpen(false);
      setEdit(empty);
      toast({
        title: "نجاح",
        description: "تم تحديث المنتج بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل تحديث المنتج",
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "نجاح",
        description: "تم حذف المنتج بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف المنتج",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    return data.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(s) ||
        p.code.toLowerCase().includes(s)
    );
  }, [data, search]);

  const handleCreate = () => {
    if (!selectedWarehouseId) {
      toast({
        title: "خطأ",
        description: "يجب اختيار مستودع أولاً",
        variant: "destructive",
      });
      return;
    }
    const productData = {
      name: create.name.trim(),
      code: create.code.trim(),
      buyPrice: Number(create.buyPrice),
      sellPrice: Number(create.sellPrice),
      quantity: Number(create.quantity),
      warehouseId: selectedWarehouseId,
    };
    console.log('Creating product with data:', productData);
    createMut.mutate(productData);
  };

  const handleUpdate = () => {
    if (!edit.id || !selectedWarehouseId) {
      toast({
        title: "خطأ",
        description: "بيانات غير مكتملة",
        variant: "destructive",
      });
      return;
    }
    updateMut.mutate({
      id: edit.id,
      data: {
        name: edit.name.trim(),
        code: edit.code.trim(),
        buyPrice: Number(edit.buyPrice),
        sellPrice: Number(edit.sellPrice),
        quantity: Number(edit.quantity),
        warehouseId: selectedWarehouseId,
      },
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

  const openEdit = (product: Product) => {
    setEdit({
      id: product.id,
      name: product.name,
      code: product.code,
      buyPrice: product.buyPrice.toString(),
      sellPrice: product.sellPrice.toString(),
      quantity: product.quantity.toString(),
    });
    setEditOpen(true);
  };

  const handleDelete = (productId: number, productName: string) => {
    console.log('Attempting to delete product:', { productId, productName });
    confirm({
      title: "حذف المنتج",
      description: `هل أنت متأكد من حذف "${productName}"؟`,
      onConfirm: () => {
        console.log('Confirmed delete for product:', productId);
        deleteMut.mutate(productId);
      },
    });
  };

  const getStockBadge = (quantity: number) => {
    if (quantity <= 10) return { variant: "destructive" as const, text: "منخفض جداً" };
    if (quantity <= 50) return { variant: "secondary" as const, text: "منخفض" };
    return { variant: "default" as const, text: "متوفر" };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
        <div className="text-white">جاري تحميل...</div>
      </div>
    );
  }

  // Debug user role and permissions
  console.log('Current user:', { role: user.role, permissions: user.permissions });

  return (
    <div className="p-6 space-y-6" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
      <Card className="p-6 bg-[#16162b] border border-slate-700/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">المنتجات</h1>
          <div className="flex items-center gap-2">
            {(user.role === "admin" || user.role === "user") && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4 ml-2" />
                    إضافة منتج
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#16162b] border border-slate-700/50">
                  <DialogHeader>
                    <DialogTitle className="text-white">إضافة منتج جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400">اسم المنتج</Label>
                      <Input
                        value={create.name}
                        onChange={(e) => setCreate({ ...create, name: e.target.value })}
                        className="bg-[#0e0c20] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">الكود</Label>
                      <Input
                        value={create.code}
                        onChange={(e) => setCreate({ ...create, code: e.target.value })}
                        className="bg-[#0e0c20] text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-400">سعر الشراء</Label>
                        <Input
                          type="number"
                          value={create.buyPrice}
                          onChange={(e) => setCreate({ ...create, buyPrice: e.target.value })}
                          className="bg-[#0e0c20] text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400">سعر البيع</Label>
                        <Input
                          type="number"
                          value={create.sellPrice}
                          onChange={(e) => setCreate({ ...create, sellPrice: e.target.value })}
                          className="bg-[#0e0c20] text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400">الكمية</Label>
                      <Input
                        type="number"
                        value={create.quantity}
                        onChange={(e) => setCreate({ ...create, quantity: e.target.value })}
                        className="bg-[#0e0c20] text-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      className="border-slate-600 text-slate-400"
                    >
                      إلغاء
                    </Button>
                    <Button onClick={handleCreate} disabled={createMut.isPending}>
                      {createMut.isPending && <div className="size-4 animate-spin ml-2" />}
                      إضافة
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={exportExcel} className="border-slate-600 text-slate-400">
              <Download className="size-4 ml-2" />
              تصدير Excel
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 max-w-md">
          <Search className="size-4 text-slate-400" />
          <Input
            placeholder="بحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0e0c20] text-white placeholder:text-slate-500"
          />
        </div>
        
        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e] text-slate-300">
                <th className="px-4 py-3 text-right font-medium">الكود</th>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">الكمية</th>
                <th className="px-4 py-3 text-right font-medium">سعر الشراء</th>
                <th className="px-4 py-3 text-right font-medium">سعر البيع</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                filtered.map((product: Product) => {
                  const stockBadge = getStockBadge(product.quantity);
                  return (
                    <tr key={product.id} className="border-t border-slate-700/50">
                      <td className="px-4 py-3 font-mono text-xs">{product.code}</td>
                      <td className="px-4 py-3 font-medium text-white truncate max-w-[200px]" title={product.name}>
                        {product.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stockBadge.variant}>
                          {product.quantity} - {stockBadge.text}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{fmtMoney(product.buyPrice)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{fmtMoney(product.sellPrice)}</td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(user.role === "admin" || user.role === "user") && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(product)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => {
                                  console.log('Delete button clicked for product:', product.id);
                                  handleDelete(product.id, product.name);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#16162b] border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-white">تعديل المنتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-400">اسم المنتج</Label>
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className="bg-[#0e0c20] text-white"
              />
            </div>
            <div>
              <Label className="text-slate-400">الكود</Label>
              <Input
                value={edit.code}
                onChange={(e) => setEdit({ ...edit, code: e.target.value })}
                className="bg-[#0e0c20] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">سعر الشراء</Label>
                <Input
                  type="number"
                  value={edit.buyPrice}
                  onChange={(e) => setEdit({ ...edit, buyPrice: e.target.value })}
                  className="bg-[#0e0c20] text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">سعر البيع</Label>
                <Input
                  type="number"
                  value={edit.sellPrice}
                  onChange={(e) => setEdit({ ...edit, sellPrice: e.target.value })}
                  className="bg-[#0e0c20] text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">الكمية</Label>
              <Input
                type="number"
                value={edit.quantity}
                onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
                className="bg-[#0e0c20] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="border-slate-600 text-slate-400"
            >
              إلغاء
            </Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending && <div className="size-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <ConfirmationComponent isLoading={deleteMut.isPending} />
    </div>
  );
}
