import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { api } from "@/services/api/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, Filter, RefreshCw, Calendar, User, Activity } from "lucide-react";

interface ActivityLogItem {
  id: number;
  adminId: number | null;
  logName: string;
  description: string;
  subjectType: string | null;
  subjectId: number | null;
  causerType: string | null;
  causerId: number | null;
  causerUsername: string;
  properties: Record<string, any> | null;
  batchUuid: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function LogsPage() {
  const { user } = useApp();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState("50");

  const { data: response = { data: [] }, isLoading, refetch } = useQuery({
    queryKey: ["activity-logs", limit],
    queryFn: () => api.getLogs(parseInt(limit)),
  });

  const logs = response.data || [];
  
  const filteredLogs = logs.filter((log: ActivityLogItem) =>
    log.logName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.causerUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subjectType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatSubjectType = (type: string | null) => {
    if (!type) return '-';
    const parts = type.split('\\');
    return parts[parts.length - 1];
  };

  const getActionColor = (action: string) => {
    if (!action) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      'إنشاء': 'bg-green-100 text-green-800',
      'حذف': 'bg-red-100 text-red-800',
      'تحديث': 'bg-blue-100 text-blue-800',
      'تغيير': 'bg-yellow-100 text-yellow-800',
      'تسجيل': 'bg-purple-100 text-purple-800',
      'خروج': 'bg-gray-100 text-gray-800',
      'إضافة': 'bg-green-100 text-green-800',
      'تعديل': 'bg-blue-100 text-blue-800',
      'إلغاء': 'bg-orange-100 text-orange-800',
      'استيراد': 'bg-cyan-100 text-cyan-800',
      'تصدير': 'bg-indigo-100 text-indigo-800',
    };
    
    for (const [key, color] of Object.entries(colors)) {
      if (action.includes(key)) return color;
    }
    return 'bg-gray-100 text-gray-800';
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "تم تحديث السجل" });
  };

  return (
    <div className="space-y-6 max-w-8xl">
      <div>
        <h1 className="text-2xl font-bold">سجل العمليات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          عرض جميع العمليات التي تمت في النظام
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">بحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="ابحث عن عملية، مستخدم، أو تفاصيل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-32">
            <Label htmlFor="limit">عدد النتائج</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Logs Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">العمليات</h2>
          <Badge variant="secondary">
            {filteredLogs.length} عملية
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد عمليات للعرض</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="w-[120px] text-right font-semibold text-sm">العملية</TableHead>
                    <TableHead className="w-[140px] text-right font-semibold text-sm">المستخدم</TableHead>
                    <TableHead className="min-w-[200px] text-right font-semibold text-sm">الوصف</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold text-sm">النموذج</TableHead>
                    <TableHead className="w-[90px] text-right font-semibold text-sm">المدير</TableHead>
                    <TableHead className="w-[160px] text-right font-semibold text-sm">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: ActivityLogItem) => (
                    <TableRow key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex justify-center">
                          <Badge className={`${getActionColor(log.logName)} text-xs px-2 py-1 font-medium`}>
                            {log.logName}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm text-right">{log.causerUsername}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-right">
                          {log.description && (
                            <p className="text-sm mb-2 leading-relaxed">{log.description}</p>
                          )}
                          {log.properties && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium mb-1">
                                Properties ▼
                              </summary>
                              <pre className="whitespace-pre-wrap bg-muted p-2 rounded mt-1 text-xs leading-relaxed">
                                {JSON.stringify(log.properties, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-center">
                          {log.subjectType ? (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              {formatSubjectType(log.subjectType)} #{log.subjectId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-center">
                          {log.adminId ? (
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              {log.adminId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1 justify-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="text-right">{formatDate(log.createdAt)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>

   
    </div>
  );
}
