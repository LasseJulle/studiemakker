import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const add = mutation({
  args: {
    noteId: v.id("notes"),
    text: v.string(),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    selectionText: v.optional(v.string()),
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
      throw new Error("Not authorized to comment on this note");
    }

    const commentId = await ctx.db.insert("comments", {
      noteId: args.noteId,
      authorId: userId,
      text: args.text,
      selectionStart: args.selectionStart,
      selectionEnd: args.selectionEnd,
      selectionText: args.selectionText,
      resolved: false,
      createdAt: Date.now(),
    });

    return commentId;
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

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .collect();

    const result = [];
    for (const comment of comments) {
      const author = await ctx.db.get(comment.authorId);
      if (author) {
        result.push({
          ...comment,
          authorName: author.name || author.email,
          authorEmail: author.email,
        });
      }
    }

    return result;
  },
});

export const resolve = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const note = await ctx.db.get(comment.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only note owner or comment author can resolve
    if (note.userId !== userId && comment.authorId !== userId) {
      throw new Error("Not authorized to resolve this comment");
    }

    await ctx.db.patch(args.commentId, { resolved: true });
    return { success: true };
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const note = await ctx.db.get(comment.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only note owner or comment author can delete
    if (note.userId !== userId && comment.authorId !== userId) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
    return { success: true };
  },
});
