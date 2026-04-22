import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Printer } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
} from "recharts";

type Sales = {
  totalRevenue: number;
  totalQuantity: number;
  totalTransactions: number;
  byDay: { date: string; revenue: number; quantity: number }[];
  items: { id: number; productName: string; productCode: string; quantity: number; price: number; total: number; createdAt: string }[];
};

type Stock = {
  totalProducts: number;
  totalValue: number;
  totalCost: number;
  estimatedProfit: number;
  items: { id: number; name: string; code: string; quantity: number; buyPrice: number; sellPrice: number; stockValue: number }[];
};

type Profit = {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  items: { id: number; productName: string; quantity: number; total: number; cost: number; profit: number; createdAt: string }[];
};

function exportXlsx(name: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name);
  XLSX.writeFile(wb, `${name}-${Date.now()}.xlsx`);
}

function printSection(title: string, html: string) {
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) return;
  w.document.write(`<html dir="rtl"><head><title>${title}</title>
    <style>body{font-family:'Noto Kufi Arabic','Tahoma',sans-serif;padding:24px;color:#000;}
    h1{margin:0 0 12px;}table{width:100%;border-collapse:collapse;margin-top:12px;}
    th,td{border:1px solid #999;padding:6px;text-align:right;font-size:13px;}th{background:#eee;}
    .stats{display:flex;gap:16px;margin:12px 0;flex-wrap:wrap;}
    .stat{border:1px solid #ccc;padding:8px 12px;border-radius:6px;}
    </style></head><body><h1>${title}</h1>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
}

export default function ReportsPage() {
  const { selectedWarehouseId, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const dateQuery = () => {
    const qs = new URLSearchParams();
    if (selectedWarehouseId) qs.set("warehouseId", String(selectedWarehouseId));
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) qs.set("to", new Date(`${to}T23:59:59`).toISOString());
    return qs.toString() ? `?${qs.toString()}` : "";
  };

  const sales = useQuery({
    queryKey: ["report-sales", selectedWarehouseId, from, to],
    queryFn: () => api.get<Sales>(`/reports/sales${dateQuery()}`),
  });
  const stock = useQuery({
    queryKey: ["report-stock", selectedWarehouseId],
    queryFn: () => api.get<Stock>(`/reports/stock${warehouseQuery(selectedWarehouseId)}`),
  });
  const profit = useQuery({
    queryKey: ["report-profit", selectedWarehouseId, from, to],
    queryFn: () => api.get<Profit>(`/reports/profit${dateQuery()}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">التقارير</h1>
        <p className="text-muted-foreground text-sm mt-1">تحليل المبيعات والمخزون والأرباح</p>
      </div>

      <Card className="p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">من</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            مسح
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
          <TabsTrigger value="stock">المخزون</TabsTrigger>
          <TabsTrigger value="profit">الأرباح</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {sales.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
                  <div className="text-2xl font-bold mt-1">
                    {fmtMoney(sales.data.totalRevenue, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">عدد القطع المباعة</div>
                  <div className="text-2xl font-bold mt-1">{sales.data.totalQuantity}</div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">عدد المعاملات</div>
                  <div className="text-2xl font-bold mt-1">{sales.data.totalTransactions}</div>
                </Card>
              </div>
              {sales.data.byDay.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-bold mb-3">المبيعات اليومية</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={sales.data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportXlsx(
                      "تقرير-المبيعات",
                      sales.data!.items.map((i) => ({
                        التاريخ: fmtDate(i.createdAt),
                        المنتج: i.productName,
                        الكود: i.productCode,
                        الكمية: i.quantity,
                        السعر: i.price,
                        الإجمالي: i.total,
                      })),
                    )
                  }
                >
                  <Download className="size-4 ml-2" />
                  تصدير إكسل
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const head = `<div class="stats">
                      <div class="stat">إجمالي المبيعات: ${fmtMoney(sales.data!.totalRevenue, currency)}</div>
                      <div class="stat">القطع: ${sales.data!.totalQuantity}</div>
                      <div class="stat">المعاملات: ${sales.data!.totalTransactions}</div></div>`;
                    const tbl = `<table><thead><tr><th>التاريخ</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${sales.data!.items
                      .map(
                        (i) =>
                          `<tr><td>${fmtDate(i.createdAt)}</td><td>${i.productName}</td><td>${i.quantity}</td><td>${i.price.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`,
                      )
                      .join("")}</tbody></table>`;
                    printSection("تقرير المبيعات", head + tbl);
                  }}
                >
                  <Printer className="size-4 ml-2" />
                  طباعة
                </Button>
              </div>
              <Card className="p-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.data.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(i.createdAt)}
                        </TableCell>
                        <TableCell>{i.productName}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{fmtMoney(i.price, currency)}</TableCell>
                        <TableCell className="font-semibold">{fmtMoney(i.total, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          {stock.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">المنتجات</div>
                  <div className="text-2xl font-bold mt-1">{stock.data.totalProducts}</div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">قيمة المخزون (بيع)</div>
                  <div className="text-2xl font-bold mt-1">
                    {fmtMoney(stock.data.totalValue, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">قيمة المخزون (شراء)</div>
                  <div className="text-2xl font-bold mt-1">
                    {fmtMoney(stock.data.totalCost, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">ربح متوقع</div>
                  <div className="text-2xl font-bold mt-1 text-accent">
                    {fmtMoney(stock.data.estimatedProfit, currency)}
                  </div>
                </Card>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportXlsx(
                      "تقرير-المخزون",
                      stock.data!.items.map((i) => ({
                        الكود: i.code,
                        الاسم: i.name,
                        الكمية: i.quantity,
                        "سعر الشراء": i.buyPrice,
                        "سعر البيع": i.sellPrice,
                        "قيمة المخزون": i.stockValue,
                      })),
                    )
                  }
                >
                  <Download className="size-4 ml-2" />
                  تصدير إكسل
                </Button>
              </div>
              <Card className="p-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>سعر البيع</TableHead>
                      <TableHead>القيمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.data.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.code}</TableCell>
                        <TableCell>{i.name}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{fmtMoney(i.sellPrice, currency)}</TableCell>
                        <TableCell className="font-semibold">
                          {fmtMoney(i.stockValue, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          {profit.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">الإيرادات</div>
                  <div className="text-2xl font-bold mt-1">
                    {fmtMoney(profit.data.revenue, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">التكلفة</div>
                  <div className="text-2xl font-bold mt-1">
                    {fmtMoney(profit.data.cost, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">صافي الربح</div>
                  <div className="text-2xl font-bold mt-1 text-accent">
                    {fmtMoney(profit.data.profit, currency)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs text-muted-foreground">هامش الربح</div>
                  <div className="text-2xl font-bold mt-1">{profit.data.margin.toFixed(1)}%</div>
                </Card>
              </div>
              {profit.data.items.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-bold mb-3">الأرباح حسب المنتج (أعلى 10)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={[...profit.data.items]
                        .sort((a, b) => b.profit - a.profit)
                        .slice(0, 10)}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="productName"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Bar dataKey="profit" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <Card className="p-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>الإيراد</TableHead>
                      <TableHead>التكلفة</TableHead>
                      <TableHead>الربح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profit.data.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(i.createdAt)}
                        </TableCell>
                        <TableCell>{i.productName}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{fmtMoney(i.total, currency)}</TableCell>
                        <TableCell>{fmtMoney(i.cost, currency)}</TableCell>
                        <TableCell className="font-semibold text-accent">
                          {fmtMoney(i.profit, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
