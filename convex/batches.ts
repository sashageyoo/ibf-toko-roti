import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all batches for a raw material (with real-time expiry check)
export const listByMaterial = query({
  args: { materialId: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_expiry", (q) => q.eq("materialId", args.materialId))
      .collect();

    const material = await ctx.db.get(args.materialId);
    const now = Date.now();

    return batches.map((batch) => ({
      ...batch,
      materialName: material?.name,
      materialUnit: material?.unit,
      isExpired: batch.expiryDate < now && batch.qcStatus !== "expired",
    }));
  },
});

// Get all batches with material details (with real-time expiry check)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db.query("batches").collect();
    const now = Date.now();

    const batchesWithDetails = await Promise.all(
      batches.map(async (batch) => {
        const material = await ctx.db.get(batch.materialId);
        const supplier = batch.supplierId ? await ctx.db.get(batch.supplierId) : null;

        return {
          ...batch,
          materialName: material?.name,
          materialUnit: material?.unit,
          supplierName: supplier?.name,
          isExpired: batch.expiryDate < now && batch.qcStatus !== "expired",
        };
      }),
    );

    return batchesWithDetails;
  },
});

// Receive new stock (create a batch with pending QC status) and log transaction
export const receiveStock = mutation({
  args: {
    materialId: v.id("rawMaterials"),
    supplierId: v.optional(v.id("suppliers")),
    batchNumber: v.string(),
    quantity: v.number(),
    expiryDate: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...batchData } = args;

    // Create the batch
    const batchId = await ctx.db.insert("batches", {
      ...batchData,
      receivedDate: Date.now(),
      qcStatus: "pending", // All new batches require QC review
    });

    // Log the transaction
    await ctx.db.insert("transactionLogs", {
      type: "batch_received",
      batchId: batchId,
      batchNumber: args.batchNumber,
      materialId: args.materialId,
      quantity: args.quantity,
      userId,
      createdAt: Date.now(),
    });

    return batchId;
  },
});

// FEFO Reserve Stock - deducts stock from oldest RELEASED batches first (excludes expired)
export const reserveStock = mutation({
  args: {
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
    userId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_expiry", (q) => q.eq("materialId", args.materialId))
      .collect();

    const now = Date.now();

    // Only use released batches that are NOT expired for FEFO
    // Filter: only released status AND not past expiry date
    const releasedBatches = batches.filter((b) => {
      const isReleased = b.qcStatus === "release" || b.qcStatus === undefined;
      const isNotPastExpiry = b.expiryDate >= now;
      return isReleased && isNotPastExpiry;
    });

    // Sort by expiry date (FEFO)
    releasedBatches.sort((a, b) => a.expiryDate - b.expiryDate);

    const totalStock = releasedBatches.reduce((sum, batch) => sum + batch.quantity, 0);

    if (totalStock < args.quantity) {
      throw new Error(
        `Insufficient released stock. Available: ${totalStock}, Requested: ${args.quantity}`,
      );
    }

    let remaining = args.quantity;
    const usedBatches: { batchId: string; batchNumber: string; quantity: number }[] = [];

    for (const batch of releasedBatches) {
      if (remaining <= 0) break;

      const toDeduct = Math.min(batch.quantity, remaining);
      const newQuantity = batch.quantity - toDeduct;

      if (newQuantity === 0) {
        await ctx.db.delete(batch._id);
      } else {
        await ctx.db.patch(batch._id, { quantity: newQuantity });
      }

      // Log the usage transaction
      await ctx.db.insert("transactionLogs", {
        type: "batch_used",
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        materialId: args.materialId,
        quantity: toDeduct,
        userId: args.userId,
        notes: args.notes,
        createdAt: Date.now(),
      });

      usedBatches.push({ batchId: batch._id, batchNumber: batch.batchNumber, quantity: toDeduct });
      remaining -= toDeduct;
    }

    return usedBatches;
  },
});

// Delete a batch
export const remove = mutation({
  args: { id: v.id("batches") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set QC status for a batch (QC role only)
export const setQcStatus = mutation({
  args: {
    id: v.id("batches"),
    qcStatus: v.union(
      v.literal("pending"),
      v.literal("release"),
      v.literal("hold"),
      v.literal("reject"),
      v.literal("expired"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new Error("Batch not found");

    await ctx.db.patch(args.id, { qcStatus: args.qcStatus });

    return { success: true, newStatus: args.qcStatus };
  },
});

// List batches pending QC review
export const listPendingQc = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_qc_status", (q) => q.eq("qcStatus", "pending"))
      .collect();

    const batchesWithDetails = await Promise.all(
      batches.map(async (batch) => {
        const material = await ctx.db.get(batch.materialId);
        const supplier = batch.supplierId ? await ctx.db.get(batch.supplierId) : null;

        return {
          ...batch,
          materialName: material?.name,
          materialUnit: material?.unit,
          supplierName: supplier?.name,
        };
      }),
    );

    return batchesWithDetails;
  },
});

// Get expired batches (real-time check for batches past expiry date)
export const getExpiredBatches = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db.query("batches").collect();
    const now = Date.now();

    // Filter batches that are past expiry and not already marked as expired
    const expiredBatches = batches.filter(
      (b) => b.expiryDate < now && b.qcStatus !== "expired" && b.qcStatus !== "reject",
    );

    const batchesWithDetails = await Promise.all(
      expiredBatches.map(async (batch) => {
        const material = await ctx.db.get(batch.materialId);
        const supplier = batch.supplierId ? await ctx.db.get(batch.supplierId) : null;

        return {
          ...batch,
          materialName: material?.name,
          materialUnit: material?.unit,
          supplierName: supplier?.name,
        };
      }),
    );

    return batchesWithDetails;
  },
});

// Mark a batch as expired (auto-trigger or manual)
export const markAsExpired = mutation({
  args: { id: v.id("batches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new Error("Batch not found");

    await ctx.db.patch(args.id, { qcStatus: "expired" });

    return { success: true };
  },
});

// Approve expired batch disposal (QC workflow) - creates waste record and removes batch
export const approveExpiredDisposal = mutation({
  args: {
    id: v.id("batches"),
    userId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new Error("Batch not found");

    // Create waste record
    await ctx.db.insert("wasteRecords", {
      originalBatchId: batch._id,
      batchNumber: batch.batchNumber,
      materialId: batch.materialId,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      disposedBy: args.userId,
      disposedAt: Date.now(),
      notes: args.notes,
    });

    // Log the disposal transaction
    await ctx.db.insert("transactionLogs", {
      type: "batch_expired_disposed",
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      materialId: batch.materialId,
      quantity: batch.quantity,
      userId: args.userId,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Delete the batch from active inventory
    await ctx.db.delete(args.id);

    return { success: true, wastedQuantity: batch.quantity };
  },
});
