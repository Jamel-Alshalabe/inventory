import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type Movement, type Product } from "@/lib/api";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
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
import { Plus, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

function getMovementColumns(
  type: "in" | "out",
  currency: string,
  canEdit: boolean,
  deleteMut: any,
  confirm: (options: { title: string; description: string; onConfirm: () => void }) => void
): ColumnDef<Movement>[] {
  return [
    {
      accessorKey: "productCode",
      header: "الكود",
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("productCode")}</div>
      ),
    },
    {
      accessorKey: "productName",
      header: "المنتج",
      cell: ({ row }) => (
        <div className="font-semibold">{row.getValue("productName")}</div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "الكمية",
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        return (
          <Badge
            className={
              type === "in"
                ? "bg-accent text-accent-foreground"
                : "bg-destructive text-destructive-foreground"
            }
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
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        return <div>{fmtMoney(price, currency)}</div>;
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
        const movement = row.original;
        
        if (!canEdit) return null;
        
        return (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              confirm({
                title: "حذف الحركة",
                description: `هل أنت متأكد من حذف حركة ${type === "in" ? "الوارد" : "الصادر"} للمنتج "${movement.productName}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
                onConfirm: () => deleteMut.mutate(movement.id),
              });
            }}
            data-testid={`button-delete-${movement.id}`}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        );
      },
    },
  ];
}

export default function MovementsPage({ type }: { type: "in" | "out" }) {
  const { selectedWarehouseId, user, settings } = useApp();
  
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const canEdit = user?.role === "admin" || user?.role === "user";
  const [open, setOpen] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", type, selectedWarehouseId],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (selectedWarehouseId) qs.set("warehouseId", String(selectedWarehouseId));
      qs.set("type", type);
      const url = `/api/movements?${qs.toString()}`;
      return customFetch<Movement[]>(url);
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedWarehouseId, ""],
    queryFn: () => {
      const url = selectedWarehouseId ? `/api/products?warehouseId=${selectedWarehouseId}` : '/api/products';
      return customFetch<Product[]>(url);
    },
    enabled: !!user && !!selectedWarehouseId,
    retry: 2,
    staleTime: 30000,
  });

  const createMut = useMutation({
    mutationFn: () => {
      // Find the selected product to get current quantity
      const selectedProduct = products.find(p => p.code === productCode);
      if (!selectedProduct) {
        throw new Error("المنتج المحدد غير موجود");
      }

      const movementQuantity = Number(quantity);
      const currentQuantity = selectedProduct.quantity;

      // Validate quantity for outbound movements
      if (type === "out" && movementQuantity > currentQuantity) {
        throw new Error(`الكمية المطلوبة (${movementQuantity}) أكبر من الكمية المتاحة (${currentQuantity})`);
      }

      return api.createMovement({
        type,
        productCode,
        quantity: movementQuantity,
        price: Number(price),
        warehouseId: selectedWarehouseId || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: `تم تسجيل ${type === "in" ? "الوارد" : "الصادر"}` });
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
    mutationFn: (id: number) => api.deleteMovement(id),
    onSuccess: () => {
      toast({ 
        title: "تم الحذف",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const totalQty = movements.reduce((s: number, m: Movement) => s + m.quantity, 0);
  const totalValue = movements.reduce((s: number, m: Movement) => s + m.total, 0);

  function onPickProduct(code: string) {
    setProductCode(code);
    const p = products.find((x: Product) => x.code === code);
    if (p) setPrice(String(type === "in" ? p.buyPrice : p.sellPrice));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{type === "in" ? "حركات الوارد" : "حركات الصادر"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {movements.length} حركة • {totalQty} قطعة • {fmtMoney(totalValue, currency)}
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-movement">
                <Plus className="size-4 ml-2" />
                {type === "in" ? "إضافة وارد" : "إضافة صادر"}
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>{type === "in" ? "إضافة وارد" : "إضافة صادر"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>المنتج</Label>
                  <Select value={productCode} onValueChange={onPickProduct}>
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: Product) => (
                        <SelectItem key={p.id} value={p.code}>
                          {p.name} ({p.code}) — متاح {p.quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الكمية</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      data-testid="input-qty"
                    />
                    {type === "out" && productCode && (
                      <p className="text-xs text-muted-foreground">
                        الكمية المتاحة: {products.find(p => p.code === productCode)?.quantity || 0}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>السعر</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
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
                  onClick={() => createMut.mutate()}
                  disabled={!productCode || createMut.isPending}
                  data-testid="button-save"
                >
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-5">
        <DataTable
          columns={getMovementColumns(type, currency, canEdit, deleteMut, confirm)}
          data={movements}
          searchKey="productName"
          searchPlaceholder="بحث بالاسم أو الكود..."
          emptyMessage="لا توجد حركات"
        />
      </Card>
      
      <ConfirmationComponent isLoading={deleteMut.isPending} />
    </div>
  );
}
