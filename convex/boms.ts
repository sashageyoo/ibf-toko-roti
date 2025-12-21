import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all BOMs with product details
export const list = query({
  args: {},
  handler: async (ctx) => {
    const boms = await ctx.db.query("boms").collect();

    const bomsWithDetails = await Promise.all(
      boms.map(async (bom) => {
        const product = await ctx.db.get(bom.productId);
        const bomItems = await ctx.db
          .query("bomItems")
          .withIndex("by_bom", (q) => q.eq("bomId", bom._id))
          .collect();

        return {
          ...bom,
          productName: product?.name,
          productSku: product?.sku,
          ingredientCount: bomItems.length,
        };
      }),
    );

    return bomsWithDetails;
  },
});

// Get a single BOM with all ingredients
export const get = query({
  args: { id: v.id("boms") },
  handler: async (ctx, args) => {
    const bom = await ctx.db.get(args.id);
    if (!bom) return null;

    const product = await ctx.db.get(bom.productId);
    const bomItems = await ctx.db
      .query("bomItems")
      .withIndex("by_bom", (q) => q.eq("bomId", bom._id))
      .collect();

    const ingredients = await Promise.all(
      bomItems.map(async (item) => {
        const material = await ctx.db.get(item.materialId);
        return {
          ...item,
          materialName: material?.name,
          materialUnit: material?.unit,
          materialSku: material?.sku,
        };
      }),
    );

    return {
      ...bom,
      productName: product?.name,
      productSku: product?.sku,
      ingredients,
    };
  },
});

// Create a new BOM
export const create = mutation({
  args: {
    productId: v.id("finishedProducts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("boms", args);
  },
});

// Add ingredient to BOM
export const addIngredient = mutation({
  args: {
    bomId: v.id("boms"),
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate material exists
    const material = await ctx.db.get(args.materialId);
    if (!material) {
      throw new Error("Raw material not found");
    }

    return await ctx.db.insert("bomItems", args);
  },
});

// Remove ingredient from BOM
export const removeIngredient = mutation({
  args: { id: v.id("bomItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Delete BOM and its items
export const remove = mutation({
  args: { id: v.id("boms") },
  handler: async (ctx, args) => {
    // Delete all BOM items first
    const bomItems = await ctx.db
      .query("bomItems")
      .withIndex("by_bom", (q) => q.eq("bomId", args.id))
      .collect();

    for (const item of bomItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
  },
});

// MRP Calculation - Calculate requirements for a production run
export const calculateRequirements = query({
  args: {
    bomId: v.id("boms"),
    targetQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const bom = await ctx.db.get(args.bomId);
    if (!bom) throw new Error("BOM not found");

    const bomItems = await ctx.db
      .query("bomItems")
      .withIndex("by_bom", (q) => q.eq("bomId", args.bomId))
      .collect();

    const requirements = await Promise.all(
      bomItems.map(async (item) => {
        const material = await ctx.db.get(item.materialId);
        if (!material) return null;

        // Get total stock from batches
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_material", (q) => q.eq("materialId", item.materialId))
          .collect();

        const currentStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        const requiredAmount = item.quantity * args.targetQuantity;

        return {
          materialId: item.materialId,
          materialName: material.name,
          materialUnit: material.unit,
          requiredAmount,
          currentStock,
          isShortage: currentStock < requiredAmount,
          shortageAmount: Math.max(0, requiredAmount - currentStock),
        };
      }),
    );

    return requirements.filter(Boolean);
  },
});
