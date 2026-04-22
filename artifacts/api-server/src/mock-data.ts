// Mock data for development without database
export const mockWarehouses = [
  { id: 1, name: "Main Warehouse", createdAt: new Date().toISOString() },
  { id: 2, name: "Secondary Warehouse", createdAt: new Date().toISOString() },
];

export const mockProducts = [
  {
    id: 1,
    name: "Product A",
    code: "PRD001",
    buyPrice: 100.50,
    sellPrice: 150.00,
    quantity: 50,
    warehouseId: 1,
    warehouseName: "Main Warehouse",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Product B",
    code: "PRD002",
    buyPrice: 75.25,
    sellPrice: 120.00,
    quantity: 25,
    warehouseId: 1,
    warehouseName: "Main Warehouse",
    createdAt: new Date().toISOString(),
  },
];

export const mockMovements = [
  {
    id: 1,
    type: "in" as const,
    productCode: "PRD001",
    productName: "Product A",
    quantity: 10,
    price: 100.50,
    total: 1005.00,
    warehouseId: 1,
    warehouseName: "Main Warehouse",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    type: "out" as const,
    productCode: "PRD002",
    productName: "Product B",
    quantity: 5,
    price: 120.00,
    total: 600.00,
    warehouseId: 1,
    warehouseName: "Main Warehouse",
    createdAt: new Date().toISOString(),
  },
];

export const mockInvoices = [
  {
    id: 1,
    invoiceNumber: "INV001",
    customerName: "Customer A",
    items: [
      {
        productCode: "PRD001",
        productName: "Product A",
        quantity: 2,
        price: 150.00,
        total: 300.00,
      },
    ],
    total: 300.00,
    status: "paid",
    warehouseId: 1,
    warehouseName: "Main Warehouse",
    createdAt: new Date().toISOString(),
  },
];

export const mockLogs = [
  {
    id: 1,
    action: "CREATE",
    detail: "Created new product PRD001",
    username: "admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    action: "UPDATE",
    detail: "Updated product PRD002 quantity",
    username: "admin",
    createdAt: new Date().toISOString(),
  },
];

export const mockDashboardStats = {
  totalProducts: mockProducts.length,
  totalQuantity: mockProducts.reduce((sum, p) => sum + p.quantity, 0),
  stockValue: mockProducts.reduce((sum, p) => sum + (p.quantity * p.buyPrice), 0),
  lowStock: mockProducts.filter(p => p.quantity < 30).length,
  outOfStock: mockProducts.filter(p => p.quantity === 0).length,
  totalInvoices: mockInvoices.length,
  totalSales: mockInvoices.reduce((sum, inv) => sum + inv.total, 0),
  todayIn: mockMovements.filter(m => m.type === "in").reduce((sum, m) => sum + m.total, 0),
  todayOut: mockMovements.filter(m => m.type === "out").reduce((sum, m) => sum + m.total, 0),
  recentMovements: mockMovements.slice(0, 5),
  topProducts: mockProducts.map(p => ({
    productCode: p.code,
    productName: p.name,
    quantity: p.quantity,
  })).slice(0, 5),
};
