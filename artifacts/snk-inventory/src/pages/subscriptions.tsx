import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";

// Define Subscription type
interface Subscription {
  id: number;
  user_id: number;
  user: {
    id: number;
    username: string;
  };
  start_date: string;
  end_date: string;
  subscription_cost: number | string; // May come as string from API
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Eye } from "lucide-react";

interface Subscription {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  subscription_cost: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  
  // Form states
  const [userId, setUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [subscriptionCost, setSubscriptionCost] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  const { data: subscriptions = [] as Subscription[] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => customFetch('/api/subscriptions'),
  });

  const { data: usersResponse = { data: [] } } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });
  
  const users = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];

  const createMut = useMutation({
    mutationFn: (data: any) => customFetch('/api/subscriptions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast({ 
        title: "تم إنشاء الاشتراك بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل إنشاء الاشتراك", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      customFetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast({ 
        title: "تم تحديث الاشتراك بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      setEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل تحديث الاشتراك", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => customFetch(`/api/subscriptions/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast({ 
        title: "تم حذف الاشتراك بنجاح",
        variant: "default",
        className: "bg-green-500 text-white border-green-600"
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل حذف الاشتراك", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setUserId("");
    setStartDate("");
    setEndDate("");
    setSubscriptionCost("");
    setIsActive(true);
    setNotes("");
  };

  const getStatusLabel = (isActive: boolean, endDate: string) => {
    if (!isActive) return "ملغي";
    if (new Date(endDate) < new Date()) return "منتهي";
    return "نشط";
  };

  const getStatusBadgeVariant = (isActive: boolean, endDate: string) => {
    if (!isActive) return "destructive";
    if (new Date(endDate) < new Date()) return "secondary";
    return "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">الاشتراكات</h1>
          <p className="text-muted-foreground">إدارة اشتراكات المستخدمين</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 ml-2" />
              إضافة اشتراك جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة اشتراك جديد</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المستخدم</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستخدم" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التكلفة</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={subscriptionCost}
                  onChange={(e) => setSubscriptionCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">تاريخ البدء</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm bg-white text-gray-900"
                  style={{ 
                    colorScheme: 'light',
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm bg-white text-gray-900"
                  style={{ 
                    colorScheme: 'light',
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>حالة الاشتراك</Label>
                <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">نشط</SelectItem>
                    <SelectItem value="false">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>ملاحظات</Label>
                <Input
                  placeholder="ملاحظات إضافية"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => createMut.mutate({
                  user_id: parseInt(userId),
                  start_date: startDate,
                  end_date: endDate,
                  subscription_cost: parseFloat(subscriptionCost) || 0,
                  is_active: isActive,
                  notes: notes || null,
                })}
                disabled={!userId || !startDate || !endDate || createMut.isPending}
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الرقم</TableHead>
              <TableHead className="text-right">المستخدم</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">التكلفة</TableHead>
              <TableHead className="text-right">تاريخ البدء</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription: Subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium text-right">{subscription.id}</TableCell>
                <TableCell className="font-semibold text-right">{subscription.user.username}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={getStatusBadgeVariant(subscription.is_active, subscription.end_date)}>
                    {getStatusLabel(subscription.is_active, subscription.end_date)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">${Number(subscription.subscription_cost).toFixed(2)}</TableCell>
                <TableCell className="text-right">{subscription.start_date}</TableCell>
                <TableCell className="text-right">{subscription.end_date}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSubscription(subscription);
                        setViewOpen(true);
                      }}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSubscription(subscription);
                        setUserId(subscription.user_id.toString());
                        // Convert ISO dates to local date format (YYYY-MM-DD)
                        const formattedStartDate = subscription.start_date ? 
                          new Date(subscription.start_date).toLocaleDateString('en-CA') : '';
                        const formattedEndDate = subscription.end_date ? 
                          new Date(subscription.end_date).toLocaleDateString('en-CA') : '';
                        setStartDate(formattedStartDate);
                        setEndDate(formattedEndDate);
                        setSubscriptionCost(subscription.subscription_cost.toString());
                        setIsActive(subscription.is_active);
                        setNotes(subscription.notes || "");
                        console.log('Edit subscription data:', {
                          start_date: subscription.start_date,
                          end_date: subscription.end_date,
                          formattedStartDate,
                          formattedEndDate,
                          localStartDate: subscription.start_date ? new Date(subscription.start_date) : null,
                          localEndDate: subscription.end_date ? new Date(subscription.end_date) : null
                        });
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSubscription(subscription);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الاشتراك</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">رقم الاشتراك</Label>
                  <p className="font-semibold">#{selectedSubscription.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">المستخدم</Label>
                  <p className="font-semibold">{selectedSubscription.user.username}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">الحالة</Label>
                  <Badge variant={getStatusBadgeVariant(selectedSubscription.is_active, selectedSubscription.end_date)}>
                    {getStatusLabel(selectedSubscription.is_active, selectedSubscription.end_date)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">التكلفة</Label>
                  <p className="font-semibold">${Number(selectedSubscription.subscription_cost).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">تاريخ البدء</Label>
                  <p className="font-semibold">{selectedSubscription.start_date}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">تاريخ الانتهاء</Label>
                  <p className="font-semibold">{selectedSubscription.end_date}</p>
                </div>
              </div>
              {selectedSubscription.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">ملاحظات</Label>
                  <p className="font-semibold">{selectedSubscription.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الاشتراك</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المستخدم</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التكلفة</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={subscriptionCost}
                onChange={(e) => setSubscriptionCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>حالة الاشتراك</Label>
              <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">نشط</SelectItem>
                  <SelectItem value="false">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">تاريخ البدء</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm bg-white text-gray-900"
                style={{ 
                  colorScheme: 'light',
                  backgroundColor: 'white',
                  color: '#111827'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">تاريخ الانتهاء</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm bg-white text-gray-900"
                style={{ 
                  colorScheme: 'light',
                  backgroundColor: 'white',
                  color: '#111827'
                }}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>ملاحظات</Label>
              <Input
                placeholder="ملاحظات إضافية"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (selectedSubscription) {
                  updateMut.mutate({
                    id: selectedSubscription.id,
                    data: {
                      start_date: startDate,
                      end_date: endDate,
                      subscription_cost: parseFloat(subscriptionCost) || 0,
                      is_active: isActive,
                      notes: notes || null,
                    }
                  });
                }
              }}
              disabled={!selectedSubscription || updateMut.isPending}
            >
              تحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              هل أنت متأكد من أنك تريد حذف اشتراك المستخدم "<span className="font-semibold text-foreground">{selectedSubscription?.user.username}</span>"؟
            </p>
            <p className="text-sm text-destructive">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSubscription) {
                  deleteMut.mutate(selectedSubscription.id);
                }
              }}
              disabled={deleteMut.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
