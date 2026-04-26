import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Movement } from "@/lib/api";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
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
import { Printer, FileSpreadsheet, FileText, Zap, Calendar, Layers, Clock, CalendarDays } from "lucide-react";
import { useApp, warehouseQuery } from "@/lib/app-context";

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
  @media print {
    body {
      background: white !important;
      color: black !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section {
      display: block !important;
      padding: 20px;
    }
    .print-only-section * {
      color: black !important;
    }
    .print-only-section .bg-gradient-to-r {
      background: #1e40af !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section .bg-red-500 {
      background-color: #ef4444 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section .bg-blue-500 {
      background-color: #3b82f6 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section .bg-orange-500 {
      background-color: #f97316 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section .bg-green-500 {
      background-color: #22c55e !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section .bg-orange-500 span,
    .print-only-section .bg-green-500 span {
      color: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section table {
      width: 100%;
      border-collapse: collapse;
    }
    .print-only-section th,
    .print-only-section td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: right;
    }
    .print-only-section th {
      background: #1e40af !important;
      color: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-only-section tr:nth-child(even) {
      background-color: #eff6ff !important;
    }
  }
`;

export default function ReportsPage() {
  const { toast } = useToast();
  const { selectedWarehouseId } = useApp();
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [productReportOpen, setProductReportOpen] = useState(false);
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState<ReportData[]>([]);

  // Fetch movements from API
  const { data: movementsResponse = [], isLoading } = useQuery({
    queryKey: ["movements", selectedWarehouseId],
    queryFn: () => customFetch<Movement[]>(`/api/movements${warehouseQuery(selectedWarehouseId)}`),
  });

  // Extract movements array from response
  const movements = Array.isArray(movementsResponse) ? movementsResponse : (Array.isArray((movementsResponse as any)?.data) ? (movementsResponse as any)?.data : []);

  // Convert movements to report data
  const convertToReportData = (movements: Movement[]): ReportData[] => {
    return movements.map(movement => ({
      id: movement.id,
      date: movement.createdAt.split('T')[0],
      type: movement.type === 'out' ? 'صادر' : 'وارد',
      product: movement.productName,
      quantity: movement.quantity,
      price: movement.price,
      total: movement.total,
    }));
  };

  // Initialize filtered data with all data
  useEffect(() => {
    setFilteredData(convertToReportData(movements));
  }, [movements]);

  // Inject print styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    styleElement.id = 'reports-print-styles';
    document.head.appendChild(styleElement);
    
    return () => {
      const existingStyle = document.getElementById('reports-print-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Filtering functions
  const filterByDateRange = (start: string, end: string) => {
    const reportData = convertToReportData(movements);
    const filtered = reportData.filter((item: ReportData) => {
      const itemDate = new Date(item.date);
      const startDate = new Date(start);
      const endDate = new Date(end);
      return itemDate >= startDate && itemDate <= endDate;
    });
    setFilteredData(filtered);
  };

  const filterLastWeek = () => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStartDate(lastWeek.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    filterByDateRange(lastWeek.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  };

  const filterLastMonth = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    filterByDateRange(lastMonth.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  };

  const filterLastYear = () => {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    setStartDate(lastYear.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    filterByDateRange(lastYear.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  };

  const showAllData = () => {
    setStartDate("");
    setEndDate("");
    setFilteredData(convertToReportData(movements));
  };

  // Calculate summary data based on filtered data
  const totalExport = filteredData.filter(item => item.type === "صادر").reduce((sum, item) => sum + item.total, 0);
  const totalImport = filteredData.filter(item => item.type === "وارد").reduce((sum, item) => sum + item.total, 0);
  const profitLoss = totalImport - totalExport;
  const remainingQuantity = filteredData.reduce((sum, item) => {
    if (item.type === "وارد") return sum + item.quantity;
    return sum - item.quantity;
  }, 0);

  const handlePrint = () => {
    setPrintOptionsOpen(true);
  };

  const handleDirectPrint = () => {
    window.print();
    setPrintOptionsOpen(false);
    toast({ title: "جاري الطباعة..." });
  };

  const handleSavePDF = () => {
    // Placeholder for PDF generation
    toast({ title: "جاري حفظ ملف PDF..." });
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
    // For PDF export, we'll use window.print() with print CSS
    window.print();
    toast({ title: "جاري طباعة التقرير..." });
  };

  const handleQuickReport = () => {
    if (!startDate || !endDate) {
      toast({ title: "خطأ", description: "الرجاء تحديد تاريخ البدء والنهاية", variant: "destructive" });
      return;
    }
    toast({ title: "تم إنشاء التقرير السريع" });
    setQuickReportOpen(false);
    handlePrint();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">التقارير</h1>
        <p className="text-gray-400 text-sm">نظرة عامة على حركة المخزون</p>
      </div>

      {/* All Buttons in One Container */}
      <div className="flex flex-wrap gap-2">
        {/* Filter Buttons */}
        <Button 
          onClick={filterLastWeek} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          <Clock className="size-4 ml-2" />
          آخر أسبوع
        </Button>
        <Button 
          onClick={filterLastMonth} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          <CalendarDays className="size-4 ml-2" />
          آخر شهر
        </Button>
        <Button 
          onClick={filterLastYear} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          <Clock className="size-4 ml-2" />
          آخر سنة
        </Button>
        <Button 
          onClick={showAllData} 
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          <Calendar className="size-4 ml-2" />
          الكل
        </Button>
        
        {/* Report Type & Export Buttons */}
        <Button 
          onClick={() => setQuickReportOpen(true)} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
        >
          <Zap className="size-4 ml-2" />
          تقرير سريع
        </Button>
        <Button 
          onClick={() => setProductReportOpen(true)} 
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
        >
          <Layers className="size-4 ml-2" />
          تقرير منتج
        </Button>
        <Button 
          onClick={handleExportPDF} 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
        >
          <FileText className="size-4 ml-2" />
          PDF
        </Button>
        <Button 
          onClick={handleExportCSV} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
        >
          <FileSpreadsheet className="size-4 ml-2" />
          Excel
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">من</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate) {
                filterByDateRange(e.target.value, endDate);
              }
            }}
            className="bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">إلى</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (startDate) {
                filterByDateRange(startDate, e.target.value);
              }
            }}
            className="bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-40"
          />
        </div>
        <Button 
          onClick={() => { if (startDate && endDate) filterByDateRange(startDate, endDate); }} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition h-10"
        >
          عرض
        </Button>
      </div>

      {/* Summary Cards - Dark Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">إجمالي الوارد</p>
          <p className="text-2xl font-bold text-green-400 font-mono">
            Fr {totalImport.toLocaleString('ar-EG')}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">إجمالي الصادر</p>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            Fr {totalExport.toLocaleString('ar-EG')}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">الكمية المتبقية</p>
          <p className="text-2xl font-bold text-white font-mono">
            {remainingQuantity.toLocaleString('ar-EG')}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">الربح / الخسارة</p>
          <p className={`text-2xl font-bold font-mono ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Fr {profitLoss.toLocaleString('ar-EG')}{profitLoss < 0 ? '-' : ''}
          </p>
        </div>
      </div>

      {/* Data Table - Dark Theme */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">جاري تحميل البيانات...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            لا توجد بيانات للعرض
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-800 text-gray-300">
                <TableRow>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">التاريخ</TableHead>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">النوع</TableHead>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">المنتج</TableHead>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">الكمية</TableHead>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">السعر</TableHead>
                  <TableHead className="text-right px-4 py-3 bg-gray-800">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-right px-4 py-3 text-gray-300">{item.date}</TableCell>
                    <TableCell className="text-right px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.type === "صادر" 
                            ? "bg-red-600 text-white" 
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-4 py-3 font-medium text-gray-300">{item.product}</TableCell>
                    <TableCell className="text-right px-4 py-3 text-gray-300">{item.quantity}</TableCell>
                    <TableCell className="text-right px-4 py-3 text-gray-300">Fr {item.price.toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="text-right px-4 py-3 font-semibold text-gray-300">
                      Fr {item.total.toLocaleString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
        {/* Print Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">📊 تقرير حركة المخزون</h2>
          <p className="text-sm opacity-90 mb-1">شركة منصة قطع غيار السيارات</p>
          <p className="text-sm opacity-90">الفترة من {startDate || 'كل الفترة'} إلى {endDate || 'كل الفترة'}</p>
        </div>

        {/* Print Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-red-500 text-white p-4 rounded-lg text-center">
            <p className="text-sm mb-1">💰 الربح/الخسارة</p>
            <p className="text-2xl font-bold">{profitLoss.toLocaleString('ar-EG')}</p>
            <p className="text-sm">Fr</p>
          </div>
          <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
            <p className="text-sm mb-1">📦 المتبقي</p>
            <p className="text-2xl font-bold">{remainingQuantity.toLocaleString('ar-EG')}</p>
            <p className="text-sm">وحدة</p>
          </div>
          <div className="bg-orange-500 text-white p-4 rounded-lg text-center">
            <p className="text-sm mb-1">📤 إجمالي الصادر</p>
            <p className="text-2xl font-bold">{totalExport.toLocaleString('ar-EG')}</p>
            <p className="text-sm">Fr</p>
          </div>
          <div className="bg-green-500 text-white p-4 rounded-lg text-center">
            <p className="text-sm mb-1">📥 إجمالي الوارد</p>
            <p className="text-2xl font-bold">{totalImport.toLocaleString('ar-EG')}</p>
            <p className="text-sm">Fr</p>
          </div>
        </div>

        {/* Print Data Table */}
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <tr>
              <th className="px-4 py-3 text-right border border-gray-300">التاريخ</th>
              <th className="px-4 py-3 text-right border border-gray-300">النوع</th>
              <th className="px-4 py-3 text-right border border-gray-300">المنتج</th>
              <th className="px-4 py-3 text-right border border-gray-300">الكمية</th>
              <th className="px-4 py-3 text-right border border-gray-300">السعر</th>
              <th className="px-4 py-3 text-right border border-gray-300">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                <td className="px-4 py-3 text-right border border-gray-300">{item.date}</td>
                <td className="px-4 py-3 text-right border border-gray-300">
                  <span 
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.type === "صادر" 
                        ? "bg-orange-500 text-white" 
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right border border-gray-300 font-medium">{item.product}</td>
                <td className="px-4 py-3 text-right border border-gray-300">{item.quantity}</td>
                <td className="px-4 py-3 text-right border border-gray-300">{item.price.toLocaleString('ar-EG')}</td>
                <td className="px-4 py-3 text-right border border-gray-300 font-semibold">{item.total.toLocaleString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Report Dialog - Matching test.txt design */}
      <Dialog open={quickReportOpen} onOpenChange={setQuickReportOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md bg-gray-800 border-gray-700 text-white p-0 overflow-hidden">
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

      {/* Product Report Dialog - Matching test.txt design */}
      <Dialog open={productReportOpen} onOpenChange={setProductReportOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] bg-gray-800 border-gray-700 text-white p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-gray-700 sticky top-0 z-10 bg-gray-800">
            <DialogTitle className="flex items-center justify-between text-white text-lg font-bold">
              <span className="flex items-center gap-2">
                <Layers className="size-5 text-amber-400" />
                 تقرير المنتج
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Product Selection */}
            <div className="space-y-1">
              <Label htmlFor="prod-report-select" className="text-sm text-gray-300">اختر المنتج</Label>
              <select
                id="prod-report-select"
                className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                onChange={(e) => {
                  const selectedProduct = e.target.value;
                  if (selectedProduct) {
                    const productMovements = filteredData.filter(item => item.product === selectedProduct);
                    // Show product-specific data
                  }
                }}
              >
                <option value="">اختر منتجاً...</option>
                {[...new Set(filteredData.map(item => item.product))].map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod-report-from" className="text-sm text-gray-300 mb-1 block">من</Label>
                <Input
                  id="prod-report-from"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <Label htmlFor="prod-report-to" className="text-sm text-gray-300 mb-1 block">إلى</Label>
                <Input
                  id="prod-report-to"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
              <h4 className="text-white font-semibold mb-3 text-sm">معاينة البيانات</h4>
              <div className="space-y-2 text-xs">
                {filteredData.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b border-gray-700">
                    <span className="text-gray-300">{item.date} - {item.product}</span>
                    <span className={item.type === "وارد" ? "text-green-400" : "text-red-400"}>
                      {item.type}: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); setProductReportOpen(false); }} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> عرض
              </Button>
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); handleExportPDF(); }} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button 
                onClick={() => { filterByDateRange(startDate || '', endDate || ''); handleExportCSV(); }} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </Button>
            </div>

            {/* Close Button */}
            <Button 
              onClick={() => setProductReportOpen(false)} 
              variant="outline"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600 py-2 rounded-lg text-sm font-medium transition"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
