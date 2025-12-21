import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    contact: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suppliers", args);
  },
});

export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
