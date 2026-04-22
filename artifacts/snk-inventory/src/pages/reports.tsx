import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

interface ReportData {
  id: number;
  date: string;
  type: "صادر" | "وارد";
  product: string;
  quantity: number;
  price: number;
  total: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState<ReportData[]>([]);

  // Mock data for demonstration
  const mockData: ReportData[] = [
    { id: 1, date: "2026-04-22", type: "صادر", product: "راس سايفون", quantity: 5, price: 15000, total: 75000 },
    { id: 2, date: "2026-04-21", type: "وارد", product: "قفيص", quantity: 10, price: 8000, total: 80000 },
    { id: 3, date: "2026-04-20", type: "صادر", product: "كدوسات", quantity: 3, price: 25000, total: 75000 },
    { id: 4, date: "2026-04-19", type: "وارد", product: "فانوس كبير 2008", quantity: 2, price: 35000, total: 70000 },
    { id: 5, date: "2026-04-18", type: "صادر", product: "سايفون", quantity: 8, price: 12000, total: 96000 },
    { id: 6, date: "2026-04-17", type: "وارد", product: "ترس بنيون امامي", quantity: 15, price: 5000, total: 75000 },
    { id: 7, date: "2026-04-16", type: "صادر", product: "عفريتة 10 طن", quantity: 1, price: 100000, total: 100000 },
    { id: 8, date: "2026-04-10", type: "وارد", product: "محرك سيارة", quantity: 2, price: 45000, total: 90000 },
    { id: 9, date: "2026-04-05", type: "صادر", product: "إطارات", quantity: 4, price: 8000, total: 32000 },
    { id: 10, date: "2026-03-28", type: "وارد", product: "زيت محركات", quantity: 10, price: 1500, total: 15000 },
    { id: 11, date: "2026-03-25", type: "صادر", product: "بطاريات", quantity: 3, price: 12000, total: 36000 },
    { id: 12, date: "2026-03-20", type: "وارد", product: "فلتر هواء", quantity: 20, price: 500, total: 10000 },
    { id: 13, date: "2026-03-15", type: "صادر", product: "شموع احتراق", quantity: 8, price: 2000, total: 16000 },
    { id: 14, date: "2026-02-28", type: "وارد", product: "سوائل فرامل", quantity: 15, price: 3000, total: 45000 },
    { id: 15, date: "2026-02-20", type: "صادر", product: "أضواء أمامية", quantity: 5, price: 6000, total: 30000 },
    { id: 16, date: "2026-02-15", type: "وارد", product: "مرايا جانبية", quantity: 8, price: 2500, total: 20000 },
    { id: 17, date: "2026-01-30", type: "صادر", product: "كفرات", quantity: 10, price: 4000, total: 40000 },
    { id: 18, date: "2026-01-20", type: "وارد", product: "مكابس", quantity: 6, price: 8000, total: 48000 },
    { id: 19, date: "2025-12-25", type: "صادر", product: "سلك كهرباء", quantity: 50, price: 100, total: 5000 },
    { id: 20, date: "2025-12-15", type: "وارد", product: "مفتاح راديو", quantity: 12, price: 1500, total: 18000 },
  ];

  // Initialize filtered data with all data
  useEffect(() => {
    setFilteredData(mockData);
  }, []);

  // Filtering functions
  const filterByDateRange = (start: string, end: string) => {
    const filtered = mockData.filter(item => {
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
    setFilteredData(mockData);
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
    // Placeholder for CSV export
    toast({ title: "جاري تصدير ملف CSV..." });
  };

  const handleExportPDF = () => {
    // Placeholder for PDF export
    toast({ title: "جاري تصدير ملف PDF..." });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على حركة المخزون</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setQuickReportOpen(true)}>
            <Zap className="size-4 ml-2" />
            تقرير سريع
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="size-4 ml-2" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* Report Buttons Section - Updated */}
      <Card className="p-4 border-2 border-blue-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* Export Buttons */}
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <FileSpreadsheet className="size-4 ml-2" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="size-4 ml-2" />
            PDF
          </Button>
          
          {/* Report Type Buttons */}
          <Button variant="outline" size="sm">
            <Layers className="size-4 ml-2" />
            تقسيم منتج
          </Button>
          <Button variant="outline" size="sm">
            <Zap className="size-4 ml-2" />
            تقسيم سريع
          </Button>
          <Button onClick={showAllData} variant="outline" size="sm">
            <Calendar className="size-4 ml-2" />
            الكل
          </Button>
          <Button onClick={filterLastWeek} variant="outline" size="sm">
            <Clock className="size-4 ml-2" />
            آخر أسبوع
          </Button>
          <Button onClick={filterLastMonth} variant="outline" size="sm">
            <CalendarDays className="size-4 ml-2" />
            آخر شهر
          </Button>
          <Button onClick={filterLastYear} variant="outline" size="sm">
            <Clock className="size-4 ml-2" />
            آخر سنة
          </Button>
          
          {/* Date Range */}
          <div className="flex items-center gap-2 border-r pr-3 mr-2">
            <Label className="text-sm whitespace-nowrap">من</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate) {
                  filterByDateRange(e.target.value, endDate);
                }
              }}
              className="w-32 h-8 text-xs"
            />
            <Label className="text-sm whitespace-nowrap">إلى</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (startDate) {
                  filterByDateRange(startDate, e.target.value);
                }
              }}
              className="w-32 h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الربح / الخسارة
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <div className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              Fr {profitLoss.toLocaleString('ar-EG')}{profitLoss < 0 ? '-' : ''}
            </div>
          </CardContent>
        </Card>
        <Card dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الكمية المتبقية
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <div className="text-2xl font-bold">
              {remainingQuantity.toLocaleString('ar-EG')}
            </div>
          </CardContent>
        </Card>
        <Card dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الصادر
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <div className="text-2xl font-bold">
              Fr {totalExport.toLocaleString('ar-EG')}
            </div>
          </CardContent>
        </Card>
        <Card dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الوارد
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <div className="text-2xl font-bold">
              Fr {totalImport.toLocaleString('ar-EG')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الحركات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-right">{item.date}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={item.type === "صادر" ? "destructive" : "default"}
                      className="font-semibold"
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.product}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">Fr {item.price.toLocaleString('ar-EG')}</TableCell>
                  <TableCell className="text-right font-semibold">
                    Fr {item.total.toLocaleString('ar-EG')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Report Dialog */}
      <Dialog open={quickReportOpen} onOpenChange={setQuickReportOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5" />
              التقرير السريع
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">من</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">إلى</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setQuickReportOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              <FileSpreadsheet className="size-4 ml-2" />
              CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="size-4 ml-2" />
              PDF
            </Button>
            <Button onClick={handleQuickReport}>
              <Printer className="size-4 ml-2" />
              طباعة
            </Button>
          </DialogFooter>
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
    </div>
  );
}
