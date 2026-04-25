// Dashboard Service for Laravel Backend Integration
import { api } from './api';
import type { DashboardStats } from './api';

export class DashboardService {
  private static instance: DashboardService;

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  public async getDashboardStats(warehouseId?: number): Promise<DashboardStats> {
    return api.getDashboard(warehouseId ? { warehouseId: warehouseId } : undefined);
  }

  public async getTopProducts(warehouseId?: number, limit: number = 10) {
    // Use the dashboard stats which includes top products
    const stats = await api.getDashboard(warehouseId ? { warehouseId: warehouseId } : undefined);
    return stats.topProducts.slice(0, limit);
  }

  public async getDailyMovements(warehouseId?: number, days: number = 30) {
    // Use the movements report API method with correct parameters
    const params: any = { days };
    if (warehouseId) params.warehouseId = warehouseId;
    return api.getMovementsReport(params);
  }

  public async getStockSummary(warehouseId?: number) {
    // Use the stock report API method with correct parameters
    return api.getReport({ 
      type: 'stock',
      warehouseId: warehouseId
    });
  }
}

export const dashboardService = DashboardService.getInstance();
