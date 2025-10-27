import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const log = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    minutes: v.number(),
    activity: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      throw new Error("Not authenticated");
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's already a log for today
    const existingLog = await ctx.db
      .query("progressLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
      .unique();

    if (existingLog) {
      // Update existing log
      await ctx.db.patch(existingLog._id, {
        minutes: existingLog.minutes + args.minutes,
        notesCreated: args.activity === "create" ? existingLog.notesCreated + 1 : existingLog.notesCreated,
        notesUpdated: args.activity === "update" ? existingLog.notesUpdated + 1 : existingLog.notesUpdated,
      });
    } else {
      // Create new log
      await ctx.db.insert("progressLogs", {
        userId: args.userId,
        date: today,
        minutes: args.minutes,
        notesCreated: args.activity === "create" ? 1 : 0,
        notesUpdated: args.activity === "update" ? 1 : 0,
      });
    }

    return { success: true };
  },
});

export const summary = query({
  args: {
    userId: v.id("users"),
    range: v.union(v.literal("week"), v.literal("month"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      return null;
    }

    const now = new Date();
    let startDate: Date;

    switch (args.range) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    
    const logs = await ctx.db
      .query("progressLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

    const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
    const sessionsPerDay = logs.length / Math.max(1, (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Calculate streak
    let streak = 0;
    const sortedLogs = logs.sort((a, b) => b.date.localeCompare(a.date));
    const today = now.toISOString().split('T')[0];
    
    for (let i = 0; i < sortedLogs.length; i++) {
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (sortedLogs[i]?.date === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalMinutes,
      sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
      streak,
      dailyData: logs.map(log => ({
        date: log.date,
        minutes: log.minutes,
        notesCreated: log.notesCreated,
        notesUpdated: log.notesUpdated,
      })),
    };
  },
});

export const logNoteCreated = mutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.runMutation(api.progress.log, {
      userId,
      minutes: 5, // Default 5 minutes for creating a note
      activity: "create",
    });
  },
});

export const logNoteUpdated = mutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.runMutation(api.progress.log, {
      userId,
      minutes: 3, // Default 3 minutes for updating a note
      activity: "update",
    });
  },
});

export const logStudySession = mutation({
  args: {
    minutes: v.number(),
    noteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.runMutation(api.progress.log, {
      userId,
      noteId: args.noteId,
      minutes: args.minutes,
      activity: "study",
    });
  },
});
