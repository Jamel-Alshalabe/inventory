import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sysUsersTable = pgTable("sys_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // admin | user | auditor
  assignedWarehouseId: integer("assigned_warehouse_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  buyPrice: doublePrecision("buy_price").notNull().default(0),
  sellPrice: doublePrecision("sell_price").notNull().default(0),
  quantity: integer("quantity").notNull().default(0),
  warehouseId: integer("warehouse_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const movementsTable = pgTable("movements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // in | out
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  total: doublePrecision("total").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  items: jsonb("items").notNull(),
  total: doublePrecision("total").notNull(),
  status: text("status").notNull().default("paid"),
  warehouseId: integer("warehouse_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  username: text("username").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
