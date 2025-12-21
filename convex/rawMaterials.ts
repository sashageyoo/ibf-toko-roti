import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all raw materials with their total stock
export const list = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("rawMaterials").collect();

    // Calculate total stock for each material from batches
    const materialsWithStock = await Promise.all(
      materials.map(async (material) => {
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_material", (q) => q.eq("materialId", material._id))
          .collect();

        const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

        // Calculate available stock (only released batches)
        const availableStock = batches
          .filter((b) => b.qcStatus === "release" || !b.qcStatus)
          .reduce((sum, batch) => sum + batch.quantity, 0);

        const isLowStock = availableStock < material.minStock;

        return {
          ...material,
          totalStock,
          availableStock,
          isLowStock,
        };
      }),
    );

    return materialsWithStock;
  },
});

// Get a single raw material by ID
export const get = query({
  args: { id: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new raw material
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if SKU already exists
    const existing = await ctx.db
      .query("rawMaterials")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (existing) {
      throw new Error("SKU already exists");
    }

    return await ctx.db.insert("rawMaterials", args);
  },
});

// Update a raw material
export const update = mutation({
  args: {
    id: v.id("rawMaterials"),
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete a raw material
export const remove = mutation({
  args: { id: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    // Check if material is used in any BOM
    const bomItems = await ctx.db
      .query("bomItems")
      .filter((q) => q.eq(q.field("materialId"), args.id))
      .first();

    if (bomItems) {
      throw new Error("Cannot delete: material is used in a recipe");
    }

    await ctx.db.delete(args.id);
  },
});
