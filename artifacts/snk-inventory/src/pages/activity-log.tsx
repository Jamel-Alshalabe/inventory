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
  const logs = Array.isArray(logsResponse) ? logsResponse : (logsResponse?.data || []);

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
    <div className="space-y-6 max-w-6xl">
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

      {/* Activity Logs */}
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
          <div className="space-y-3">
            {filteredLogs.map((log: ActivityLogItem) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <Badge className={getActionColor(log.logName)}>
                    {log.logName}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{log.causerUsername}</span>
                    <span className="text-muted-foreground text-sm">•</span>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(log.createdAt)}
                    </div>
                    {log.subjectType && (
                      <>
                        <span className="text-muted-foreground text-sm">•</span>
                        <Badge variant="outline" className="text-xs">
                          {formatSubjectType(log.subjectType)} #{log.subjectId}
                        </Badge>
                      </>
                    )}
                    {log.adminId && (
                      <>
                        <span className="text-muted-foreground text-sm">•</span>
                        <span className="text-xs text-muted-foreground">Admin: {log.adminId}</span>
                      </>
                    )}
                  </div>
                  {log.description && (
                    <p className="text-sm text-muted-foreground">
                      {log.description}
                    </p>
                  )}
                  {log.properties && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(log.properties, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

     
    </div>
  );
}
