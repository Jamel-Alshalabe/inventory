// Dashboard Service for Laravel Backend Integration
import { apiClient } from './api-client';
import type { DashboardStats } from './api-client';

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
    return apiClient.getDashboardStats(warehouseId);
  }

  public async getTopProducts(warehouseId?: number, limit: number = 10) {
    // Use the dashboard stats which includes top products
    const stats = await apiClient.getDashboardStats(warehouseId);
    return stats.topProducts.slice(0, limit);
  }

  public async getDailyMovements(warehouseId?: number, days: number = 30) {
    // Use the movements report API method with correct parameters
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return apiClient.getMovementsReport({ 
      warehouse_id: warehouseId,
      start_date: startDate,
      end_date: endDate
    });
  }

  public async getStockSummary(warehouseId?: number) {
    // Use the stock report API method with correct parameters
    return apiClient.getStockReport({ 
      warehouse_id: warehouseId 
    });
  }
}

export const dashboardService = DashboardService.getInstance();
