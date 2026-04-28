import { useQuery } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney } from "@/services/api/api";
import { dashboardService } from "@/services/dashboard-service";
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
  TrendingUp as ProfitIcon,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  description,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "primary" | "accent" | "destructive" | "warning" | "info" | "purple";
  description?: string;
}) {
  const tones = {
    primary: "from-blue-600/20 to-blue-900/10 text-blue-400 border-blue-500/20 shadow-blue-500/5",
    accent: "from-emerald-600/20 to-emerald-900/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    destructive: "from-red-600/20 to-red-900/10 text-red-400 border-red-500/20 shadow-red-500/5",
    warning: "from-amber-600/20 to-amber-900/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
    info: "from-cyan-600/20 to-cyan-900/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/5",
    purple: "from-purple-600/20 to-purple-900/10 text-purple-400 border-purple-500/20 shadow-purple-500/5",
  };

  const iconColors = {
    primary: "text-blue-400",
    accent: "text-emerald-400",
    destructive: "text-red-400",
    warning: "text-amber-400",
    info: "text-cyan-400",
    purple: "text-purple-400",
  };

  return (
    <Card className={`relative overflow-hidden p-5 bg-gradient-to-br ${tones[tone]} backdrop-blur-xl transition-all duration-500 hover:scale-[1.03] hover:border-white/20 group shadow-2xl`}>
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{label}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight leading-none group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {value}
          </h3>
          {description && (
            <p className="text-[10px] text-slate-500 font-medium">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}>
          <Icon className={`size-6 ${iconColors[tone]}`} />
        </div>
      </div>
      
      <div className="absolute -bottom-2 -right-2 size-24 bg-current opacity-[0.03] blur-2xl rounded-full group-hover:opacity-[0.08] transition-opacity" />
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
    </Card>
  );
}

export default function DashboardPage() {
  const { selectedWarehouseId, settings } = useApp();
  const currency = settings.currency || "ج.م";
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", selectedWarehouseId],
    queryFn: () => dashboardService.getDashboardStats(selectedWarehouseId || undefined),
    retry: 2,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050510]">
        <div className="relative">
          <div className="size-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 size-16 border-4 border-blue-400/10 rounded-full blur-sm" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050510]">
        <div className="text-red-400 text-lg bg-red-400/5 px-6 py-3 rounded-2xl border border-red-400/20 backdrop-blur-xl">
          فشل تحميل البيانات. يرجى المحاولة مرة أخرى.
        </div>
      </div>
    );
  }

  const d = data as any;
  const displayProfit = d.profit || (d.totalSales * 0.2);

  return (
    <div className="min-h-screen space-y-8 p-4 sm:p-8 bg-[#050510] text-slate-200 selection:bg-blue-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500">
            لوحة التحكم
          </h1>
          <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
            <span className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            نظرة عامة على نشاط المخزن المباشر
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard 
          label="إجمالي المنتجات" 
          value={d.totalProducts.toLocaleString("ar-EG")} 
          icon={Package} 
          tone="primary"
          description="عدد الأصناف المسجلة"
        />
        <StatCard 
          label="إجمالي الكميات" 
          value={d.totalQuantity.toLocaleString("ar-EG")} 
          icon={Boxes} 
          tone="purple"
          description="إجمالي الكميات المتوفرة"
        />
        <StatCard
          label="قيمة المخزون"
          value={fmtMoney(d.stockValue, currency)}
          icon={DollarSign}
          tone="accent"
          description="بناءً على سعر الشراء"
        />
        <StatCard 
          label="إجمالي المبيعات" 
          value={fmtMoney(d.totalSales, currency)} 
          icon={FileText} 
          tone="info" 
          description="إجمالي قيمة الفواتير المحصلة"
        />
        {/* <StatCard 
          label="الأرباح التقديرية" 
          value={fmtMoney(displayProfit, currency)} 
          icon={ProfitIcon} 
          tone="accent" 
          description="صافي الربح المتوقع"
        /> */}
        <StatCard 
          label="إجمالي الفواتير" 
          value={d.totalInvoices.toLocaleString("ar-EG")} 
          icon={FileText} 
          tone="primary"
          description="عدد العمليات المكتملة"
        />
        {/* <StatCard 
          label="منتجات منخفضة" 
          value={d.lowStock.toLocaleString("ar-EG")} 
          icon={AlertTriangle} 
          tone="warning"
          description="تحتاج لإعادة طلب قريباً"
        />
        <StatCard 
          label="نفدت من المخزن" 
          value={d.outOfStock.toLocaleString("ar-EG")} 
          icon={XCircle} 
          tone="destructive"
          description="غير متوفرة حالياً"
        /> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border border-emerald-500/20 rounded-3xl backdrop-blur-xl group">
          <div className="size-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="text-emerald-400 size-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">وارد اليوم</p>
            <p className="text-2xl font-bold text-white">+{d.todayIn.toLocaleString("ar-EG")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-orange-500/10 to-orange-900/5 border border-orange-500/20 rounded-3xl backdrop-blur-xl group">
          <div className="size-12 rounded-2xl bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingDown className="text-orange-400 size-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">صادر اليوم</p>
            <p className="text-2xl font-bold text-white">-{d.todayOut.toLocaleString("ar-EG")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="p-4 sm:p-8 bg-gradient-to-br from-[#0f0f23]/80 to-[#1a1a2e]/80 border border-slate-700/30 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
            <div>
              <h2 className="font-bold text-xl sm:text-2xl text-white">تحليل الحركات</h2>
              <p className="text-sm text-slate-400 mt-1">تطور الوارد والصادر خلال الفترة الأخيرة</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-700/50 w-fit">
              <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
              مباشر
            </div>
          </div>
          {!data.dailyMovements || data.dailyMovements.length === 0 ? (
            <div className="text-sm text-slate-400 py-12 text-center">لا توجد بيانات كافية</div>
          ) : (
            <div className="overflow-x-auto pb-4 sidebar-scrollbar">
              <div style={{ height: "350px", minWidth: "600px", position: "relative" }}>
                <Line
                  data={{
                    labels: data.dailyMovements.map(m => {
                      const date = new Date(m.date);
                      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                    }),
                  datasets: [
                    {
                      label: "وارد",
                      data: data.dailyMovements.map(m => m.in),
                      borderColor: "rgba(34, 197, 94, 1)",
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: "rgba(34, 197, 94, 1)",
                      pointBorderColor: "#fff",
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                    },
                    {
                      label: "صادر",
                      data: data.dailyMovements.map(m => m.out),
                      borderColor: "rgba(251, 146, 60, 1)",
                      backgroundColor: "rgba(251, 146, 60, 0.1)",
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: "rgba(251, 146, 60, 1)",
                      pointBorderColor: "#fff",
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      align: 'end',
                      labels: {
                        color: '#F9FAFB',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                          size: 12,
                          weight: "bold"
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: "#1F2937",
                      titleColor: "#F9FAFB",
                      bodyColor: "#F9FAFB",
                      borderColor: "#4B5563",
                      borderWidth: 2,
                      padding: 12,
                      cornerRadius: 12,
                      displayColors: true,
                      callbacks: {
                        label: function(context: any) {
                          return `${context.dataset.label}: ${fmtMoney(context.parsed.y, currency)}`;
                        }
                      }
                    }
                  },
                  scales: {
                      x: {
                        grid: {
                          color: "#4B5563",
                        },
                        ticks: {
                          color: "#D1D5DB",
                          font: {
                            size: 12,
                            weight: "bold"
                          }
                        }
                      },
                      y: {
                        grid: {
                          color: "#4B5563",
                        },
                        ticks: {
                          color: "#D1D5DB",
                          font: {
                            size: 12,
                            weight: "bold"
                          },
                          callback: function(value: any) {
                            return fmtMoney(value, currency);
                          }
                        },
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="bg-[#16162b] rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-lg font-bold text-white mb-4">آخر الحركات (تفصيلي)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e] text-slate-300">
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">المنتج</th>
                <th className="px-4 py-3 text-right font-medium">الكمية</th>
                <th className="px-4 py-3 text-right font-medium">السعر</th>
                <th className="px-4 py-3 text-right font-medium">الإجمالي</th>
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
                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={
                        m.type === "in"
                          ? "px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400"
                          : "px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-400"
                      }>
                        {m.type === "in" ? "وارد" : "صادر"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{m.productName}</td>
                    <td className="px-4 py-3 text-slate-400">{m.quantity}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtMoney(m.price, currency)}</td>
                    <td className="px-4 py-3 text-white font-mono font-bold">{fmtMoney(m.total, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-slate-400 text-sm text-center py-4 hidden">لا توجد حركات بعد</p>
      </div>
    </div>
  );
}
