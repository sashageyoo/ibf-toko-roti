import { mutation } from "./_generated/server"

// Pre-hashed passwords (bcrypt, 12 rounds)
// admin123 for admin, test123 for other test users
const ADMIN_PASSWORD_HASH = "$2b$12$w/HhaqYWLbSiWzjnGoia3.sg18qFBDJPGkhUM9Ux6XBg/hXuT5Pda"

// Seed admin user
export const seedAdmin = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .unique()

    if (existing) {
      return { message: "Admin user already exists", userId: existing._id }
    }

    const userId = await ctx.db.insert("users", {
      username: "admin",
      name: "Administrator",
      email: "admin@ibfbakery.com",
      password: ADMIN_PASSWORD_HASH,
      role: "admin",
    })

    return {
      message: "Admin user created successfully",
      userId,
      note: "Default password is 'admin123' - change it after first login!"
    }
  },
})

// Seed all test users for each role
export const seedTestUsers = mutation({
  handler: async (ctx) => {
    const testUsers = [
      { username: "manager_inv", name: "Manager Inventaris", email: "manager.inv@ibfbakery.com", role: "manager_inventaris" as const },
      { username: "operator_gudang", name: "Operator Gudang", email: "operator.gudang@ibfbakery.com", role: "operator_gudang" as const },
      { username: "manager_prod", name: "Manager Produksi", email: "manager.prod@ibfbakery.com", role: "manager_produksi" as const },
      { username: "operator_prod", name: "Operator Produksi", email: "operator.prod@ibfbakery.com", role: "operator_produksi" as const },
      { username: "qc", name: "Quality Control", email: "qc@ibfbakery.com", role: "qc" as const },
    ]

    const results = []

    for (const user of testUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", user.username))
        .unique()

      if (existing) {
        results.push({ username: user.username, status: "already exists" })
        continue
      }

      const userId = await ctx.db.insert("users", {
        ...user,
        password: ADMIN_PASSWORD_HASH,
      })

      results.push({ username: user.username, status: "created", userId })
    }

    return {
      message: "Test users seeding complete",
      results,
      note: "Default password for all test users is 'test123'"
    }
  },
})

