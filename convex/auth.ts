import { query } from "./_generated/server";
import { v } from "convex/values";

// Get user by username (for login verification in API route)
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    return user;
  },
});

// Get user by ID (for session validation)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Don't return password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});
