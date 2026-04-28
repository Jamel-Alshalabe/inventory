// Dashboard Service for Laravel Backend Integration
import { api, type DashboardStats } from './api/api';
import type { Dashboard } from '../lib/old_lib/api-client-react/src/generated/api.schemas';

export class DashboardService {
  private static instance: DashboardService;

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  public async getDashboardStats(warehouseId?: number): Promise<Dashboard> {
    return api.getDashboard(warehouseId ? { warehouseId: warehouseId } : undefined);
  }

  public async getTopProducts(warehouseId?: number, limit: number = 10) {
    // Use the dashboard stats which includes low stock or other product info
    const stats = await api.getDashboard(warehouseId ? { warehouseId: warehouseId } : undefined);
    return stats.lowStock.slice(0, limit);
  }

  public async getDailyMovements(warehouseId?: number, days: number = 30) {
    // Use dashboard chart for daily movements
    const stats = await api.getDashboard(warehouseId ? { warehouseId: warehouseId } : undefined);
    return stats.chart;
  }

  public async getStockSummary(warehouseId?: number) {
    // Use the getReport API method with correct parameters
    return api.getReport({ 
      warehouseId: warehouseId
    });
  }
}

export const dashboardService = DashboardService.getInstance();
