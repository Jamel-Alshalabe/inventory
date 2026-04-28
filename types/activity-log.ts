export interface ActivityLogItem {
  id: number;
  admin_id?: number | null;
  action: string;
  detail: string;
  username: string;
  created_at: string;
}
