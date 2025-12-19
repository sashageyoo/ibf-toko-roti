import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// Get all production runs
export const list = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("productionRuns").collect()

    const runsWithDetails = await Promise.all(
      runs.map(async (run) => {
        const bom = await ctx.db.get(run.bomId)
        let productName = "Unknown"

        if (bom) {
          const product = await ctx.db.get(bom.productId)
          productName = product?.name || "Unknown"
        }

        return {
          ...run,
          bomName: bom?.name,
          productName,
        }
      }),
    )

    return runsWithDetails.sort((a, b) => b.startDate - a.startDate)
  },
})

// Create a planned production run
export const plan = mutation({
  args: {
    bomId: v.id("boms"),
    targetQuantity: v.number(),
    startDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("productionRuns", {
      ...args,
      status: "planned",
    })
  },
})

// Execute production - deduct materials and add finished product stock
export const execute = mutation({
  args: {
    id: v.id("productionRuns"),
    producedQuantity: v.number(),
    rejectedQuantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id)
    if (!run) throw new Error("Production run not found")
    if (run.status !== "planned") throw new Error("Can only execute planned runs")

    const bom = await ctx.db.get(run.bomId)
    if (!bom) throw new Error("BOM not found")

    // Get the finished product for shelf life
    const product = await ctx.db.get(bom.productId)
    if (!product) throw new Error("Finished product not found")

    // Get BOM items
    const bomItems = await ctx.db
      .query("bomItems")
      .withIndex("by_bom", (q) => q.eq("bomId", run.bomId))
      .collect()

    // Deduct raw materials using FEFO for each ingredient
    for (const item of bomItems) {
      const requiredQty = item.quantity * run.targetQuantity

      const batches = await ctx.db
        .query("batches")
        .withIndex("by_expiry", (q) => q.eq("materialId", item.materialId))
        .collect()

      // Only use released batches
      const releasedBatches = batches.filter(b => b.qcStatus === "release" || !b.qcStatus)
      releasedBatches.sort((a, b) => a.expiryDate - b.expiryDate)

      const totalStock = releasedBatches.reduce((sum, batch) => sum + batch.quantity, 0)
      if (totalStock < requiredQty) {
        const material = await ctx.db.get(item.materialId)
        throw new Error(`Insufficient stock for ${material?.name}. Available: ${totalStock}, Required: ${requiredQty}`)
      }

      let remaining = requiredQty
      for (const batch of releasedBatches) {
        if (remaining <= 0) break

        const toDeduct = Math.min(batch.quantity, remaining)
        const newQuantity = batch.quantity - toDeduct

        if (newQuantity === 0) {
          await ctx.db.delete(batch._id)
        } else {
          await ctx.db.patch(batch._id, { quantity: newQuantity })
        }

        remaining -= toDeduct
      }
    }

    // Calculate expiry date for finished products
    const shelfLifeDays = product.shelfLifeDays || 3 // Default 3 days for bakery products
    const expiryDate = Date.now() + (shelfLifeDays * 24 * 60 * 60 * 1000)

    // Add finished product stock
    await ctx.db.insert("productStock", {
      productId: bom.productId,
      productionRunId: args.id,
      quantity: args.producedQuantity,
      expiryDate,
      producedDate: Date.now(),
    })

    // Update production run
    await ctx.db.patch(args.id, {
      status: "completed",
      producedQuantity: args.producedQuantity,
      rejectedQuantity: args.rejectedQuantity,
      notes: args.notes,
      completedDate: Date.now(),
    })

    return {
      success: true,
      producedQuantity: args.producedQuantity,
      expiryDate
    }
  },
})

// Cancel a production run
export const cancel = mutation({
  args: { id: v.id("productionRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id)
    if (!run) throw new Error("Production run not found")
    if (run.status !== "planned") throw new Error("Can only cancel planned runs")

    await ctx.db.patch(args.id, { status: "cancelled" })
  },
})
