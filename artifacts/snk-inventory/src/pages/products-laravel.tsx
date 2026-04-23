import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useApp, warehouseQuery } from "@/lib/app-context-laravel";
import { apiClient, fmtMoney, type Product } from "@/lib/api-client";
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
import { DataTable } from "@/components/ui/data-table";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileSpreadsheet, Download, Search } from "lucide-react";
// import { ColumnDef } from "@tanstack/react-table";

type FormState = {
  name: string;
  code: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
};

const empty: FormState = { name: "", code: "", buyPrice: "0", sellPrice: "0", quantity: "0" };

function getColumns(
  user: any,
  openEdit: (product: Product) => void,
  deleteMut: any,
  confirm: (options: { title: string; description: string; onConfirm: () => void }) => void
): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "code",
      header: "الكود",
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "الاسم",
      cell: ({ row }) => (
        <div className="font-medium truncate max-w-[200px]" title={row.getValue("name")}>
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "الكمية",
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        return (
          <Badge variant={quantity <= 10 ? "destructive" : quantity <= 50 ? "warning" : "default"}>
            {quantity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "buyPrice",
      header: "سعر الشراء",
      cell: ({ row }) => (
        <div className="text-sm">{fmtMoney(row.getValue("buyPrice") as number)}</div>
      ),
    },
    {
      accessorKey: "sellPrice",
      header: "سعر البيع",
      cell: ({ row }) => (
        <div className="text-sm font-medium">{fmtMoney(row.getValue("sellPrice") as number)}</div>
      ),
    },
    {
      accessorKey: "warehouseName",
      header: "المخزن",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{row.getValue("warehouseName") || "-"}</div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-2">
            {(user.role === "admin" || user.role === "user") && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openEdit(product)}
                data-testid={`edit-${product.id}`}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {(user.role === "admin" || user.role === "user") && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  confirm({
                    title: "حذف المنتج",
                    description: `هل أنت متأكد من حذف "${product.name}"؟`,
                    onConfirm: () => deleteMut.mutate(product.id),
                  })
                }
                data-testid={`delete-${product.id}`}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

export default function ProductsPage() {
  const { user, selectedWarehouseId } = useApp();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<FormState>(empty);
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState<FormState>(empty);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products", selectedWarehouseId],
    queryFn: () => apiClient.getProducts(selectedWarehouseId || undefined),
    retry: 2,
    staleTime: 30000,
  });

  const createMut = useMutation({
    mutationFn: (data: Omit<Product, "id" | "createdAt" | "warehouseName">) => apiClient.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setCreateOpen(false);
      setCreate(empty);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => apiClient.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditOpen(false);
      setEdit(empty);
    },
  });

  const deleteMut = useMutation({
    mutationFn: apiClient.deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const confirm = useConfirmation();

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.code.toLowerCase().includes(s)
    );
  }, [data, search]);

  const columns = useMemo(
    () => getColumns(user, setEditOpen.bind(null, true), deleteMut, confirm),
    [user, deleteMut, confirm]
  );

  const handleCreate = () => {
    createMut.mutate({
      name: create.name.trim(),
      code: create.code.trim(),
      buyPrice: Number(create.buyPrice),
      sellPrice: Number(create.sellPrice),
      quantity: Number(create.quantity),
      warehouseId: selectedWarehouseId || undefined,
    });
  };

  const handleUpdate = () => {
    const id = (edit as any).id;
    updateMut.mutate({
      id,
      data: {
        name: edit.name.trim(),
        code: edit.code.trim(),
        buyPrice: Number(edit.buyPrice),
        sellPrice: Number(edit.sellPrice),
        quantity: Number(edit.quantity),
        warehouseId: selectedWarehouseId || undefined,
      },
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

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
                    <Button onClick={handleCreate} disabled={createMut.isLoading}>
                      {createMut.isLoading && <div className="size-4 animate-spin ml-2" />}
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
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
        />
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
            <Button onClick={handleUpdate} disabled={updateMut.isLoading}>
              {updateMut.isLoading && <div className="size-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
