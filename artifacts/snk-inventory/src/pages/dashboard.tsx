import { useQuery } from "@tanstack/react-query";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { api, fmtDate, fmtMoney, type DashboardStats } from "@/lib/api";
import { dashboardService } from "@/lib/dashboard-service";
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
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", selectedWarehouseId],
    queryFn: () => dashboardService.getDashboardStats(selectedWarehouseId || undefined),
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
        <div className="text-white text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
        <div className="text-red-400 text-lg">فشل تحميل البيانات. يرجى المحاولة مرة أخرى.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{background: "linear-gradient(135deg, #08081a 0%, #0d0d1a 50%, #121230 100%)"}}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm mt-1">نظرة عامة على نشاط المخزن</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>مباشر</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي المنتجات" value={String(data.totalProducts)} icon={Package} />
        <StatCard
          label="اجمالي المخزون"
          value={fmtMoney(data.stockValue, currency)}
          icon={DollarSign}
          tone="accent"
        />
        <StatCard label="إجمالي المبيعات" value={fmtMoney(data.totalSales, currency)} icon={FileText} tone="accent" />
        <StatCard 
          label="الأرباح" 
          value={fmtMoney(data.profit || 0, currency)} 
          icon={ProfitIcon} 
          tone="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] border border-slate-700/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-white">تحليل الحركات</h2>
            <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full">آخر الحركات</div>
          </div>
          {!data.dailyMovements || data.dailyMovements.length === 0 ? (
            <div className="text-sm text-slate-400 py-12 text-center">لا توجد بيانات كافية</div>
          ) : (
            <div style={{ height: "300px", position: "relative" }}>
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
                        label: function(context) {
                          return `${context.dataset.label}: ${fmtMoney(context.parsed.y, currency)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: "#4B5563",
                        drawBorder: false,
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
                        drawBorder: false,
                      },
                      ticks: {
                        color: "#D1D5DB",
                        font: {
                          size: 12,
                          weight: "bold"
                        },
                        callback: function(value) {
                          return fmtMoney(value, currency);
                        }
                      },
                      beginAtZero: true
                    }
                  }
                }}
              />
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
                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={
                        m.type === "in"
                          ? "px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400"
                          : "px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-400"
                      }>
                        {m.type === "in" ? "وارد" : "صادر"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{m.product_name}</td>
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
