import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type Movement, type Product } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Filter, Printer } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

type MovementType = "in" | "out" | "all";
type FormMovementType = "in" | "out";

function getStockMovementColumns(
  currency: string,
  canEdit: boolean,
  deleteMut: any,
  confirm: (options: { title: string; description: string; onConfirm: () => void }) => void
): ColumnDef<Movement>[] {
  return [
    {
      accessorKey: "productName",
      header: "المنتج",
      cell: ({ row }) => (
        <div className="font-semibold truncate max-w-[100px] sm:max-w-[200px]" title={row.getValue("productName")}>{row.getValue("productName")}</div>
      ),
    },
    {
      accessorKey: "productCode",
      header: "الكود",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("productCode")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "النوع",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const type = row.getValue("type") as "in" | "out";
        return (
          <Badge
            className={`text-xs sm:text-sm ${
              type === "in"
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-orange-100 text-orange-800 border-orange-200"
            }`}
          >
            {type === "in" ? "وارد" : "صادر"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: "الكمية",
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        const type = row.getValue("type") as "in" | "out";
        return (
          <Badge
            className={`text-xs sm:text-sm ${
              type === "in"
                ? "bg-accent text-accent-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {type === "in" ? "+" : "-"}
            {quantity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "price",
      header: "السعر",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        return <div className="text-xs sm:text-sm">{fmtMoney(price, currency)}</div>;
      },
    },
    {
      accessorKey: "total",
      header: "الإجمالي",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const total = parseFloat(row.getValue("total"));
        return <div className="font-semibold text-xs sm:text-sm">{fmtMoney(total, currency)}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "التاريخ",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <div className="text-muted-foreground text-xs">{fmtDate(row.getValue("createdAt"))}</div>
      ),
    },
    {
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) => {
        const movement = row.original;
        const type = movement.type as "in" | "out";
        
        if (!canEdit) return null;
        
        return (
          <Button
            size="icon"
            variant="ghost"
            className="size-8 sm:size-9"
            onClick={() => {
              confirm({
                title: "حذف الحركة",
                description: `هل أنت متأكد من حذف حركة ${type === "in" ? "الوارد" : "الصادر"} للمنتج "${movement.productName}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
                onConfirm: () => deleteMut.mutate(movement.id),
              });
            }}
            data-testid={`button-delete-${movement.id}`}
          >
            <Trash2 className="size-3.5 sm:size-4" />
          </Button>
        );
      },
    },
  ];
}

export default function StockMovementsPage() {
  const { selectedWarehouseId, user, settings } = useApp();
  
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const canEdit = user?.role === "admin" || user?.role === "user";

  const [open, setOpen] = useState(false);
  const [movementType, setMovementType] = useState<FormMovementType>("in");
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [filter, setFilter] = useState<MovementType>("all");

  const { data: movementsResponse = [], isLoading: movementsLoading, error: movementsError } = useQuery({
    queryKey: ["movements", "all", selectedWarehouseId],
    queryFn: () => {
     
      const params = selectedWarehouseId ? { warehouseId: selectedWarehouseId } : undefined;
      return api.listMovements(params);
    },
  });

  useEffect(() => {
    if (movementsResponse && typeof movementsResponse === 'object') {
      if ('data' in movementsResponse) {
      }
    }
  }, [movementsResponse]);

  useEffect(() => {
    if (movementsError) {
    }
  }, [movementsError]);

  // Extract movements array from response
  const movements = Array.isArray(movementsResponse) ? movementsResponse : (movementsResponse?.data || []);
  
 
  const { data: productsResponse = [] } = useQuery({
    queryKey: ["products", selectedWarehouseId, ""],
    queryFn: () => {
    
      const url = `/products${warehouseQuery(selectedWarehouseId)}`;
      return api.listProducts(selectedWarehouseId ? { warehouseId: selectedWarehouseId } : undefined);
    },
    enabled: !!selectedWarehouseId,
    retry: 2,
    staleTime: 30000,
  });

  // Extract products array from response
  const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse?.data || []);

  const createMut = useMutation({
    mutationFn: () => {
    
      
      const payload = {
        type: movementType,
        productCode,
        quantity: Number(quantity),
        price: Number(price),
        warehouseId: selectedWarehouseId,
      };
      
      
      return api.createMovement(payload);
    },
    onSuccess: () => {
      toast({ title: `تم تسجيل ${movementType === "in" ? "الوارد" : "الصادر"}` });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setProductCode("");
      setQuantity("1");
      setPrice("0");
    },
    onError: (e: Error) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => {
      return api.deleteMovement(id);
    },
    onSuccess: () => {
      toast({ title: "تم حذف الحركة وتحديث كمية المنتج" });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  // Filter movements based on selected filter
  const filteredMovements = movements.filter((movement) => {
    if (filter === "all") return true;
    return movement.type === filter;
  });

  // Calculate totals
  const totalQty = filteredMovements.reduce((s, m) => s + m.quantity, 0);
  const totalValue = filteredMovements.reduce((s, m) => s + m.total, 0);
  const inQty = filteredMovements.filter(m => m.type === "in").reduce((s, m) => s + m.quantity, 0);
  const outQty = filteredMovements.filter(m => m.type === "out").reduce((s, m) => s + m.quantity, 0);

  function onPickProduct(code: string) {
    setProductCode(code);
    const p = products.find((x) => x.code === code);
    if (p) setPrice(String(movementType === "in" ? p.buyPrice : p.sellPrice));
  }

  function openAddMovement() {
    setMovementType("in");
    setProductCode("");
    setQuantity("1");
    setPrice("0");
    setOpen(true);
  }

  function onMovementTypeChange(type: FormMovementType) {
    setMovementType(type);
    // Update price if product is selected
    if (productCode) {
      const p = products.find((x) => x.code === productCode);
      if (p) setPrice(String(type === "in" ? p.buyPrice : p.sellPrice));
    }
  }

  function printStockMovements() {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    
    const movementsHtml = filteredMovements
      .map(
        (movement) =>
          `<tr>
            <td class="item-name">${movement.productName}</td>
            <td class="item-code">${movement.productCode}</td>
            <td class="item-type">
              <span class="badge ${movement.type === 'in' ? 'badge-in' : 'badge-out'}">
                ${movement.type === 'in' ? 'وارد' : 'صادر'}
              </span>
            </td>
            <td class="item-qty">${movement.quantity}</td>
            <td class="item-price">${fmtMoney(movement.price, currency)}</td>
            <td class="item-total">${fmtMoney(movement.total, currency)}</td>
            <td class="item-date">${fmtDate(movement.createdAt)}</td>
          </tr>`,
      )
      .join("");
    
    const printDateTime = new Date().toLocaleString("ar-EG");
    const filterText = filter === "all" ? "جميع الحركات" : filter === "in" ? "الوارد فقط" : "الصادر فقط";
    
    w.document.write(`
      <html dir="rtl"><head><title>تقرير حركة المخزون</title>
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
          max-width: 900px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .report-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .report-header h1 {
          margin: 0 0 5px 0;
          font-size: 28px;
          font-weight: 700;
        }
        
        .report-header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .report-summary {
          padding: 20px 30px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .summary-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
          font-weight: 600;
        }
        
        .summary-value {
          font-size: 18px;
          color: #000;
          font-weight: 700;
        }
        
        .filter-info {
          text-align: center;
          margin-top: 15px;
          padding: 10px;
          background: #e3f2fd;
          border-radius: 6px;
          font-size: 13px;
          color: #1565c0;
        }
        
        .movements-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        
        .movements-table th {
          background: #495057;
          color: white;
          font-weight: 600;
          text-align: right;
          padding: 12px 10px;
          font-size: 12px;
          border: none;
        }
        
        .movements-table td {
          padding: 10px;
          text-align: right;
          border-bottom: 1px solid #dee2e6;
          font-size: 12px;
        }
        
        .movements-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .item-code, .item-qty, .item-price, .item-total {
          text-align: center !important;
          font-family: monospace;
        }
        
        .item-type {
          text-align: center !important;
        }
        
        .badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .badge-in {
          background: #d4edda;
          color: #155724;
        }
        
        .badge-out {
          background: #f8d7da;
          color: #721c24;
        }
        
        .item-total {
          font-weight: 600;
        }
        
        .report-footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        
        .report-footer p {
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
          .movements-table th { font-size: 10px; padding: 8px 6px; }
          .movements-table td { font-size: 10px; padding: 6px; }
        }
      </style></head><body>
      <div class="page">
        <div class="report-header">
          <h1>${settings.companyName ?? "شركة سنك"}</h1>
          <p>تقرير حركة المخزون</p>
          <div class="contact">
            ${settings.companyAddress ? `<p>${settings.companyAddress}</p>` : ''}
            ${settings.companyPhone ? `<p>${settings.companyPhone}</p>` : ''}
          </div>
        </div>
        
        <div class="report-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">إجمالي الحركات</div>
              <div class="summary-value">${filteredMovements.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">الوارد</div>
              <div class="summary-value" style="color: #28a745;">${inQty}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">الصادر</div>
              <div class="summary-value" style="color: #dc3545;">${outQty}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">القيمة الإجمالية</div>
              <div class="summary-value" style="color: #007bff;">${fmtMoney(totalValue, currency)}</div>
            </div>
          </div>
          <div class="filter-info">
            التقرير يشمل: ${filterText}
          </div>
        </div>
        
        <table class="movements-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th class="item-code">الكود</th>
              <th class="item-type">النوع</th>
              <th class="item-qty">الكمية</th>
              <th class="item-price">السعر</th>
              <th class="item-total">الإجمالي</th>
              <th class="item-date">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${movementsHtml}
          </tbody>
        </table>
        
        <div class="report-footer">
          <p>تم طباعة هذا التقرير من نظام إدارة المخزون</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">حركة المخزون</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {filteredMovements.length} حركة • وارد {inQty} • صادر {outQty}
            <span className="hidden sm:inline"> • {fmtMoney(totalValue, currency)}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(value: MovementType) => setFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="in">الوارد</SelectItem>
                <SelectItem value="out">الصادر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
         
          
          {canEdit && (
            <Button onClick={openAddMovement} className="text-sm">
              <Plus className="size-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">إضافة حركة</span>
              <span className="sm:hidden">إضافة</span>
            </Button>
          )}
        </div>
      </div>

      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة حركة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الحركة</Label>
                  <Select value={movementType} onValueChange={onMovementTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          وارد
                        </div>
                      </SelectItem>
                      <SelectItem value="out">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          صادر
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المنتج</Label>
                  <Select value={productCode} onValueChange={onPickProduct}>
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.code}>
                          {p.name} ({p.code}) — متاح {p.quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    data-testid="input-qty"
                  />
                </div>
                <div className="space-y-2">
                  <Label>السعر</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    data-testid="input-price"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                الإجمالي: {fmtMoney(Number(quantity) * Number(price) || 0, currency)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  createMut.mutate();
                }}
                disabled={!productCode || createMut.isPending}
                data-testid="button-save"
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card className="p-3 sm:p-5">
        {movementsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">جاري تحميل الحركات...</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={getStockMovementColumns(currency, canEdit, deleteMut, confirm)}
            data={filteredMovements}
            searchKey="productName"
            searchPlaceholder="بحث بالاسم أو الكود..."
            emptyMessage="لا توجد حركات"
          />
        )}
      </Card>
      
      <ConfirmationComponent isLoading={deleteMut.isPending} />
    </div>
  );
}
