import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users (Simple role management with authentication)
  users: defineTable({
    username: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(), // bcrypt hashed
    role: v.union(
      v.literal("admin"),
      v.literal("manager_inventaris"),
      v.literal("operator_gudang"),
      v.literal("manager_produksi"),
      v.literal("operator_produksi"),
      v.literal("qc")
    ),
  }).index("by_username", ["username"]),

  // Suppliers
  suppliers: defineTable({
    name: v.string(),
    contact: v.string(),
  }),

  // Raw Materials (Bahan Baku)
  rawMaterials: defineTable({
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
  }).index("by_sku", ["sku"]),

  // Finished Products (Produk Jadi)
  finishedProducts: defineTable({
    name: v.string(),
    sku: v.string(),
    unit: v.string(),
    minStock: v.number(),
    price: v.optional(v.number()),
    // Shelf life in days (e.g., bread lasts 3 days)
    shelfLifeDays: v.optional(v.number()),
  }).index("by_sku", ["sku"]),

  // Raw Material Batches (for FEFO tracking)
  batches: defineTable({
    materialId: v.id("rawMaterials"),
    supplierId: v.optional(v.id("suppliers")),
    batchNumber: v.string(),
    quantity: v.number(),
    expiryDate: v.number(),
    receivedDate: v.number(),
    // QC Status: pending (needs review), release (approved), hold (temporary), reject (failed)
    qcStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("release"),
      v.literal("hold"),
      v.literal("reject")
    )),
  })
    .index("by_material", ["materialId"])
    .index("by_expiry", ["materialId", "expiryDate"])
    .index("by_qc_status", ["qcStatus"]),

  // Finished Product Stock (per production run, for FEFO)
  productStock: defineTable({
    productId: v.id("finishedProducts"),
    productionRunId: v.optional(v.id("productionRuns")),
    quantity: v.number(),
    expiryDate: v.number(),
    producedDate: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_expiry", ["productId", "expiryDate"]),

  // BOM (Recipes)
  boms: defineTable({
    productId: v.id("finishedProducts"),
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_product", ["productId"]),

  // BOM Details (Ingredients per recipe)
  bomItems: defineTable({
    bomId: v.id("boms"),
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
  }).index("by_bom", ["bomId"]),

  // Production Runs (Planning & Execution)
  productionRuns: defineTable({
    bomId: v.id("boms"),
    status: v.union(v.literal("planned"), v.literal("completed"), v.literal("cancelled")),
    targetQuantity: v.number(),
    producedQuantity: v.optional(v.number()),
    rejectedQuantity: v.optional(v.number()),
    notes: v.optional(v.string()),
    startDate: v.number(),
    completedDate: v.optional(v.number()),
  }),

  // Material Requests (Production → Warehouse workflow)
  materialRequests: defineTable({
    requestedBy: v.id("users"),
    materialId: v.id("rawMaterials"),
    quantity: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("completed")
    ),
    approvedBy: v.optional(v.id("users")),
    executedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_requester", ["requestedBy"]),

  // Stock Adjustments (with approval workflow)
  stockAdjustments: defineTable({
    batchId: v.id("batches"),
    requestedBy: v.id("users"),
    adjustmentType: v.union(v.literal("increase"), v.literal("decrease")),
    quantity: v.number(),
    reason: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    approvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_batch", ["batchId"]),
})
