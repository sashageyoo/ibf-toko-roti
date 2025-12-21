import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all users (for admin)
export const list = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    // Don't return passwords
    return users.map(({ password: _, ...user }) => user);
  },
});

// Create a new user (admin only - password hashing done in API route)
export const create = mutation({
  args: {
    username: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(), // Already hashed from API route
    role: v.union(
      v.literal("admin"),
      v.literal("manager_inventaris"),
      v.literal("operator_gudang"),
      v.literal("manager_produksi"),
      v.literal("operator_produksi"),
      v.literal("qc"),
    ),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existing) {
      throw new Error("Username already exists");
    }

    return await ctx.db.insert("users", args);
  },
});

// Update user (admin only)
export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("manager_inventaris"),
        v.literal("operator_gudang"),
        v.literal("manager_produksi"),
        v.literal("operator_produksi"),
        v.literal("qc"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

// Delete user (admin only)
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update password (hashing done in API route)
export const updatePassword = mutation({
  args: {
    id: v.id("users"),
    password: v.string(), // Already hashed
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { password: args.password });
  },
});
