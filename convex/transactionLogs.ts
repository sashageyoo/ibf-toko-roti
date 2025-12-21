import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all non-archived transaction logs
export const list = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("transactionLogs")
      .filter((q) => q.eq(q.field("archivedAt"), undefined))
      .collect();

    // Sort by createdAt descending (newest first)
    logs.sort((a, b) => b.createdAt - a.createdAt);

    // Enrich with material details
    const logsWithDetails = await Promise.all(
      logs.map(async (log) => {
        let materialName = null;
        if (log.materialId) {
          const material = await ctx.db.get(log.materialId);
          materialName = material?.name;
        }

        return {
          ...log,
          materialName,
        };
      }),
    );

    return logsWithDetails;
  },
});

// Get transaction logs by material
export const listByMaterial = query({
  args: { materialId: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("transactionLogs")
      .withIndex("by_material", (q) => q.eq("materialId", args.materialId))
      .filter((q) => q.eq(q.field("archivedAt"), undefined))
      .collect();

    const material = await ctx.db.get(args.materialId);

    return logs
      .map((log) => ({
        ...log,
        materialName: material?.name,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create a new transaction log (internal helper, used by other mutations)
export const create = mutation({
  args: {
    type: v.union(
      v.literal("batch_received"),
      v.literal("batch_used"),
      v.literal("batch_expired_disposed"),
      v.literal("production_completed"),
    ),
    batchId: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    materialId: v.optional(v.id("rawMaterials")),
    productionRunId: v.optional(v.id("productionRuns")),
    quantity: v.number(),
    userId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactionLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Archive transaction logs older than X days (soft delete)
export const archive = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const logsToArchive = await ctx.db
      .query("transactionLogs")
      .filter((q) =>
        q.and(q.eq(q.field("archivedAt"), undefined), q.lt(q.field("createdAt"), cutoffDate)),
      )
      .collect();

    const archivedAt = Date.now();
    let archivedCount = 0;

    for (const log of logsToArchive) {
      await ctx.db.patch(log._id, { archivedAt });
      archivedCount++;
    }

    return { archivedCount };
  },
});

// Get archived transaction logs (for audit purposes)
export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("transactionLogs")
      .filter((q) => q.neq(q.field("archivedAt"), undefined))
      .collect();

    return logs.sort((a, b) => b.createdAt - a.createdAt);
  },
});
