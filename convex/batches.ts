import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// Get all batches for a raw material
export const listByMaterial = query({
  args: { materialId: v.id("rawMaterials") },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_expiry", (q) => q.eq("materialId", args.materialId))
      .collect()

    const material = await ctx.db.get(args.materialId)

    return batches.map((batch) => ({
      ...batch,
      materialName: material?.name,
      materialUnit: material?.unit,
    }))
  },
})

// Get all batches with material details
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db.query("batches").collect()

    const batchesWithDetails = await Promise.all(
      batches.map(async (batch) => {
        const material = await ctx.db.get(batch.materialId)
        const supplier = batch.supplierId ? await ctx.db.get(batch.supplierId) : null

        return {
          ...batch,
          materialName: material?.name,
          materialUnit: material?.unit,
          supplierName: supplier?.name,
        }
      }),
    )

    return batchesWithDetails
  },
})

// Receive new stock (create a batch with pending QC status)
export const receiveStock = mutation({
  args: {
    materialId: v.id("rawMaterials"),
    supplierId: v.optional(v.id("suppliers")),
    batchNumber: v.string(),
    quantity: v.number(),
    expiryDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("batches", {
      ...args,
      receivedDate: Date.now(),
      qcStatus: "pending", // All new batches require QC review
    })
  },
})

// FEFO Reserve Stock - deducts stock from oldest RELEASED batches first
export const reserveStock = mutation({
  args: {
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_expiry", (q) => q.eq("materialId", args.materialId))
      .collect()

    // Only use released batches for FEFO (reject/hold batches cannot be used)
    const releasedBatches = batches.filter(b => b.qcStatus === "release" || !b.qcStatus)

    // Sort by expiry date (FEFO)
    releasedBatches.sort((a, b) => a.expiryDate - b.expiryDate)

    const totalStock = releasedBatches.reduce((sum, batch) => sum + batch.quantity, 0)

    if (totalStock < args.quantity) {
      throw new Error(`Insufficient released stock. Available: ${totalStock}, Requested: ${args.quantity}`)
    }

    let remaining = args.quantity
    const usedBatches: { batchId: string; quantity: number }[] = []

    for (const batch of releasedBatches) {
      if (remaining <= 0) break

      const toDeduct = Math.min(batch.quantity, remaining)
      const newQuantity = batch.quantity - toDeduct

      if (newQuantity === 0) {
        await ctx.db.delete(batch._id)
      } else {
        await ctx.db.patch(batch._id, { quantity: newQuantity })
      }

      usedBatches.push({ batchId: batch._id, quantity: toDeduct })
      remaining -= toDeduct
    }

    return usedBatches
  },
})

// Delete a batch
export const remove = mutation({
  args: { id: v.id("batches") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

// Set QC status for a batch (QC role only)
export const setQcStatus = mutation({
  args: {
    id: v.id("batches"),
    qcStatus: v.union(
      v.literal("pending"),
      v.literal("release"),
      v.literal("hold"),
      v.literal("reject")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.id)
    if (!batch) throw new Error("Batch not found")

    await ctx.db.patch(args.id, { qcStatus: args.qcStatus })

    return { success: true, newStatus: args.qcStatus }
  },
})

// List batches pending QC review
export const listPendingQc = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_qc_status", (q) => q.eq("qcStatus", "pending"))
      .collect()

    const batchesWithDetails = await Promise.all(
      batches.map(async (batch) => {
        const material = await ctx.db.get(batch.materialId)
        const supplier = batch.supplierId ? await ctx.db.get(batch.supplierId) : null

        return {
          ...batch,
          materialName: material?.name,
          materialUnit: material?.unit,
          supplierName: supplier?.name,
        }
      }),
    )

    return batchesWithDetails
  },
})
