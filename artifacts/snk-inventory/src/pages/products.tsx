import { useMemo, useState, type ChangeEvent } from "react";
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
import { Plus, Pencil, Trash2, FileSpreadsheet, Download, Search } from "lucide-react";

type FormState = {
  name: string;
  code: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
};

const empty: FormState = { name: "", code: "", buyPrice: "0", sellPrice: "0", quantity: "0" };

export default function ProductsPage() {
  const { selectedWarehouseId, user, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const canEdit = user?.role === "admin" || user?.role === "user";

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedWarehouseId, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (selectedWarehouseId) qs.set("warehouseId", String(selectedWarehouseId));
      if (search) qs.set("search", search);
      return api.get<Product[]>(`/products?${qs.toString()}`);
    },
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Product>("/products", body),
    onSuccess: () => {
      toast({ title: "تم إضافة المنتج" });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put<Product>(`/products/${id}`, body),
    onSuccess: () => {
      toast({ title: "تم التعديل" });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/products/${id}`),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: (rows: unknown[]) =>
      api.post<{ created: number; skipped: number }>("/products/bulk", {
        products: rows,
        warehouseId: selectedWarehouseId,
      }),
    onSuccess: (r) => {
      toast({ title: "اكتمل الاستيراد", description: `أُضيف ${r.created}، تم تخطي ${r.skipped}` });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const summary = useMemo(() => {
    const totalQty = products.reduce((s, p) => s + p.quantity, 0);
    const value = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
    return { totalQty, value };
  }, [products]);

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      code: p.code,
      buyPrice: String(p.buyPrice),
      sellPrice: String(p.sellPrice),
      quantity: String(p.quantity),
    });
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ title: "الاسم والكود مطلوبان", variant: "destructive" });
      return;
    }
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      quantity: Number(form.quantity),
      warehouseId: selectedWarehouseId,
    };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ab = ev.target?.result;
      if (!ab) return;
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const rows = json
        .map((r) => ({
          name: String(r["الاسم"] ?? r["name"] ?? "").trim(),
          code: String(r["الكود"] ?? r["code"] ?? "").trim(),
          buyPrice: Number(r["سعر الشراء"] ?? r["buyPrice"] ?? 0),
          sellPrice: Number(r["سعر البيع"] ?? r["sellPrice"] ?? 0),
          quantity: Number(r["الكمية"] ?? r["quantity"] ?? 0),
        }))
        .filter((r) => r.name && r.code);
      if (rows.length === 0) {
        toast({ title: "الملف فارغ أو غير صالح", variant: "destructive" });
        return;
      }
      importMut.mutate(rows);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  function handleExport() {
    const data = products.map((p) => ({
      الاسم: p.name,
      الكود: p.code,
      "سعر الشراء": p.buyPrice,
      "سعر البيع": p.sellPrice,
      الكمية: p.quantity,
      المخزن: p.warehouseName ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, `products-${Date.now()}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products.length} منتج • {summary.totalQty} قطعة • قيمة {fmtMoney(summary.value, currency)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImport}
                  data-testid="input-import"
                />
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">
                    <FileSpreadsheet className="size-4 ml-2" />
                    استيراد إكسل
                  </span>
                </Button>
              </label>
            </>
          )}
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="size-4 ml-2" />
            تصدير
          </Button>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} data-testid="button-add-product">
                  <Plus className="size-4 ml-2" />
                  إضافة منتج
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>{editing ? "تعديل منتج" : "إضافة منتج"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>الاسم</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>الكود</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      data-testid="input-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سعر الشراء</Label>
                    <Input
                      type="number"
                      value={form.buyPrice}
                      onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                      data-testid="input-buy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سعر البيع</Label>
                    <Input
                      type="number"
                      value={form.sellPrice}
                      onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                      data-testid="input-sell"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>الكمية الابتدائية</Label>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      disabled={!!editing}
                      data-testid="input-qty"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMut.isPending || updateMut.isPending}
                    data-testid="button-save"
                  >
                    حفظ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="pr-10"
              data-testid="input-search"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>سعر الشراء</TableHead>
              <TableHead>سعر البيع</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>المخزن</TableHead>
              {canEdit && <TableHead className="w-32">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-12">
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell>{fmtMoney(p.buyPrice, currency)}</TableCell>
                <TableCell>{fmtMoney(p.sellPrice, currency)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      p.quantity === 0
                        ? "border-destructive text-destructive"
                        : p.quantity <= 5
                        ? "border-chart-3 text-chart-3"
                        : ""
                    }
                  >
                    {p.quantity}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.warehouseName}</TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        data-testid={`button-edit-${p.id}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`حذف ${p.name}؟`)) deleteMut.mutate(p.id);
                        }}
                        data-testid={`button-delete-${p.id}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
