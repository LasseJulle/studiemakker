import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const set = mutation({
  args: {
    noteId: v.id("notes"),
    cursor: v.optional(v.number()),
    selection: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user can view the note
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    const canView = note.userId === userId || 
      await ctx.db
        .query("noteShares")
        .withIndex("by_note_user", (q) => 
          q.eq("noteId", args.noteId).eq("sharedWithId", userId)
        )
        .unique();

    if (!canView) {
      throw new Error("Not authorized");
    }

    // Update or create presence
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_note_user", (q) => 
        q.eq("noteId", args.noteId).eq("userId", userId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursor: args.cursor,
        selection: args.selection,
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("presence", {
        noteId: args.noteId,
        userId,
        cursor: args.cursor,
        selection: args.selection,
        lastSeen: now,
      });
    }

    return { success: true };
  },
});

export const list = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user can view the note
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return [];
    }

    const canView = note.userId === userId || 
      await ctx.db
        .query("noteShares")
        .withIndex("by_note_user", (q) => 
          q.eq("noteId", args.noteId).eq("sharedWithId", userId)
        )
        .unique();

    if (!canView) {
      return [];
    }

    // Get active presence (last 30 seconds)
    const cutoff = Date.now() - 30000;
    const presences = await ctx.db
      .query("presence")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.gte(q.field("lastSeen"), cutoff))
      .collect();

    const result = [];
    for (const presence of presences) {
      if (presence.userId === userId) continue; // Don't include self
      
      const user = await ctx.db.get(presence.userId);
      if (user) {
        result.push({
          userId: presence.userId,
          name: user.name || user.email,
          email: user.email,
          cursor: presence.cursor,
          selection: presence.selection,
          lastSeen: presence.lastSeen,
        });
      }
    }

    return result;
  },
});

export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    // Clean up old presence records (older than 5 minutes)
    const cutoff = Date.now() - 300000;
    const oldPresences = await ctx.db
      .query("presence")
      .filter((q) => q.lt(q.field("lastSeen"), cutoff))
      .collect();

    for (const presence of oldPresences) {
      await ctx.db.delete(presence._id);
    }

    return { cleaned: oldPresences.length };
  },
});
