import { useQuery } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type DashboardStats } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Boxes,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: "primary" | "accent" | "destructive" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/20 text-accent",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-chart-3/20 text-chart-3",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1 truncate" data-testid={`stat-${label}`}>
            {value}
          </div>
        </div>
        <div className={`size-11 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { selectedWarehouseId, settings } = useApp();
  const currency = settings.currency || "ج.م";
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", selectedWarehouseId],
    queryFn: () => api.get<DashboardStats>(`/dashboard${warehouseQuery(selectedWarehouseId)}`),
  });

  if (isLoading || !data) {
    return <div className="text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على نشاط المخزن</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي المنتجات" value={String(data.totalProducts)} icon={Package} />
        <StatCard
          label="قيمة المخزون"
          value={fmtMoney(data.stockValue, currency)}
          icon={DollarSign}
          tone="accent"
        />
        <StatCard label="عدد القطع" value={String(data.totalQuantity)} icon={Boxes} />
        <StatCard label="إجمالي المبيعات" value={fmtMoney(data.totalSales, currency)} icon={FileText} tone="accent" />
        <StatCard
          label="منتجات منخفضة"
          value={String(data.lowStock)}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="نفد المخزون"
          value={String(data.outOfStock)}
          icon={XCircle}
          tone="destructive"
        />
        <StatCard
          label="وارد اليوم"
          value={fmtMoney(data.todayIn, currency)}
          icon={TrendingDown}
          tone="accent"
        />
        <StatCard
          label="صادر اليوم"
          value={fmtMoney(data.todayOut, currency)}
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold mb-4">أكثر المنتجات مبيعاً</h2>
          {data.topProducts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="productName"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-bold mb-4">آخر الحركات</h2>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {data.recentMovements.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">لا توجد حركات</div>
            ) : (
              data.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{m.productName}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(m.createdAt)}</div>
                  </div>
                  <Badge
                    variant={m.type === "in" ? "default" : "destructive"}
                    className={m.type === "in" ? "bg-accent text-accent-foreground" : ""}
                  >
                    {m.type === "in" ? `+${m.quantity}` : `-${m.quantity}`}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-bold mb-4">آخر الحركات (تفصيلي)</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recentMovements.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Badge
                    className={
                      m.type === "in"
                        ? "bg-accent text-accent-foreground"
                        : "bg-destructive text-destructive-foreground"
                    }
                  >
                    {m.type === "in" ? "وارد" : "صادر"}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">{m.productName}</TableCell>
                <TableCell>{m.quantity}</TableCell>
                <TableCell>{fmtMoney(m.price, currency)}</TableCell>
                <TableCell>{fmtMoney(m.total, currency)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmtDate(m.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
