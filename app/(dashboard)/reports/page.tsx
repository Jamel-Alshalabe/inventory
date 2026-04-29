import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Movement } from "@/services/api/api";
import { customFetch } from "@/services/api/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Printer, FileSpreadsheet, FileText, Zap, Calendar, Layers, Clock, CalendarDays, Search, Check, ChevronsUpDown } from "lucide-react";
import { useApp, warehouseQuery } from "@/lib/app-context";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Combobox } from "@/components/ui/combobox";

interface ReportData {
  id: number;
  date: string;
  type: "صادر" | "وارد";
  product: string;
  quantity: number;
  price: number;
  total: number;
}

// Print styles - defined outside component to avoid hooks order issues
const printStyles = `
  @media screen {
    .print-only-section {
      display: none !important;
    }
  }
  @media print {
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body > :not(.print-only-section) {
      display: none !important;
    }
    .print-only-section {
      display: block !important;
      background: white !important;
      width: 100% !important;
      color: #333 !important;
      direction: rtl !important;
    }
    body {
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .print-header {
      text-align: center !important;
      margin-bottom: 40px !important;
      border-bottom: 1px solid #eee !important;
      padding-bottom: 20px !important;
    }
    .print-header h2 {
      font-size: 24px !important;
      color: #1a1a1a !important;
      margin: 0 0 10px 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
    }
    .print-header .company-name {
      font-size: 14px !important;
      color: #666 !important;
      margin-bottom: 5px !important;
    }
    .print-header .report-period {
      font-size: 12px !important;
      color: #888 !important;
    }

    .print-summary {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 20px !important;
      margin-bottom: 40px !important;
      text-align: center !important;
    }
    .summary-box {
      padding: 10px !important;
    }
    .summary-box .label {
      font-size: 11px !important;
      color: #888 !important;
      margin-bottom: 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
    }
    .summary-box .value {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      margin-bottom: 4px !important;
    }
    .summary-box .unit {
      font-size: 10px !important;
      color: #999 !important;
    }

    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    .print-table th {
      border-bottom: 2px solid #eee !important;
      padding: 12px 8px !important;
      text-align: right !important;
      font-size: 12px !important;
      color: #999 !important;
      font-weight: 500 !important;
    }
    .print-table td {
      padding: 12px 8px !important;
      border-bottom: 1px solid #f5f5f5 !important;
      font-size: 11px !important;
      color: #444 !important;
    }
    .print-table tr:last-child td {
      border-bottom: none !important;
    }
    .type-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      font-size: 10px !important;
    }
    .type-in { color: #22c55e !important; }
    .type-out { color: #3b82f6 !important; }

    .print-footer {
      margin-top: 50px !important;
      padding-top: 20px !important;
      border-top: 2px solid #3b82f6 !important;
      text-align: center !important;
      font-size: 10px !important;
      color: #999 !important;
    }
    .print-footer p {
      margin: 4px 0 !important;
    }
  }
`;

export default function ReportsPage() {
  const { toast } = useToast();
  const { selectedWarehouseId, settings } = useApp();
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [productReportOpen, setProductReportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [showProductResult, setShowProductResult] = useState(false);
  const [productStats, setProductStats] = useState({
    inQty: 0,
    inVal: 0,
    outQty: 0,
    outVal: 0,
    buyPrice: 0,
    sellPrice: 0,
    code: "",
    movements: [] as any[]
  });
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filteredData, setFilteredData] = useState<ReportData[]>([]);

  // Inject print styles
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = printStyles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Fetch movements from API
  const { data: movementsResponse = [], isLoading } = useQuery({
    queryKey: ["movements", selectedWarehouseId],
    queryFn: () => customFetch<Movement[]>(`/api/movements${warehouseQuery(selectedWarehouseId)}`),
  });

  // Fetch all products from API for the searchable list
  const { data: productsResponse = [] } = useQuery({
    queryKey: ["products-list", selectedWarehouseId],
    queryFn: () => customFetch<any>(`/api/products${warehouseQuery(selectedWarehouseId)}`),
  });

  const products = Array.isArray(productsResponse) 
    ? productsResponse 
    : (Array.isArray((productsResponse as any)?.data) ? (productsResponse as any)?.data : []);

  // Extract movements array from response and filter by warehouse
  const movements = Array.isArray(movementsResponse) 
    ? movementsResponse 
    : (Array.isArray((movementsResponse as any)?.data) ? (movementsResponse as any)?.data : []);

  // Convert movements to report data - Memoized to prevent re-creation
  const allReportData = useState<ReportData[]>([]);

  // Filtering functions
  const filterByDateRange = (start: string, end: string) => {
    if (!movements.length) return;
    
    const reportData = movements.map((movement: any) => ({
      id: movement.id,
      date: movement.createdAt.split('T')[0],
      type: movement.type === 'out' ? 'صادر' : 'وارد' as const,
      product: movement.productName,
      quantity: movement.quantity,
      price: movement.price,
      total: movement.total,
    }));

    if (!start && !end) {
      setFilteredData(reportData);
      return;
    }

    const filtered = reportData.filter((item: ReportData) => {
      const itemDate = new Date(item.date);
      const sDate = start ? new Date(start) : new Date(0);
      const eDate = end ? new Date(end) : new Date();
      
      // Normalize dates to start of day for accurate comparison
      itemDate.setHours(0,0,0,0);
      sDate.setHours(0,0,0,0);
      eDate.setHours(0,0,0,0);
      
      return itemDate >= sDate && itemDate <= eDate;
    });
    setFilteredData(filtered);
  };

  const filterLastWeek = () => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    const s = lastWeek.toISOString().split('T')[0];
    const e = today.toISOString().split('T')[0];
    setStartDate(s);
    setEndDate(e);
    filterByDateRange(s, e);
  };

  const filterLastMonth = () => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    const s = lastMonth.toISOString().split('T')[0];
    const e = today.toISOString().split('T')[0];
    setStartDate(s);
    setEndDate(e);
    filterByDateRange(s, e);
  };

  const filterLastYear = () => {
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);
    
    const s = lastYear.toISOString().split('T')[0];
    const e = today.toISOString().split('T')[0];
    setStartDate(s);
    setEndDate(e);
    filterByDateRange(s, e);
  };

  const showAllData = () => {
    setStartDate("");
    setEndDate("");
    filterByDateRange("", "");
  };

  // Initialize filtered data with default date range (last month)
  useEffect(() => {
    if (movements.length > 0) {
      filterByDateRange(startDate, endDate);
    }
  }, [movements]);

  // Calculate summary data based on filtered data
  const totalExport = filteredData.filter(item => item.type === "صادر").reduce((sum, item) => sum + item.total, 0);
  const totalImport = filteredData.filter(item => item.type === "وارد").reduce((sum, item) => sum + item.total, 0);
  const profitLoss = totalImport - totalExport;
  const remainingQuantity = Math.abs(filteredData.reduce((sum, item) => {
    if (item.type === "وارد") return sum + item.quantity;
    return sum - item.quantity;
  }, 0));

  const columns: ColumnDef<ReportData>[] = [
    {
      accessorKey: "date",
      header: "التاريخ",
    },
    {
      accessorKey: "type",
      header: "النوع",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              type === "صادر" 
                ? "bg-red-600 text-white" 
                : "bg-blue-600 text-white"
            }`}
          >
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "product",
      header: "المنتج",
      cell: ({ row }) => (
        <span className="font-medium text-gray-300">{row.getValue("product")}</span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "الكمية",
    },
    {
      accessorKey: "price",
      header: "السعر",
      cell: ({ row }) => `Fr ${parseFloat(row.getValue("price")).toLocaleString('ar-EG')}`,
    },
    {
      accessorKey: "total",
      header: "الإجمالي",
      cell: ({ row }) => (
        <span className="font-semibold text-gray-300">
          Fr {parseFloat(row.getValue("total")).toLocaleString('ar-EG')}
        </span>
      ),
    },
  ];

  const handlePrint = () => {
    setPrintOptionsOpen(true);
  };

  const handleDirectPrint = () => {
    handleExportPDF();
    setPrintOptionsOpen(false);
  };

  const handleSavePDF = () => {
    handleExportPDF();
    setPrintOptionsOpen(false);
  };

  const handleExportCSV = () => {
    // Format date in Arabic
    const formatDateForExport = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    };

    const headers = ['التاريخ', 'النوع', 'المنتج', 'الكمية', 'السعر', 'الإجمالي'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item =>
        [
          formatDateForExport(item.date),
          item.type,
          item.product,
          item.quantity,
          item.price,
          item.total
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "تم تصدير ملف Excel بنجاح" });
  };

  const handleExportPDF = () => {
    // Determine the actual date range for the report
    let from = startDate;
    let to = endDate;

    // If dates are not manually selected, use the range from the filtered data
    if (!from || !to) {
      const dates = filteredData.map(d => new Date(d.date).getTime());
      if (dates.length > 0) {
        if (!from) from = new Date(Math.min(...dates)).toISOString().split('T')[0];
        if (!to) to = new Date(Math.max(...dates)).toISOString().split('T')[0];
      } else {
        from = from || "بداية السجل";
        to = to || "اليوم";
      }
    }

    const fmtDateAr = (dateStr: string) => {
      if (dateStr === "بداية السجل" || dateStr === "اليوم") return dateStr;
      return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const displayFrom = fmtDateAr(from);
    const displayTo = fmtDateAr(to);
    
    const totalIn = totalImport;
    const totalOut = totalExport;
    const remaining = remainingQuantity;
    const profit = profitLoss;
    const fmt = (val: number) => val.toLocaleString('ar-EG');
    const cs = () => settings.currency || "ج.م";

    const printWindow = window.open('', '', 'height=900,width=1200');
    if (!printWindow) return;

    let html = `
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width">
      <title>تقرير حركة المخزون - ${displayFrom} إلى ${displayTo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Noto Kufi Arabic', Tahoma, sans-serif; }
        body { color: #000; margin: 15px; background: #fff; line-height: 1.6; }
        
        .header { 
          background: linear-gradient(135deg, #0f3490 0%, #1a56db 100%); 
          color: white; 
          text-align: center; 
          padding: 25px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
          box-shadow: 0 4px 12px rgba(15, 52, 144, 0.3); 
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2); 
        }
        .header h1 { font-size: 28px; margin: 0 0 8px 0; letter-spacing: 1px; }
        .header p { margin: 3px 0; font-size: 12px; opacity: 0.95; }
        
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .stat-box { 
          border-radius: 8px; 
          padding: 15px; 
          text-align: center; 
          color: white; 
          font-weight: bold; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
          border: 2px solid rgba(255,255,255,0.3); 
        }
        .stat-in { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .stat-out { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .stat-remaining { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .stat-profit { background: linear-gradient(135deg, ${profit >= 0 ? '#10b981, #059669' : '#ef4444, #dc2626'}); }
        
        .stat-label { font-size: 11px; opacity: 0.9; margin-bottom: 8px; }
        .stat-value { font-size: 20px; font-family: monospace; margin-bottom: 5px; }
        .stat-unit { font-size: 10px; opacity: 0.8; }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px; 
          font-size: 12px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
          border-radius: 8px; 
          overflow: hidden; 
        }
        thead { background: linear-gradient(90deg, #0f3490, #1a56db); color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); font-weight: bold; }
        th { padding: 14px; text-align: right; border: none; }
        td { padding: 12px; text-align: right; border: none; border-bottom: 1px solid #e5e7eb; }
        
        tbody tr:nth-child(even) { background: #f5f9ff; }
        tbody tr:nth-child(odd) { background: #ffffff; }
        
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: white; }
        .badge-in { background: #22c55e; }
        .badge-out { background: #f59e0b; }
        
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #0284c7; font-size: 10px; color: #666; }
        @media print { body { margin: 10mm; padding: 0; } * { box-shadow: none !important; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 تقرير حركة المخزون</h1>
        <p>${settings.companyName || 'شركة سنك لقطع غيار السيارات'}</p>
        <p>الفترة: من ${displayFrom} إلى ${displayTo}</p>
      </div>
      
      <div class="stats">
        <div class="stat-box stat-in">
          <div class="stat-label">🔼 إجمالي الوارد</div>
          <div class="stat-value">${fmt(totalIn)}</div>
          <div class="stat-unit">${cs()}</div>
        </div>
        <div class="stat-box stat-out">
          <div class="stat-label">🔽 إجمالي الصادر</div>
          <div class="stat-value">${fmt(totalOut)}</div>
          <div class="stat-unit">${cs()}</div>
        </div>
        <div class="stat-box stat-remaining">
          <div class="stat-label">📦 المتبقي</div>
          <div class="stat-value">${fmt(remaining)}</div>
          <div class="stat-unit">وحدة</div>
        </div>
        <div class="stat-box stat-profit">
          <div class="stat-label">💰 الربح/الخسارة</div>
          <div class="stat-value">${fmt(profit)}</div>
          <div class="stat-unit">${cs()}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.date}</td>
              <td>
                <span class="badge ${item.type === 'وارد' ? 'badge-in' : 'badge-out'}">
                  ${item.type}
                </span>
              </td>
              <td style="font-weight:bold">${item.product}</td>
              <td style="font-weight:bold">${item.quantity}</td>
              <td>${fmt(item.price)}</td>
              <td style="font-weight:bold;color:#0f3490">${fmt(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>تم استخراج التقرير في: ${new Date().toLocaleString('ar-EG')}</p>
        <p>© ${settings.companyName || 'شركة سنك لقطع غيار السيارات'}</p>
      </div>
      
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    toast({ title: "جاري طباعة التقرير..." });
  };

  const handleProductReportView = () => {
    if (!selectedProduct || !startDate || !endDate) {
      toast({ title: "خطأ", description: "الرجاء اختيار منتج وتحديد التاريخ", variant: "destructive" });
      return;
    }

    const pMovements = movements.filter(m => 
      m.productName === selectedProduct && 
      new Date(m.createdAt) >= new Date(startDate) && 
      new Date(m.createdAt) <= new Date(endDate)
    );

    const firstMove = pMovements[0];
    
    setProductStats({
      inQty: pMovements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0),
      inVal: pMovements.filter(m => m.type === 'in').reduce((s, m) => s + m.total, 0),
      outQty: pMovements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0),
      outVal: pMovements.filter(m => m.type === 'out').reduce((s, m) => s + m.total, 0),
      buyPrice: firstMove?.price || 0,
      sellPrice: firstMove?.price || 0,
      code: firstMove?.productCode || "---",
      movements: pMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });

    setShowProductResult(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">التقارير</h1>
        <p className="text-gray-400 text-sm">نظرة عامة على حركة المخزون</p>
      </div>

      {/* Quick Action Buttons - Professional Layout */}
      <div className="bg-[#111127] p-2 rounded-2xl border border-gray-800/50 inline-flex flex-wrap gap-2 shadow-2xl backdrop-blur-xl w-full sm:w-auto">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-gray-900/50 rounded-xl border border-white/5 w-full sm:w-auto justify-center sm:justify-start">
          <Button 
            onClick={filterLastWeek} 
            className="h-10 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <Clock className="size-3.5 group-hover:rotate-12 transition-transform" />
            آخر أسبوع
          </Button>
          <Button 
            onClick={filterLastMonth} 
            className="h-10 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <CalendarDays className="size-3.5 group-hover:rotate-12 transition-transform" />
            آخر شهر
          </Button>
          <Button 
            onClick={filterLastYear} 
            className="h-10 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <Clock className="size-3.5 group-hover:rotate-12 transition-transform" />
            آخر سنة
          </Button>
          <Button 
            onClick={showAllData} 
            className="h-10 bg-gray-800 hover:bg-gray-700 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/5 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <Calendar className="size-3.5 group-hover:scale-110 transition-transform" />
            الكل
          </Button>
        </div>
        
        {/* Report Type & Export Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-gray-900/50 rounded-xl border border-white/5 w-full sm:w-auto justify-center sm:justify-start">
          <Button 
            onClick={() => setQuickReportOpen(true)} 
            className="h-10 bg-purple-600 hover:bg-purple-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <Zap className="size-3.5 group-hover:animate-pulse" />
            تقرير سريع
          </Button>
          <Button 
            onClick={() => setProductReportOpen(true)} 
            className="h-10 bg-amber-600 hover:bg-amber-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <Layers className="size-3.5 group-hover:rotate-12 transition-transform" />
            تقرير منتج
          </Button>
          <Button 
            onClick={handleExportPDF} 
            className="h-10 bg-green-600 hover:bg-green-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <FileText className="size-3.5 group-hover:translate-y-[-1px] transition-transform" />
            PDF
          </Button>
          <Button 
            onClick={handleExportCSV} 
            className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center gap-1.5 sm:gap-2 group flex-1 sm:flex-none min-w-[80px]"
          >
            <FileSpreadsheet className="size-3.5 group-hover:translate-y-[-1px] transition-transform" />
            Excel
          </Button>
        </div>
      </div>

      {/* Date Range Filter - Premium Header Style */}
      <div className="flex flex-wrap gap-4 items-end bg-[#111127] p-6 rounded-2xl border border-gray-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-600/10 transition-colors duration-700"></div>
        <div className="space-y-1.5 relative z-10">
          <Label className="text-[10px] uppercase tracking-widest text-gray-500 font-black mr-1">من تاريخ</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate) filterByDateRange(e.target.value, endDate);
            }}
            className="bg-[#0f0f1a] border-gray-700 text-white rounded-xl px-4 h-11 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-48 shadow-inner"
          />
        </div>
        <div className="space-y-1.5 relative z-10">
          <Label className="text-[10px] uppercase tracking-widest text-gray-500 font-black mr-1">إلى تاريخ</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (startDate) filterByDateRange(startDate, e.target.value);
            }}
            className="bg-[#0f0f1a] border-gray-700 text-white rounded-xl px-4 h-11 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-48 shadow-inner"
          />
        </div>
        <Button 
          onClick={() => { if (startDate && endDate) filterByDateRange(startDate, endDate); }} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-11 rounded-xl text-sm transition-all duration-300 font-black shadow-lg shadow-blue-900/40 active:scale-95 relative z-10"
        >
          تحديث التقرير
        </Button>
      </div>

      {/* Summary Cards - Premium Glass Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#111127] rounded-2xl p-6 border border-gray-800/50 shadow-xl hover:border-green-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">إجمالي الوارد</p>
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500 group-hover:scale-110 transition-transform duration-300">
              <Zap className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-green-400 font-mono tracking-tighter relative z-10">
            Fr {totalImport.toLocaleString('ar-EG')}
          </p>
          <div className="mt-4 w-full h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-green-500 w-full opacity-20"></div>
          </div>
        </div>

        <div className="bg-[#111127] rounded-2xl p-6 border border-gray-800/50 shadow-xl hover:border-amber-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">إجمالي الصادر</p>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:scale-110 transition-transform duration-300">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 font-mono tracking-tighter relative z-10">
            Fr {totalExport.toLocaleString('ar-EG')}
          </p>
          <div className="mt-4 w-full h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-amber-500 w-full opacity-20"></div>
          </div>
        </div>

        <div className="bg-[#111127] rounded-2xl p-6 border border-gray-800/50 shadow-xl hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">الكمية المتبقية</p>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono tracking-tighter relative z-10">
            {remainingQuantity.toLocaleString('ar-EG')}
          </p>
          <div className="mt-4 w-full h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-blue-500 w-full opacity-20"></div>
          </div>
        </div>

        <div className="bg-[#111127] rounded-2xl p-6 border border-gray-800/50 shadow-xl hover:border-emerald-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">الربح / الخسارة</p>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform duration-300">
              <Clock className="size-4" />
            </div>
          </div>
          <p className={`text-3xl font-black font-mono tracking-tighter relative z-10 ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Fr {profitLoss.toLocaleString('ar-EG')}{profitLoss < 0 ? '-' : ''}
          </p>
          <div className="mt-4 w-full h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
            <div className={`h-full w-full opacity-20 ${profitLoss >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          </div>
        </div>
      </div>

      {/* Data Table - Dark Theme */}
      <div className="bg-[#111127] rounded-xl border overflow-hidden shadow-xl">
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="product"
          searchPlaceholder="بحث بالمنتج..."
          emptyMessage={isLoading ? "جاري تحميل البيانات..." : "لا توجد بيانات للعرض"}
        />
      </div>

      {/* Print Button */}
      <div className="flex justify-center print:hidden">
        <Button 
          onClick={handlePrint} 
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <Printer className="size-4 ml-2" />
          طباعة التقرير
        </Button>
      </div>

      {/* Print-Only Section - Styled for printing */}
      <div className="hidden print:block print-only-section">
        <div className="print-header">
          <h2>📊 تقرير حركة المخزون</h2>
          <p className="company-name">{settings.companyName || 'شركة سنك لقطع غيار السيارات'}</p>
          <p className="report-period">الفترة: من {startDate || 'بداية السجل'} إلى {endDate || 'اليوم'}</p>
        </div>

        <div className="print-summary">
          <div className="summary-box">
            <div className="label">
              <Zap className="size-3" /> إجمالي الوارد
            </div>
            <div className="value">{totalImport.toLocaleString('ar-EG')}</div>
            <div className="unit">Fr</div>
          </div>
          <div className="summary-box">
            <div className="label">
              <Layers className="size-3" /> إجمالي الصادر
            </div>
            <div className="value">{totalExport.toLocaleString('ar-EG')}</div>
            <div className="unit">Fr</div>
          </div>
          <div className="summary-box">
            <div className="label">
              <Calendar className="size-3" /> المتبقي
            </div>
            <div className="value">{remainingQuantity.toLocaleString('ar-EG')}</div>
            <div className="unit">وحدة</div>
          </div>
          <div className="summary-box">
            <div className="label">
              <Clock className="size-3" /> الربح/الخسارة
            </div>
            <div className="value">{profitLoss.toLocaleString('ar-EG')}{profitLoss < 0 ? '-' : ''}</div>
            <div className="unit">Fr</div>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>
                  <span className={`type-badge ${item.type === "صادر" ? "type-out" : "type-in"}`}>
                    {item.type === "صادر" ? "▼ صادر" : "▲ وارد"}
                  </span>
                </td>
                <td style={{ fontWeight: 'bold' }}>{item.product}</td>
                <td style={{ fontWeight: 'bold' }}>{item.quantity}</td>
                <td>{item.price.toLocaleString('ar-EG')}</td>
                <td style={{ fontWeight: 'bold', color: '#1a1a1a' }}>{item.total.toLocaleString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
          <p>تم طباعة هذا التقرير من نظام إدارة المخزون</p>
          <p>{new Date().toLocaleDateString('ar-EG')} {new Date().toLocaleTimeString('ar-EG')}</p>
          <p>© {settings.companyName || 'شركة سنك لقطع غيار السيارات'}</p>
        </div>
      </div>

      {/* Quick Report Dialog - Matching test.txt design */}
      <Dialog open={quickReportOpen} onOpenChange={setQuickReportOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md bg-[#111127] border-gray-700 text-white p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-gray-700">
            <DialogTitle className="flex items-center justify-between text-white text-lg font-bold">
              <span className="flex items-center gap-2">
                <Zap className="size-5 text-yellow-400" />
               التقرير السريع
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Date Range Filter */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="quick-report-from" className="text-sm text-gray-300 mb-1 block">من</Label>
                <Input
                  id="quick-report-from"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-900 border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <Label htmlFor="quick-report-to" className="text-sm text-gray-300 mb-1 block">إلى</Label>
                <Input
                  id="quick-report-to"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-900 border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); handleExportPDF(); }} 
                className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
              >
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); handleExportCSV(); }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </Button>
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); handleQuickReport(); }} 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> طباعة
              </Button>
            </div>

            {/* Close Button */}
            <Button 
              onClick={() => setQuickReportOpen(false)} 
              variant="outline"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600 py-2 rounded-lg text-sm font-medium transition"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Options Dialog */}
      <Dialog open={printOptionsOpen} onOpenChange={setPrintOptionsOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>خيارات الطباعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Button onClick={handleDirectPrint} className="w-full">
                <Printer className="size-4 ml-2" />
                طباعة مباشرة
              </Button>
            </div>
            <div className="space-y-2">
              <Button onClick={handleSavePDF} variant="outline" className="w-full">
                <FileText className="size-4 ml-2" />
                حفظ كـ PDF
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintOptionsOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Report Dialog - Exactly matching user images */}
      <Dialog open={productReportOpen} onOpenChange={(o) => {
        setProductReportOpen(o);
        if (!o) {
          setShowProductResult(false);
          setSelectedProduct("");
        }
      }}>
        <DialogContent dir="rtl" className="sm:max-w-2xl bg-[#111127] border-[#2b2b3b] text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between p-5 border-b border-[#2b2b3b] sticky top-0 z-10 bg-[#111127]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📊 {showProductResult ? `تقرير ${selectedProduct}` : "تقرير المنتج"}
            </h3>
          </div>

          <div className="p-5 space-y-4">
            {!showProductResult ? (
              <>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">اختر المنتج</label>
                  <Combobox
                    options={products.map((p: any) => ({
                      label: p.name,
                      value: p.name
                    }))}
                    value={selectedProduct}
                    onSelect={setSelectedProduct}
                    placeholder="ابحث عن منتج..."
                    emptyText="لا يوجد منتجات"
                    className="w-full bg-[#111127] border border-[#2b2b3b] text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white">من</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#161625] border border-[#2b2b3b] rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none mt-1 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white">إلى</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#161625] border border-[#2b2b3b] rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none mt-1 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleProductReportView}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 h-11"
                  >
                    <Printer className="w-4 h-4" /> عرض
                  </Button>
                  <Button 
                    onClick={() => {
                      if(!selectedProduct || !startDate || !endDate) return toast({title: "خطأ", description: "املأ جميع الحقول"});
                      handleExportPDF();
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 h-11"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </Button>
                  <Button 
                    onClick={() => {
                      if(!selectedProduct || !startDate || !endDate) return toast({title: "خطأ", description: "املأ جميع الحقول"});
                      handleExportCSV();
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 h-11"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Stats Header from test.txt */}
                <div className="bg-[#161625] rounded-2xl p-6 border border-slate-800/50 grid grid-cols-2 gap-y-6">
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">كود المنتج</p>
                    <p className="text-white font-mono font-bold text-lg">{productStats.code}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">الفترة</p>
                    <p className="text-white font-bold text-sm">من {new Date(startDate).toLocaleDateString('ar-EG')} إلى {new Date(endDate).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1 text-green-400">سعر الشراء</p>
                    <p className="text-green-400 font-bold text-lg font-mono">{productStats.buyPrice.toLocaleString()} Fr</p>
                  </div>
                  <div className="text-left">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1 text-amber-400">سعر البيع</p>
                    <p className="text-amber-400 font-bold text-lg font-mono">{productStats.sellPrice.toLocaleString()} Fr</p>
                  </div>
                </div>

                {/* Summary Boxes from test.txt */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-600/30 rounded-2xl p-4 text-center">
                    <p className="text-green-400 text-xs font-bold">الوارد</p>
                    <p className="text-3xl font-black text-white font-mono mt-1">{productStats.inQty}</p>
                    <p className="text-green-300/60 text-[10px] mt-1 font-bold">قيمة: {productStats.inVal.toLocaleString()} Fr</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-600/30 rounded-2xl p-4 text-center">
                    <p className="text-amber-400 text-xs font-bold">الصادر</p>
                    <p className="text-3xl font-black text-white font-mono mt-1">{productStats.outQty}</p>
                    <p className="text-amber-300/60 text-[10px] mt-1 font-bold">قيمة: {productStats.outVal.toLocaleString()} Fr</p>
                  </div>
                </div>

                {/* Movements Table from test.txt */}
                {productStats.movements.length > 0 ? (
                  <div className="overflow-x-auto bg-[#161625] rounded-xl border border-slate-800/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#1e1e2d] text-slate-400">
                          <th className="p-3 text-right font-bold">التاريخ</th>
                          <th className="p-3 text-right font-bold">النوع</th>
                          <th className="p-3 text-right font-bold">الكمية</th>
                          <th className="p-3 text-right font-bold">السعر</th>
                          <th className="p-3 text-right font-bold">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {productStats.movements.map((m: any, idx: number) => (
                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-[#161625]' : 'bg-[#1a1a2e]'} hover:bg-white/5 transition-colors`}>
                            <td className="p-3 text-slate-300">{new Date(m.createdAt).toLocaleDateString('ar-EG')}</td>
                            <td className={`p-3 font-bold ${m.type === 'in' ? 'text-green-400' : 'text-amber-400'}`}>
                              {m.type === 'in' ? '🔼 وارد' : '🔽 صادر'}
                            </td>
                            <td className="p-3 text-white font-bold">{m.quantity}</td>
                            <td className="p-3 text-slate-400 font-mono">{m.price.toLocaleString()}</td>
                            <td className="p-3 text-white font-bold font-mono">{m.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-[#111127] rounded-xl p-6 text-center text-slate-500 text-sm border border-slate-800/50">
                    لا توجد حركات لهذا المنتج في الفترة المحددة
                  </div>
                )}
              </div>
            ) }

            <Button 
              onClick={() => {
                if (showProductResult) setShowProductResult(false);
                else setProductReportOpen(false);
              }}
              className="w-full bg-[#111127] hover:bg-[#3b3b4b] h-11 rounded-lg text-slate-300 font-bold border border-[#3b3b4b] transition-all"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
