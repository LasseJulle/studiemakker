import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const invite = mutation({
  args: {
    noteId: v.id("notes"),
    targetEmail: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.targetEmail))
      .unique();

    if (!targetUser) {
      throw new Error("Bruger ikke fundet");
    }

    // Check if already shared
    const existing = await ctx.db
      .query("noteShares")
      .withIndex("by_note_user", (q) => 
        q.eq("noteId", args.noteId).eq("sharedWithId", targetUser._id)
      )
      .unique();

    if (existing) {
      // Update role
      await ctx.db.patch(existing._id, { role: args.role });
      return { success: true, updated: true };
    }

    // Create new share
    await ctx.db.insert("noteShares", {
      noteId: args.noteId,
      ownerId: userId,
      sharedWithId: targetUser._id,
      role: args.role,
      createdAt: Date.now(),
    });

    return { success: true, sharedWith: targetUser.email };
  },
});

export const list = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      return [];
    }

    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();

    const result = [];
    for (const share of shares) {
      const user = await ctx.db.get(share.sharedWithId);
      if (user) {
        result.push({
          _id: share._id,
          email: user.email,
          name: user.name,
          role: share.role,
          createdAt: share.createdAt,
        });
      }
    }

    return result;
  },
});

export const updateRole = mutation({
  args: {
    shareId: v.id("noteShares"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const share = await ctx.db.get(args.shareId);
    if (!share || share.ownerId !== userId) {
      throw new Error("Share not found or not authorized");
    }

    await ctx.db.patch(args.shareId, { role: args.role });
    return { success: true };
  },
});

export const revoke = mutation({
  args: { shareId: v.id("noteShares") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const share = await ctx.db.get(args.shareId);
    if (!share || share.ownerId !== userId) {
      throw new Error("Share not found or not authorized");
    }

    await ctx.db.delete(args.shareId);
    return { success: true };
  },
});

export const getSharedNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithId", userId))
      .collect();

    const result = [];
    for (const share of shares) {
      const note = await ctx.db.get(share.noteId);
      const owner = await ctx.db.get(share.ownerId);
      if (note && owner) {
        result.push({
          ...note,
          role: share.role,
          ownerName: owner.name || owner.email,
          sharedAt: share.createdAt,
        });
      }
    }

    return result;
  },
});

export const canEdit = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return false;
    }

    // Owner can always edit
    if (note.userId === userId) {
      return true;
    }

    // Check if shared with editor role
    const share = await ctx.db
      .query("noteShares")
      .withIndex("by_note_user", (q) => 
        q.eq("noteId", args.noteId).eq("sharedWithId", userId)
      )
      .unique();

    return share?.role === "editor";
  },
});

export const canView = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return false;
    }

    // Owner can always view
    if (note.userId === userId) {
      return true;
    }

    // Check if shared
    const share = await ctx.db
      .query("noteShares")
      .withIndex("by_note_user", (q) => 
        q.eq("noteId", args.noteId).eq("sharedWithId", userId)
      )
      .unique();

    return !!share;
  },
});
