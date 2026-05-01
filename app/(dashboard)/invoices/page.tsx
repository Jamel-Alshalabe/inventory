import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type Invoice, type Product } from "@/services/api/api";
import { customFetch } from "@/services/api/custom-fetch";
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
import { DataTable } from "@/components/ui/data-table";
import { Loader } from "@/components/shared/loader";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer, Eye, X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

function getInvoiceColumns(
  currency: string,
  canEdit: boolean,
  setView: (invoice: Invoice) => void,
  printInvoice: (invoice: Invoice) => void,
  deleteMut: any,
  confirm: (options: { title: string; description: string; onConfirm: () => void }) => void
): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: "invoiceNumber",
      header: "رقم الفاتورة",
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("invoiceNumber")}</div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "العميل",
      cell: ({ row }) => (
        <div className="font-semibold">{row.getValue("customerName")}</div>
      ),
    },
    {
      accessorKey: "items",
      header: "عدد الأصناف",
      cell: ({ row }) => {
        const items = row.getValue("items") as any[];
        return <div>{items.length}</div>;
      },
    },
    {
      accessorKey: "total",
      header: "الإجمالي",
      cell: ({ row }) => {
        const total = parseFloat(row.getValue("total"));
        return <div className="font-semibold">{fmtMoney(total, currency)}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "التاريخ",
      cell: ({ row }) => (
        <div className="text-muted-foreground text-xs">{fmtDate(row.getValue("createdAt"))}</div>
      ),
    },
    {
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) => {
        const invoice = row.original;
        
        return (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setView(invoice)}>
              <Eye className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => printInvoice(invoice)}>
              <Printer className="size-4" />
            </Button>
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  confirm({
                    title: "حذف الفاتورة",
                    description: `هل أنت متأكد من حذف فاتورة رقم ${invoice.invoiceNumber} للعميل "${invoice.customerName}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
                    onConfirm: () => deleteMut.mutate(invoice.id),
                  });
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

type Line = { productCode: string; productName: string; quantity: number; price: number };

export default function InvoicesPage() {
  const { selectedWarehouseId, user, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const canEdit = user?.role === "admin" || user?.role === "user";

  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [view, setView] = useState<Invoice | null>(null);

  const { data: invoicesResponse = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: ["invoices", selectedWarehouseId],
    queryFn: () => customFetch<Invoice[]>(`/api/invoices${warehouseQuery(selectedWarehouseId)}`),
  });

  // Extract invoices array from response
  const invoices = Array.isArray(invoicesResponse) ? invoicesResponse : ((invoicesResponse as any)?.data || []);

  const { data: productsResponse = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", selectedWarehouseId, ""],
    queryFn: () => customFetch<Product[]>(`/api/products${warehouseQuery(selectedWarehouseId)}`),
  });

  // Extract products array from response
  const products = Array.isArray(productsResponse) ? productsResponse : ((productsResponse as any)?.data || []);

  const createMut = useMutation({
    mutationFn: () => {
      const validLines = lines.filter(l => l.productCode && l.quantity > 0);
      return customFetch<Invoice>("/api/invoices", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer,
          items: validLines.map(l => ({
            productCode: l.productCode,
            quantity: l.quantity,
            price: l.price,
          })),
          warehouseId: selectedWarehouseId,
        }),
      });
    },
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
    mutationFn: (id: number) => customFetch(`/api/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  function addLine(code: string) {
    const p = products.find((x: Product) => x.code === code);
    if (!p) return;
    setLines([
      ...lines,
      { productCode: p.code, productName: p.name, quantity: 1, price: p.sellPrice },
    ]);
  }

  function addEmptyLine() {
    setLines([...lines, { productCode: "", productName: "", quantity: 1, price: 0 }]);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((s: number, l) => s + l.quantity * l.price, 0);
  const totalSales = invoices.reduce((s: number, i: Invoice) => s + i.total, 0);

  function printInvoice(inv: Invoice) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const itemsHtml = inv.items
      .map(
        (it) =>
          `<tr>
            <td class="item-name">${it.productName}</td>
            <td class="item-qty">${it.quantity}</td>
            <td class="item-price">${fmtMoney(it.price, currency)}</td>
            <td class="item-total">${fmtMoney(it.total, currency)}</td>
          </tr>`,
      )
      .join("");
    
    const date = new Date(inv.createdAt);
    const formattedDate = date.toLocaleDateString("ar-EG", { day: 'numeric', month: 'numeric', year: 'numeric' });
    const printDateTime = new Date().toLocaleString("ar-EG");
    
    w.document.write(`
      <html dir="rtl"><head><title>فاتورة ${inv.invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Noto Kufi Arabic', 'Tahoma', sans-serif;
          margin: 0;
          padding: 20px;
          color: #000;
          background: #fff;
        }
        
        .page {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .invoice-header {
          background: linear-gradient(135deg, #0f3490 0%, #1a56db 100%);
          color: white;
          padding: 30px;
          text-align: center;
          position: relative;
        }
        
        .invoice-header h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        
        .invoice-header p {
          margin: 3px 0;
          font-size: 14px;
          opacity: 0.95;
        }
        
        .invoice-details {
          padding: 25px 35px;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .detail-value {
          font-size: 15px;
          color: #1e293b;
          font-weight: 700;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .items-table th {
          background: #1e293b;
          color: white;
          font-weight: 700;
          text-align: right;
          padding: 15px 20px;
          font-size: 13px;
        }
        
        .items-table td {
          padding: 14px 20px;
          text-align: right;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          color: #334155;
        }
        
        .items-table tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .item-qty, .item-price, .item-total {
          text-align: center !important;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .item-total {
          font-weight: 800;
          color: #1e40af;
        }
        
        .summary-section {
          padding: 30px 35px;
          display: flex;
          justify-content: flex-end;
        }
        
        .total-card {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 20px 40px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
        }
        
        .total-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 5px;
          opacity: 0.9;
        }
        
        .total-amount {
          font-size: 32px;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .invoice-footer {
          padding: 30px;
          text-align: center;
          background: #f1f5f9;
          border-top: 1px solid #e2e8f0;
        }
        
        .footer-text {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 10px;
        }
        
        .footer-brand {
          font-weight: 700;
          color: #0f172a;
        }
        
        @media print {
          body { padding: 0; }
          .page { border: none; box-shadow: none; border-radius: 0; }
          .total-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>
      <div class="page">
        <div class="invoice-header">
          <h2>${settings.companyName ?? ""}</h2>
          <p>لإدارة المخزون وقطع غيار السيارات</p>
          ${settings.companyPhone ? `<p>هاتف: ${settings.companyPhone}</p>` : ''}
        </div>
        
        <div class="invoice-details">
          <div class="detail-item">
            <span class="detail-label">رقم الفاتورة</span>
            <span class="detail-value">#INV-${inv.invoiceNumber}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">التاريخ</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">العميل</span>
            <span class="detail-value">${inv.customerName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">بواسطة</span>
            <span class="detail-value">${user?.username || 'المسؤول'}</span>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 45%;">المنتج</th>
              <th class="item-qty">الكمية</th>
              <th class="item-price">السعر</th>
              <th class="item-total">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="summary-section">
          <div class="total-card">
            <div class="total-label">الإجمالي النهائي</div>
            <div class="total-amount">${fmtMoney(inv.total, currency)}</div>
          </div>
        </div>
        
        <div class="invoice-footer">
          <p class="footer-text">شكراً لتعاملكم مع <span class="footer-brand">${settings.companyName ?? "شركة سنك"}</span></p>
          <p style="font-size: 10px; color: #94a3b8;">تم إصدار الفاتورة في: ${printDateTime}</p>
        </div>
      </div>
      <script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 500);}</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">الفواتير</h1>
          <p className="text-gray-400 text-sm">إدارة فواتير المبيعات</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                <Plus className="size-4 ml-2" />
                إنشاء فاتورة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-gray-800 border-gray-700 text-white p-0 overflow-hidden" dir="rtl">
              <DialogHeader className="p-5 border-b border-gray-700">
                <DialogTitle className="text-white text-lg font-bold">إنشاء فاتورة جديدة</DialogTitle>
              </DialogHeader>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">اسم العميل</Label>
                  <Input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full bg-gray-900 border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="أدخل اسم العميل..."
                  />
                </div>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-900">
                      <TableRow className="border-gray-700">
                        <TableHead className="w-48 text-right text-gray-300">المنتج</TableHead>
                        <TableHead className="w-24 text-center text-gray-300">الكمية</TableHead>
                        <TableHead className="w-28 text-center text-gray-300">السعر</TableHead>
                        <TableHead className="w-28 text-center text-gray-300">الإجمالي</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-gray-800">
                      {lines.length === 0 && (
                        <TableRow className="border-gray-700">
                          <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                            لا توجد أصناف مضافة بعد
                          </TableCell>
                        </TableRow>
                      )}
                      {lines.map((l, i) => (
                        <TableRow key={`${l.productCode}-${i}`} className="border-gray-700 hover:bg-gray-750">
                          <TableCell>
                            <Select
                              value={l.productCode}
                              onValueChange={(code) => {
                                const p = products.find((x: Product) => x.code === code);
                                if (p) {
                                  updateLine(i, {
                                    productCode: p.code,
                                    productName: p.name,
                                    price: p.sellPrice,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 bg-gray-900 border-gray-600 text-white">
                                <SelectValue placeholder="اختر منتج" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                {products
                                  .filter((p: Product) => p.quantity > 0)
                                  .map((p: Product) => (
                                    <SelectItem key={p.id} value={p.code} className="hover:bg-gray-700 focus:bg-gray-700 text-white">
                                      {p.name} — متاح {p.quantity}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(i, { quantity: Number(e.target.value) || 0 })
                              }
                              className="h-9 bg-gray-900 border-gray-600 text-white text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={l.price}
                              onChange={(e) =>
                                updateLine(i, { price: Number(e.target.value) || 0 })
                              }
                              className="h-9 bg-gray-900 border-gray-600 text-white text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono text-blue-400">{fmtMoney(l.quantity * l.price, currency)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={addEmptyLine} variant="outline" className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  <Plus className="size-4 ml-2" />
                  إضافة صنف جديد
                </Button>
                <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg">
                  <span className="text-gray-300 font-bold">الإجمالي الكلي</span>
                  <span className="text-2xl font-bold text-blue-400 font-mono">{fmtMoney(total, currency)}</span>
                </div>
              </div>
              <DialogFooter className="p-5 border-t border-gray-700 flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  إلغاء
                </Button>
                <Button
                  onClick={() => createMut.mutate()}
                  disabled={!customer || lines.length === 0 || createMut.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMut.isPending ? "جاري الحفظ..." : "حفظ وطباعة الفاتورة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={getInvoiceColumns(currency, canEdit, setView, printInvoice, deleteMut, confirm)}
          data={invoices}
          searchKey="customerName"
          searchPlaceholder="بحث بالعميل أو رقم الفاتورة..."
          emptyMessage="لا توجد فواتير مسجلة بعد"
          isLoading={isInvoicesLoading}
        />
      </Card>
      
      <ConfirmationComponent isLoading={deleteMut.isPending} />

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-auto border-none bg-transparent" dir="rtl">
          {view && (
            <div className="bg-[#1a1c2c] rounded-2xl overflow-auto shadow-2xl border border-slate-700/50">
              {/* Premium Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
                
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="size-16 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl mb-2">
                    <span className="text-2xl font-black text-white">{settings.companyName?.substring(0, 2) || "SN"}</span>
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{settings.companyName || "اسم الشركة"}</h1>
                  <div className="flex items-center gap-2 text-blue-100/80 text-sm font-medium">
                    <span>{settings.companyAddress || "قطع غيار السيارات الأصلية"}</span>
                    {settings.companyPhone && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-blue-300/40"></span>
                        <span>{settings.companyPhone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Info Bar */}
              <div className="bg-slate-800/50 border-y border-slate-700/50 px-8 py-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">رقم الفاتورة</span>
                  <span className="text-lg font-mono font-bold text-white">#INV-{view.invoiceNumber}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">التاريخ</span>
                  <span className="text-md font-bold text-slate-200">{fmtDate(view.createdAt)}</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Customer & User Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">العميل</span>
                    <span className="text-white font-bold text-lg">{view.customerName}</span>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">الموظف</span>
                    <span className="text-white font-bold text-lg">{user?.username || 'النظام'}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-300">
                        <th className="text-right py-4 px-4 font-bold border-b border-slate-700">الصنف</th>
                        <th className="text-center py-4 px-4 font-bold border-b border-slate-700">الكمية</th>
                        <th className="text-right py-4 px-4 font-bold border-b border-slate-700">السعر</th>
                        <th className="text-right py-4 px-4 font-bold border-b border-slate-700">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {view.items.map((it, index) => (
                        <tr key={it.productCode} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-white font-medium">{it.productName}</td>
                          <td className="py-4 px-4 text-slate-300 text-center font-mono">{it.quantity}</td>
                          <td className="py-4 px-4 text-slate-300 text-right font-mono">{fmtMoney(it.price, currency)}</td>
                          <td className="py-4 px-4 text-blue-400 font-bold text-right font-mono">{fmtMoney(it.total, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div className="flex flex-col items-end gap-3 pt-4">
                  <div className="flex justify-between items-center w-full max-w-[280px] text-slate-400 text-sm">
                    <span>عدد الأصناف</span>
                    <span className="font-bold text-slate-200">{view.items.length}</span>
                  </div>
                  <div className="w-full max-w-[280px] h-[1px] bg-slate-700/50"></div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 w-full max-w-[280px] flex flex-col items-center gap-1 shadow-lg shadow-emerald-500/5">
                    <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">الإجمالي الكلي</span>
                    <span className="text-3xl font-black text-white font-mono">{fmtMoney(view.total, currency)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setView(null)}
                    className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white h-12 rounded-xl transition-all"
                  >
                    إغلاق المعاينة
                  </Button>
                  <Button 
                    onClick={() => printInvoice(view)} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <Printer className="size-5" />
                    طباعة الفاتورة
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
