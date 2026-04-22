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
import { DataTable } from "@/components/ui/data-table";
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
        }
        
        .invoice-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .invoice-header h1 {
          margin: 0 0 5px 0;
          font-size: 28px;
          font-weight: 700;
        }
        
        .invoice-header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .invoice-details {
          padding: 20px 30px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 15px;
        }
        
        .detail-row:last-child {
          margin-bottom: 0;
        }
        
        .detail-item {
          flex: 1;
        }
        
        .detail-item-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 4px;
          font-weight: 600;
        }
        
        .detail-item-value {
          font-size: 14px;
          color: #000;
          font-weight: 600;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        
        .items-table th {
          background: #495057;
          color: white;
          font-weight: 600;
          text-align: right;
          padding: 12px 15px;
          font-size: 13px;
          border: none;
        }
        
        .items-table td {
          padding: 10px 15px;
          text-align: right;
          border-bottom: 1px solid #dee2e6;
          font-size: 13px;
        }
        
        .items-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .item-qty, .item-price, .item-total {
          text-align: center !important;
          font-family: monospace;
        }
        
        .item-total {
          font-weight: 600;
        }
        
        .spacer {
          height: 20px;
        }
        
        .total-box {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 25px 30px;
          text-align: center;
        }
        
        .total-label {
          font-size: 16px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .total-amount {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          font-family: monospace;
        }
        
        .total-note {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .invoice-footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        
        .invoice-footer p {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #6c757d;
        }
        
        .footer-small {
          font-size: 10px !important;
          color: #adb5bd !important;
        }
        
        @media print {
          body { margin: 0; padding: 10px; }
          .page { border: none; box-shadow: none; }
        }
      </style></head><body>
      <div class="page">
        <div class="invoice-header">
          <h1>${settings.companyName ?? "شركة سنك"}</h1>
          <p>قطع غيار السيارات الأصلية</p>
          <div class="contact">
            ${settings.companyAddress ? `<p>${settings.companyAddress}</p>` : ''}
            ${settings.companyPhone ? `<p>${settings.companyPhone}</p>` : ''}
          </div>
        </div>
        
        <div class="invoice-details">
          <div class="detail-row">
            <div class="detail-item">
              <div class="detail-item-label">رقم الفاتورة</div>
              <div class="detail-item-value" style="font-family:monospace">INV-${inv.invoiceNumber}</div>
            </div>
            <div class="detail-item">
              <div class="detail-item-label">التاريخ</div>
              <div class="detail-item-value">${formattedDate}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-item">
              <div class="detail-item-label">العميل</div>
              <div class="detail-item-value">${inv.customerName}</div>
            </div>
            <div class="detail-item">
              <div class="detail-item-label">المستخدم</div>
              <div class="detail-item-value">${user?.username || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th class="item-qty">الكمية</th>
              <th class="item-price">السعر</th>
              <th class="item-total">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="spacer"></div>
        
        <div class="total-box">
          <div class="total-label">الإجمالي الكلي</div>
          <div class="total-amount">${fmtMoney(inv.total, currency)}</div>
          <div class="total-note">✓ شكراً لتعاملكم معنا</div>
        </div>
        
        <div class="invoice-footer">
          <p>تم طباعة هذه الفاتورة من نظام إدارة المخزون</p>
          <p class="footer-small">${printDateTime} | جميع الحقوق محفوظة © ${settings.companyName ?? "شركة سنك"}</p>
        </div>
      </div>
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
        <DataTable
          columns={getInvoiceColumns(currency, canEdit, setView, printInvoice, deleteMut, confirm)}
          data={invoices}
          searchKey="customerName"
          searchPlaceholder="بحث بالعميل أو رقم الفاتورة..."
          emptyMessage="لا توجد فواتير"
        />
      </Card>
      
      <ConfirmationComponent isLoading={deleteMut.isPending} />

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
          {view && (
            <div className="bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] rounded-xl p-8 space-y-6">
              {/* Header */}
              <div className="text-center border-b border-slate-700/50 pb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="size-16 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                    سنك
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">شركة سنك</h1>
                    <p className="text-slate-400 text-sm">نظام إدارة المخزون</p>
                  </div>
                </div>
                <div className="text-slate-300 text-sm space-y-1">
                  <div>التاريخ: {fmtDate(view.createdAt)}</div>
                  <div>رقم الفاتورة: #{view.invoiceNumber}</div>
                  <div>العميل: {view.customerName}</div>
                  <div>المستخدم: {user?.username || 'N/A'}</div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="bg-slate-800/30 rounded-lg p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">المنتج</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">الكمية</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">السعر</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.items.map((it, index) => (
                      <tr key={it.productCode} className={index % 2 === 0 ? 'bg-slate-900/20' : ''}>
                        <td className="py-3 px-2 text-white">{it.productName}</td>
                        <td className="py-3 px-2 text-slate-300 text-center">{it.quantity}</td>
                        <td className="py-3 px-2 text-slate-300 text-right">{fmtMoney(it.price, currency)}</td>
                        <td className="py-3 px-2 text-white font-semibold text-right">{fmtMoney(it.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="border-t border-slate-700/50 pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-white">الإجمالي الكلي</span>
                  <span className="text-blue-400">{fmtMoney(view.total, currency)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setView(null)}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  إغلاق
                </Button>
                <Button 
                  onClick={() => printInvoice(view)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="size-4 ml-2" />
                  طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
