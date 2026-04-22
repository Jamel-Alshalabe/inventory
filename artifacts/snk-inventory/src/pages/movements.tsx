import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";

export default function MovementsPage({ type }: { type: "in" | "out" }) {
  const { selectedWarehouseId, user, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const { toast } = useToast();
  const qc = useQueryClient();
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
      return api.get<Movement[]>(`/movements?${qs.toString()}`);
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedWarehouseId, ""],
    queryFn: () => api.get<Product[]>(`/products${warehouseQuery(selectedWarehouseId)}`),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api.post<Movement>("/movements", {
        type,
        productCode,
        quantity: Number(quantity),
        price: Number(price),
        warehouseId: selectedWarehouseId,
      }),
    onSuccess: () => {
      toast({ title: type === "in" ? "تم تسجيل الوارد" : "تم تسجيل الصادر" });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setProductCode("");
      setQuantity("1");
      setPrice("0");
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/movements/${id}`),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const totalQty = movements.reduce((s, m) => s + m.quantity, 0);
  const totalValue = movements.reduce((s, m) => s + m.total, 0);

  function onPickProduct(code: string) {
    setProductCode(code);
    const p = products.find((x) => x.code === code);
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
                      {products.map((p) => (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>التاريخ</TableHead>
              {canEdit && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-12">
                  لا توجد حركات
                </TableCell>
              </TableRow>
            )}
            {movements.map((m) => (
              <TableRow key={m.id} data-testid={`row-movement-${m.id}`}>
                <TableCell className="font-mono text-xs">{m.productCode}</TableCell>
                <TableCell className="font-semibold">{m.productName}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      type === "in"
                        ? "bg-accent text-accent-foreground"
                        : "bg-destructive text-destructive-foreground"
                    }
                  >
                    {type === "in" ? "+" : "-"}
                    {m.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{fmtMoney(m.price, currency)}</TableCell>
                <TableCell className="font-semibold">{fmtMoney(m.total, currency)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmtDate(m.createdAt)}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("حذف هذه الحركة؟")) deleteMut.mutate(m.id);
                      }}
                      data-testid={`button-delete-${m.id}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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
