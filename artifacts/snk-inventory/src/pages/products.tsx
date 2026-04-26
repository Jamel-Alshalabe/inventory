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
import { Plus, Pencil, Trash2, FileSpreadsheet, Download, Search, Upload, CloudUpload, FileUp } from "lucide-react";

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
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<Array<{
    code: string;
    name: string;
    quantity: number;
    buyPrice: number;
    sellPrice: number;
    exists?: boolean;
  }>>([]);
  const qc = useQueryClient();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const { toast } = useToast();

  const { data: dataResponse, isLoading } = useQuery({
    queryKey: ["products", selectedWarehouseId],
    queryFn: () => {
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

  // Parse Excel file and show preview
  const parseExcelFile = async (file: File) => {
    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      const parsedProducts = [];
      const existingCodes = new Set(data.map((p: Product) => p.code.toLowerCase()));

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;

        const code = String(row[0] || "").trim();
        const name = String(row[1] || "").trim();
        const quantity = Number(row[2]) || 0;
        const buyPrice = Number(row[3]) || 0;
        const sellPrice = Number(row[4]) || 0;

        if (!code || !name) continue;

        parsedProducts.push({
          code,
          name,
          quantity,
          buyPrice,
          sellPrice,
          exists: existingCodes.has(code.toLowerCase()),
        });
      }

      setPreviewData(parsedProducts);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل قراءة ملف Excel",
        variant: "destructive",
      });
    }
  };

  const handleImportExcel = async () => {
    if (!importFile || !selectedWarehouseId) {
      toast({
        title: "خطأ",
        description: "يجب اختيار ملف ومستودع أولاً",
        variant: "destructive",
      });
      return;
    }

    // Filter out existing products
    const newProducts = previewData.filter(p => !p.exists).map(p => ({
      code: p.code,
      name: p.name,
      quantity: p.quantity,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
    }));

    if (newProducts.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد منتجات جديدة للاستيراد (جميع الأكواد موجودة مسبقاً)",
        variant: "default",
      });
      return;
    }

    setImporting(true);
    try {
      // Use bulk API
      const result = await api.bulkImportProducts({
        items: newProducts,
        warehouseId: selectedWarehouseId,
      });

      // Refresh products list
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });

      // Close modal and reset
      setImportOpen(false);
      setImportFile(null);
      setPreviewData([]);

      toast({
        title: "اكتمل الاستيراد",
        description: `تم إضافة ${result.created} منتج${result.created !== 1 ? "ات" : ""}${result.updated > 0 ? ` وتحديث ${result.updated} منتج` : ""}${previewData.filter(p => p.exists).length > 0 ? `، تم تجاهل ${previewData.filter(p => p.exists).length} منتج موجود` : ""}`,
        variant: "default",
        className: "bg-green-500 text-white border-green-600",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل استيراد الملف",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
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
    confirm({
      title: "حذف المنتج",
      description: `هل أنت متأكد من حذف "${productName}"؟`,
      onConfirm: () => {
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

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
      <Card className="p-4 sm:p-6 bg-[#16162b] border border-slate-700/50 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-white">المنتجات</h1>
          <div className="flex flex-wrap items-center gap-2">
            {(user.role === "admin" || user.role === "user") && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="text-sm">
                    <Plus className="size-4 ml-1 sm:ml-2" />
                    <span className="hidden sm:inline">إضافة منتج</span>
                    <span className="sm:hidden">إضافة</span>
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
            <>
              {/* Import Excel Button */}
              <Button variant="outline" onClick={() => setImportOpen(true)} className="border-slate-600 text-slate-400 text-sm">
                <Upload className="size-4 ml-1 sm:ml-2" />
                <span className="hidden sm:inline">استيراد من Excel</span>
                <span className="sm:hidden">استيراد</span>
              </Button>

              {/* Import Excel Modal */}
              <Dialog open={importOpen} onOpenChange={(open) => {
                if (!open) {
                  setImportFile(null);
                  setPreviewData([]);
                }
                setImportOpen(open);
              }}>
                <DialogContent dir="rtl" className="bg-[#16162b] border border-slate-700/50 max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <CloudUpload className="size-5 text-primary" />
                      استيراد المنتجات من Excel
                    </DialogTitle>
                  </DialogHeader>

                  {/* Instructions */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-medium">
                      <FileSpreadsheet className="size-4" />
                      تعليمات الاستيراد:
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                      <li>يجب أن يحتوي الملف على الأعمدة التالية: <strong className="text-white">كود - اسم - كمية - شراء - بيع</strong></li>
                      <li>ترتيب الأعمدة يجب أن يكون: <strong className="text-white">كود المنتج | اسم المنتج | الكمية | سعر الشراء | سعر البيع</strong></li>
                      <li>استخدم صيغة <strong className="text-white">.xlsx</strong> أو <strong className="text-white">.xls</strong></li>
                      <li>يتم تجاهل الصفوف الفارغة تلقائياً</li>
                      <li>سيتم تجاهل أي منتج كوده موجود مسبقاً</li>
                    </ul>
                  </div>

                  {/* File Upload Area */}
                  <div className="space-y-4">
                    <Label className="text-slate-400">ملف Excel</Label>
                    <div
                      className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('excel-file-input')?.click()}
                    >
                      <input
                        id="excel-file-input"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImportFile(file);
                            parseExcelFile(file);
                          }
                        }}
                      />
                      {importFile ? (
                        <div className="space-y-2">
                          <FileUp className="size-8 mx-auto text-primary" />
                          <p className="text-white font-medium">{importFile.name}</p>
                          <p className="text-xs text-slate-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportFile(null);
                            }}
                          >
                            إزالة الملف
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <CloudUpload className="size-10 mx-auto text-slate-500" />
                          <p className="text-slate-300 font-medium">اسحب ملف Excel هنا</p>
                          <p className="text-sm text-slate-500">أو اضغط للاختيار من جهازك</p>
                        </div>
                      )}
                    </div>

                    {!selectedWarehouseId && (
                      <p className="text-amber-400 text-sm flex items-center gap-1">
                        <span>⚠️</span> يجب اختيار المخزن أولاً من القائمة العلوية
                      </p>
                    )}
                  </div>

                  {/* Preview Table */}
                  {previewData.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">معاينة البيانات</Label>
                        <div className="text-sm text-slate-400">
                          <span className="text-green-400 font-medium">{previewData.filter(p => !p.exists).length}</span> جديد
                          {previewData.filter(p => p.exists).length > 0 && (
                            <span className="text-red-400 font-medium mr-2">، {previewData.filter(p => p.exists).length} موجود</span>
                          )}
                        </div>
                      </div>
                      <div className="border border-slate-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#1a1a2e] sticky top-0">
                            <tr className="text-slate-300">
                              <th className="px-3 py-2 text-right font-medium">الكود</th>
                              <th className="px-3 py-2 text-right font-medium">الاسم</th>
                              <th className="px-3 py-2 text-right font-medium">الكمية</th>
                              <th className="px-3 py-2 text-right font-medium">سعر الشراء</th>
                              <th className="px-3 py-2 text-right font-medium">سعر البيع</th>
                              <th className="px-3 py-2 text-center font-medium">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {previewData.map((product, index) => (
                              <tr key={index} className={product.exists ? "bg-red-500/5" : ""}>
                                <td className="px-3 py-2 font-mono text-xs text-slate-300">{product.code}</td>
                                <td className="px-3 py-2 text-slate-200 truncate max-w-[150px]" title={product.name}>{product.name}</td>
                                <td className="px-3 py-2 text-slate-300">{product.quantity}</td>
                                <td className="px-3 py-2 text-slate-300">{product.buyPrice}</td>
                                <td className="px-3 py-2 text-slate-300">{product.sellPrice}</td>
                                <td className="px-3 py-2 text-center">
                                  {product.exists ? (
                                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">موجود</span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">جديد</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImportOpen(false);
                        setImportFile(null);
                        setPreviewData([]);
                      }}
                      className="border-slate-600 text-slate-400"
                      disabled={importing}
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleImportExcel}
                      disabled={!importFile || !selectedWarehouseId || importing || previewData.filter(p => !p.exists).length === 0}
                      className="min-w-[100px]"
                    >
                      {importing ? (
                        <>
                          <div className="size-4 animate-spin ml-2 border-2 border-white/30 border-t-white rounded-full" />
                          جاري الاستيراد...
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 ml-2" />
                          استيراد {previewData.filter(p => !p.exists).length > 0 && `(${previewData.filter(p => !p.exists).length})`}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:max-w-md">
          <Search className="size-4 text-slate-400 shrink-0" />
          <Input
            placeholder="بحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0e0c20] text-white placeholder:text-slate-500 w-full"
          />
        </div>
        
        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e] text-slate-300">
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm">الكود</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm">الاسم</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm">الكمية</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm hidden sm:table-cell">الشراء</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm hidden sm:table-cell">البيع</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-xs sm:text-sm">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                filtered.map((product: Product) => {
                  const stockBadge = getStockBadge(product.quantity);
                  return (
                    <tr key={product.id} className="border-t border-slate-700/50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs">{product.code}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-white truncate max-w-[100px] sm:max-w-[200px]" title={product.name}>
                        {product.name}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <Badge variant={stockBadge.variant} className="text-xs">
                          {product.quantity} 
                        </Badge>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm hidden sm:table-cell">{fmtMoney(product.buyPrice)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-medium hidden sm:table-cell">{fmtMoney(product.sellPrice)}</td>
                      
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          {(user.role === "admin" || user.role === "user") && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(product)}
                                className="size-8 sm:size-9"
                              >
                                <Pencil className="size-3.5 sm:size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 size-8 sm:size-9"
                                onClick={() => {
                                  handleDelete(product.id, product.name);
                                }}
                              >
                                <Trash2 className="size-3.5 sm:size-4" />
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
