import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all finished products with their total stock
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("finishedProducts").collect();

    // Calculate total stock for each product from productStock
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const stockEntries = await ctx.db
          .query("productStock")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        const totalStock = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);
        const isLowStock = totalStock < product.minStock;

        return {
          ...product,
          totalStock,
          isLowStock,
        };
      }),
    );

    return productsWithStock;
  },
});

// Get a single finished product by ID
export const get = query({
  args: { id: v.id("finishedProducts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new finished product
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
    shelfLifeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if SKU already exists
    const existing = await ctx.db
      .query("finishedProducts")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (existing) {
      throw new Error("SKU already exists");
    }

    return await ctx.db.insert("finishedProducts", args);
  },
});

// Update a finished product
export const update = mutation({
  args: {
    id: v.id("finishedProducts"),
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
    shelfLifeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete a finished product
export const remove = mutation({
  args: { id: v.id("finishedProducts") },
  handler: async (ctx, args) => {
    // Check if product is used in any BOM
    const bom = await ctx.db
      .query("boms")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .first();

    if (bom) {
      throw new Error("Cannot delete: product has a recipe");
    }

    await ctx.db.delete(args.id);
  },
});

// Get stock entries for a product (batch details)
export const getStockEntries = query({
  args: { productId: v.id("finishedProducts") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("productStock")
      .withIndex("by_expiry", (q) => q.eq("productId", args.productId))
      .collect();

    return entries.sort((a, b) => a.expiryDate - b.expiryDate);
  },
});

// Get all stock entries for all products (for batch list view)
export const getAllStockEntries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("productStock").collect();
  },
});

// Deduct stock using FEFO (First-Expired, First-Out)
export const deductStock = mutation({
  args: {
    productId: v.id("finishedProducts"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const stockEntries = await ctx.db
      .query("productStock")
      .withIndex("by_expiry", (q) => q.eq("productId", args.productId))
      .collect();

    // Sort by expiry date (FEFO)
    stockEntries.sort((a, b) => a.expiryDate - b.expiryDate);

    const totalStock = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    if (totalStock < args.quantity) {
      throw new Error(`Insufficient stock. Available: ${totalStock}, Requested: ${args.quantity}`);
    }

    let remaining = args.quantity;
    const usedEntries: { entryId: string; quantity: number }[] = [];

    for (const entry of stockEntries) {
      if (remaining <= 0) break;

      const toDeduct = Math.min(entry.quantity, remaining);
      const newQuantity = entry.quantity - toDeduct;

      if (newQuantity === 0) {
        await ctx.db.delete(entry._id);
      } else {
        await ctx.db.patch(entry._id, { quantity: newQuantity });
      }

      usedEntries.push({ entryId: entry._id, quantity: toDeduct });
      remaining -= toDeduct;
    }

    return usedEntries;
  },
});
