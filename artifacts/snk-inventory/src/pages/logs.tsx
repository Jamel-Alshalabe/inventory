import { useQuery } from "@tanstack/react-query";
import { api, fmtDate, type LogEntry } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function LogsPage() {
  const { data = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => api.get<LogEntry[]>("/logs?limit=300"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سجل العمليات</h1>
        <p className="text-muted-foreground text-sm mt-1">آخر {data.length} عملية في النظام</p>
      </div>
      <Card className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">المستخدم</TableHead>
              <TableHead className="text-right">النشاط</TableHead>
              <TableHead className="text-right">التفاصيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((l) => (
              <TableRow key={l.id} data-testid={`row-log-${l.id}`}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap text-right">
                  {fmtDate(l.createdAt)}
                </TableCell>
                <TableCell className="font-semibold text-right">{l.username || "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{l.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-right">{l.detail}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
