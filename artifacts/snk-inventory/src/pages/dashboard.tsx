import { useQuery } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type DashboardStats } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Package,
  DollarSign,
  FileText,
  TrendingUp,
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
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
    primary: "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30",
    accent: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
    destructive: "bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-400 border-red-500/30",
    warning: "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30",
  }[tone];
  return (
    <Card className="p-5 bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] border border-slate-700/50 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-400 tracking-wide uppercase">{label}</div>
          <div className="text-2xl font-bold mt-2 truncate text-white group-hover:text-blue-100 transition-colors" data-testid={`stat-${label}`}>
            {value}
          </div>
        </div>
        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 border ${toneClass} shadow-lg`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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
    <div className="space-y-6" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)", minHeight: "100vh"}}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm mt-1">نظرة عامة على نشاط المخزون</p>
        </div>
       
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي المنتجات" value={String(data.totalProducts)} icon={Package} />
        <StatCard
          label="إجمالي المخزون"
          value={fmtMoney(data.stockValue, currency)}
          icon={DollarSign}
          tone="accent"
        />
        <StatCard
          label="إجمالي المبيعات"
          value={fmtMoney(data.totalSales, currency)}
          icon={FileText}
          tone="accent"
        />
        <StatCard
          label="الأرباح"
          value={fmtMoney(Math.max(0, data.totalSales - data.stockValue), currency)}
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] border border-slate-700/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
            <h2 className="font-bold text-lg text-white">تحليل الحركات</h2>
            <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full w-fit">هذا الشهر</div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-6 mb-4">
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <span className="text-sm text-slate-300">وارد</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-sm text-slate-300">صادر</span>
              </div>
            </div>
          </div>

          {data.dailyMovements && data.dailyMovements.length > 0 ? (
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.dailyMovements}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                    tickFormatter={(value: number) => value.toFixed(1)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    cursor={{ fill: "#1e293b", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="in"
                    name="وارد"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="out"
                    name="صادر"
                    fill="#fbbf24"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { date: "أبريل 16", in: 0, out: 0 },
                    { date: "أبريل 17", in: 0, out: 0 },
                    { date: "أبريل 18", in: 0, out: 0 },
                    { date: "أبريل 19", in: 0, out: 0 },
                    { date: "أبريل 20", in: 0, out: 0 },
                    { date: "أبريل 21", in: 0, out: 0 },
                    { date: "أبريل 22", in: 0, out: 0 },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                    tickFormatter={(value: number) => value.toFixed(1)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    cursor={{ fill: "#1e293b", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="in"
                    name="وارد"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="out"
                    name="صادر"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="bg-[#16162b] rounded-xl border border-slate-700/50 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-white mb-4">آخر الحركات (تفصيلي)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1a2e] text-slate-300">
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">التاريخ</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">النوع</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">المنتج</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">الكمية</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">السعر</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-slate-400 text-sm text-center py-4">لا توجد حركات بعد</td>
                  </tr>
                ) : (
                  data.recentMovements.map((m) => (
                    <tr key={m.id} className="border-t border-slate-700/50">
                      <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span className={
                          m.type === "in"
                            ? "px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400"
                            : "px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-400"
                        }>
                          {m.type === "in" ? "وارد" : "صادر"}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-white whitespace-nowrap">{m.productName}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-400 whitespace-nowrap">{m.quantity}</td>
                      <td className="px-3 sm:px-4 py-3 text-slate-400 whitespace-nowrap">{fmtMoney(m.price, currency)}</td>
                      <td className="px-3 sm:px-4 py-3 text-white font-mono font-bold whitespace-nowrap">{fmtMoney(m.total, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-slate-400 text-sm text-center py-4 hidden">لا توجد حركات بعد</p>
      </div>
    </div>
  );
}
