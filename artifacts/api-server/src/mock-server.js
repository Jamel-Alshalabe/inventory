import express from "express";
import cors from "cors";

// Mock data for development without database
const mockWarehouses = [
  { id: 1, name: "Main Warehouse", createdAt: new Date().toISOString() },
  { id: 2, name: "Secondary Warehouse", createdAt: new Date().toISOString() },
];

const mockProducts = [
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

const mockMovements = [
  {
    id: 1,
    type: "in",
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
    type: "out",
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

const mockInvoices = [
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

const mockLogs = [
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

const mockDashboardStats = {
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

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  // Simple mock authentication
  if (username === "admin" && password === "admin") {
    res.json({
      user: {
        id: 1,
        username: "admin",
        role: "admin",
        assignedWarehouseId: null,
        assignedWarehouseName: null,
      },
    });
  } else if (username === "user" && password === "user") {
    res.json({
      user: {
        id: 2,
        username: "user",
        role: "user",
        assignedWarehouseId: 1,
        assignedWarehouseName: "Main Warehouse",
      },
    });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  // Mock authenticated user
  res.json({
    id: 1,
    username: "admin",
    role: "admin",
    assignedWarehouseId: null,
    assignedWarehouseName: null,
  });
});

// Warehouse endpoints
app.get("/api/warehouses", (req, res) => {
  res.json(mockWarehouses);
});

app.post("/api/warehouses", (req, res) => {
  const { name } = req.body;
  const newWarehouse = {
    id: mockWarehouses.length + 1,
    name,
    createdAt: new Date().toISOString(),
  };
  mockWarehouses.push(newWarehouse);
  res.json(newWarehouse);
});

// Product endpoints
app.get("/api/products", (req, res) => {
  const { warehouseId } = req.query;
  let products = mockProducts;
  if (warehouseId) {
    products = products.filter(p => p.warehouseId === Number(warehouseId));
  }
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const product = req.body;
  const newProduct = {
    ...product,
    id: mockProducts.length + 1,
    createdAt: new Date().toISOString(),
  };
  mockProducts.push(newProduct);
  res.json(newProduct);
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const index = mockProducts.findIndex(p => p.id === Number(id));
  if (index !== -1) {
    mockProducts[index] = { ...mockProducts[index], ...req.body };
    res.json(mockProducts[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const index = mockProducts.findIndex(p => p.id === Number(id));
  if (index !== -1) {
    mockProducts.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// Movement endpoints
app.get("/api/movements", (req, res) => {
  const { warehouseId } = req.query;
  let movements = mockMovements;
  if (warehouseId) {
    movements = movements.filter(m => m.warehouseId === Number(warehouseId));
  }
  res.json(movements);
});

app.post("/api/movements", (req, res) => {
  const movement = req.body;
  const newMovement = {
    ...movement,
    id: mockMovements.length + 1,
    createdAt: new Date().toISOString(),
  };
  mockMovements.push(newMovement);
  res.json(newMovement);
});

// Invoice endpoints
app.get("/api/invoices", (req, res) => {
  const { warehouseId } = req.query;
  let invoices = mockInvoices;
  if (warehouseId) {
    invoices = invoices.filter(i => i.warehouseId === Number(warehouseId));
  }
  res.json(invoices);
});

app.post("/api/invoices", (req, res) => {
  const invoice = req.body;
  const newInvoice = {
    ...invoice,
    id: mockInvoices.length + 1,
    invoiceNumber: `INV${String(mockInvoices.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };
  mockInvoices.push(newInvoice);
  res.json(newInvoice);
});

// Dashboard endpoint
app.get("/api/dashboard", (req, res) => {
  res.json(mockDashboardStats);
});

// Logs endpoint
app.get("/api/logs", (req, res) => {
  res.json(mockLogs);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`Mock API server running on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /api/auth/login`);
  console.log(`  POST /api/auth/logout`);
  console.log(`  GET  /api/auth/me`);
  console.log(`  GET  /api/warehouses`);
  console.log(`  POST /api/warehouses`);
  console.log(`  GET  /api/products`);
  console.log(`  POST /api/products`);
  console.log(`  PUT  /api/products/:id`);
  console.log(`  DELETE /api/products/:id`);
  console.log(`  GET  /api/movements`);
  console.log(`  POST /api/movements`);
  console.log(`  GET  /api/invoices`);
  console.log(`  POST /api/invoices`);
  console.log(`  GET  /api/dashboard`);
  console.log(`  GET  /api/logs`);
  console.log(`  GET  /api/health`);
});
