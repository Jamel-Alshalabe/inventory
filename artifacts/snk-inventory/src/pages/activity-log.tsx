import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Search, Filter, RefreshCw, Trash2, Calendar, User, Activity } from "lucide-react";

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

export default function ActivityLogPage() {
  const { user } = useApp();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState("50");

  const { data: logsResponse = [], isLoading, refetch } = useQuery({
    queryKey: ["activity-logs", limit],
    queryFn: () => api.getLogs(parseInt(limit)),
  });

  // Extract logs array from response
  const logs = Array.isArray(logsResponse) ? logsResponse : ((logsResponse as any)?.data || []);

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
    <div className="space-y-6 w-full">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">سجل العمليات</h1>
          <p className="text-gray-400 text-sm mt-1">
            عرض جميع العمليات التي تمت في النظام
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gray-800 text-gray-300 hover:bg-gray-700 py-1.5 px-4 text-sm border-none">
            {filteredLogs.length} عملية سجلت
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-[#111127] border-gray-700 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 text-right">
            <Label htmlFor="search" className="text-gray-400 mb-1.5 text-xs font-bold uppercase tracking-wider block">بحث سريع</Label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="search"
                placeholder="ابحث عن عملية، مستخدم، أو تفاصيل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-[#0f0f1a] border-gray-800 text-white focus:border-blue-500/50 h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="w-full md:w-40 text-right">
            <Label htmlFor="limit" className="text-gray-400 mb-1.5 text-xs font-bold uppercase tracking-wider block">عدد النتائج</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="bg-[#0f0f1a] border-gray-800 text-white h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111127] border-gray-800 text-white">
                <SelectItem value="25">25 سجل</SelectItem>
                <SelectItem value="50">50 سجل</SelectItem>
                <SelectItem value="100">100 سجل</SelectItem>
                <SelectItem value="200">200 سجل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 h-11 px-6 rounded-xl transition-all font-bold"
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Logs */}
      <div className="bg-[#111127] border border-gray-800/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0f0f1a] text-gray-400 border-b border-gray-800">
                <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-widest">العملية</th>
                <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-widest">المستخدم</th>
                <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-widest">النموذج</th>
                <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-widest">الوصف</th>
                <th className="py-4 px-6 text-right font-bold text-xs uppercase tracking-widest">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-8 text-center text-gray-500">جاري تحميل سجلات النشاط...</td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-500">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg">لا توجد عمليات مسجلة حالياً</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: ActivityLogItem) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <Badge className={`${getActionColor(log.logName)} border-none px-3 py-1 text-[11px] font-black rounded-lg shadow-sm`}>
                        {log.logName}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                          <User className="size-4" />
                        </div>
                        <span className="font-bold text-gray-200">{log.causerUsername}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {log.subjectType ? (
                        <div className="flex flex-col">
                          <span className="text-blue-400 font-mono text-[11px] bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 w-fit">
                            {formatSubjectType(log.subjectType)}
                          </span>
                          <span className="text-gray-500 text-[10px] mt-1">ID: #{log.subjectId}</span>
                        </div>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="py-4 px-6 max-w-md">
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-2" title={log.description}>
                        {log.description}
                      </p>
                      {log.properties && (
                        <details className="mt-2 group">
                          <summary className="text-[10px] text-blue-500/50 hover:text-blue-400 cursor-pointer list-none flex items-center gap-1 transition-colors font-bold uppercase tracking-tighter">
                            <span>تفاصيل JSON</span>
                          </summary>
                          <div className="mt-2 text-[10px] text-gray-500 bg-black/20 p-3 rounded-lg border border-gray-800/50 font-mono overflow-x-auto shadow-inner">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.properties, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-500 text-[11px] font-medium">
                        <Calendar className="size-3.5" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
