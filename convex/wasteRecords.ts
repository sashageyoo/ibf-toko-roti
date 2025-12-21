import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all waste records
export const list = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("wasteRecords").collect();

    // Enrich with material details
    const recordsWithDetails = await Promise.all(
      records.map(async (record) => {
        const material = await ctx.db.get(record.materialId);

        return {
          ...record,
          materialName: material?.name,
          materialUnit: material?.unit,
        };
      }),
    );

    // Sort by disposedAt descending (newest first)
    return recordsWithDetails.sort((a, b) => b.disposedAt - a.disposedAt);
  },
});

// Get waste records by material
export const listByMaterial = query({
  args: { materialId: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("wasteRecords")
      .withIndex("by_material", (q) => q.eq("materialId", args.materialId))
      .collect();

    const material = await ctx.db.get(args.materialId);

    return records
      .map((record) => ({
        ...record,
        materialName: material?.name,
        materialUnit: material?.unit,
      }))
      .sort((a, b) => b.disposedAt - a.disposedAt);
  },
});

// Create a waste record (called during expired batch disposal)
export const create = mutation({
  args: {
    originalBatchId: v.string(),
    batchNumber: v.string(),
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
    expiryDate: v.number(),
    disposedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wasteRecords", {
      ...args,
      disposedAt: Date.now(),
    });
  },
});

// Get waste summary statistics
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("wasteRecords").collect();

    // Group by material
    const byMaterial: Record<string, { name: string; totalQuantity: number; count: number }> = {};

    for (const record of records) {
      const material = await ctx.db.get(record.materialId);
      const key = record.materialId;

      if (!byMaterial[key]) {
        byMaterial[key] = {
          name: material?.name || "Unknown",
          totalQuantity: 0,
          count: 0,
        };
      }

      byMaterial[key].totalQuantity += record.quantity;
      byMaterial[key].count++;
    }

    return {
      totalRecords: records.length,
      byMaterial: Object.entries(byMaterial).map(([id, data]) => ({
        materialId: id,
        ...data,
      })),
    };
  },
});
