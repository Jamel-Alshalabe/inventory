import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type Invoice, type Product } from "@/lib/api";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer, Eye, X } from "lucide-react";

type Line = { productCode: string; productName: string; quantity: number; price: number };

export default function InvoicesPage() {
  const { selectedWarehouseId, user, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
  const canEdit = user?.role === "admin" || user?.role === "user";

  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [view, setView] = useState<Invoice | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", selectedWarehouseId],
    queryFn: () => api.get<Invoice[]>(`/invoices${warehouseQuery(selectedWarehouseId)}`),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedWarehouseId, ""],
    queryFn: () => api.get<Product[]>(`/products${warehouseQuery(selectedWarehouseId)}`),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api.post<Invoice>("/invoices", {
        customerName: customer,
        items: lines,
        warehouseId: selectedWarehouseId,
      }),
    onSuccess: (inv) => {
      toast({ title: `تم إنشاء الفاتورة ${inv.invoiceNumber}` });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setCustomer("");
      setLines([]);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/invoices/${id}`),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  function addLine(code: string) {
    const p = products.find((x) => x.code === code);
    if (!p) return;
    if (lines.find((l) => l.productCode === code)) return;
    setLines([
      ...lines,
      { productCode: p.code, productName: p.name, quantity: 1, price: p.sellPrice },
    ]);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);
  const totalSales = invoices.reduce((s, i) => s + i.total, 0);

  function printInvoice(inv: Invoice) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const itemsHtml = inv.items
      .map(
        (it) =>
          `<tr><td>${it.productName}</td><td>${it.productCode}</td><td>${it.quantity}</td><td>${it.price.toFixed(2)}</td><td>${it.total.toFixed(2)}</td></tr>`,
      )
      .join("");
    w.document.write(`
      <html dir="rtl"><head><title>فاتورة ${inv.invoiceNumber}</title>
      <style>
        body{font-family:'Noto Kufi Arabic','Tahoma',sans-serif;padding:32px;color:#000;}
        h1{margin:0;font-size:22px;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        th,td{border:1px solid #999;padding:8px;text-align:right;}
        th{background:#eee;}
        .head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:12px;}
        .total{margin-top:16px;text-align:left;font-size:18px;font-weight:bold;}
      </style></head><body>
      <div class="head">
        <div>
          <h1>${settings.companyName ?? "شركة سنك"}</h1>
          <div>${settings.companyAddress ?? ""}</div>
          <div>${settings.companyPhone ?? ""}</div>
        </div>
        <div>
          <h1>فاتورة #${inv.invoiceNumber}</h1>
          <div>${new Date(inv.createdAt).toLocaleString("ar-EG")}</div>
        </div>
      </div>
      <p><strong>العميل:</strong> ${inv.customerName}</p>
      <table>
        <thead><tr><th>المنتج</th><th>الكود</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="total">الإجمالي: ${inv.total.toFixed(2)} ${currency}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الفواتير</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {invoices.length} فاتورة • إجمالي {fmtMoney(totalSales, currency)}
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-invoice">
                <Plus className="size-4 ml-2" />
                فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>فاتورة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم العميل</Label>
                  <Input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    data-testid="input-customer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>إضافة منتج</Label>
                  <Select value="" onValueChange={addLine}>
                    <SelectTrigger data-testid="select-add-product">
                      <SelectValue placeholder="اختر منتجاً للإضافة" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter((p) => p.quantity > 0 && !lines.find((l) => l.productCode === p.code))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.code}>
                            {p.name} — متاح {p.quantity}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border rounded-md max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="w-24">الكمية</TableHead>
                        <TableHead className="w-28">السعر</TableHead>
                        <TableHead className="w-28">الإجمالي</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                            لا توجد أصناف
                          </TableCell>
                        </TableRow>
                      )}
                      {lines.map((l, i) => (
                        <TableRow key={l.productCode}>
                          <TableCell className="font-semibold">{l.productName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(i, { quantity: Number(e.target.value) || 0 })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={l.price}
                              onChange={(e) =>
                                updateLine(i, { price: Number(e.target.value) || 0 })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>{fmtMoney(l.quantity * l.price, currency)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeLine(i)}>
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>الإجمالي</span>
                  <span data-testid="text-invoice-total">{fmtMoney(total, currency)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={() => createMut.mutate()}
                  disabled={!customer || lines.length === 0 || createMut.isPending}
                  data-testid="button-save-invoice"
                >
                  حفظ الفاتورة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>عدد الأصناف</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="w-32">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  لا توجد فواتير
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                <TableCell className="font-semibold">{inv.customerName}</TableCell>
                <TableCell>{inv.items.length}</TableCell>
                <TableCell className="font-semibold">{fmtMoney(inv.total, currency)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmtDate(inv.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setView(inv)}>
                      <Eye className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => printInvoice(inv)}>
                      <Printer className="size-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("حذف هذه الفاتورة؟")) deleteMut.mutate(inv.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>فاتورة #{view?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">العميل:</span>{" "}
                  <span className="font-semibold">{view.customerName}</span>
                </div>
                <div className="text-muted-foreground">{fmtDate(view.createdAt)}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.items.map((it) => (
                    <TableRow key={it.productCode}>
                      <TableCell>{it.productName}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{fmtMoney(it.price, currency)}</TableCell>
                      <TableCell>{fmtMoney(it.total, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                <span>الإجمالي</span>
                <span>{fmtMoney(view.total, currency)}</span>
              </div>
              <Button onClick={() => printInvoice(view)} className="w-full">
                <Printer className="size-4 ml-2" />
                طباعة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
