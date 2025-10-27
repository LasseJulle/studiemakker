import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    noteId: v.optional(v.id("notes")),
    title: v.string(),
    description: v.optional(v.string()),
    when: v.number(), // timestamp
    type: v.union(
      v.literal("study"),
      v.literal("review"),
      v.literal("exam"),
      v.literal("deadline")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // If noteId provided, check access
    if (args.noteId) {
      const note = await ctx.db.get(args.noteId);
      if (!note) {
        throw new Error("Note not found");
      }

      const canView = note.userId === userId || 
        (args.noteId && await ctx.db
          .query("noteShares")
          .withIndex("by_note_user", (q) => 
            q.eq("noteId", args.noteId!).eq("sharedWithId", userId)
          )
          .unique());

      if (!canView) {
        throw new Error("Not authorized");
      }
    }

    const reminderId = await ctx.db.insert("reminders", {
      userId,
      noteId: args.noteId,
      title: args.title,
      description: args.description,
      when: args.when,
      type: args.type,
      completed: false,
      createdAt: Date.now(),
    });

    return reminderId;
  },
});

export const list = query({
  args: {
    upcoming: v.optional(v.boolean()),
    noteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by noteId if provided
    if (args.noteId) {
      reminders = reminders.filter(r => r.noteId === args.noteId);
    }

    // Filter upcoming if requested
    if (args.upcoming) {
      const now = Date.now();
      reminders = reminders.filter(r => r.when > now && !r.completed);
    }

    // Sort by when
    reminders.sort((a, b) => a.when - b.when);

    // Add note titles
    const result = [];
    for (const reminder of reminders) {
      let noteTitle = null;
      if (reminder.noteId) {
        const note = await ctx.db.get(reminder.noteId);
        noteTitle = note?.title;
      }
      
      result.push({
        ...reminder,
        noteTitle,
      });
    }

    return result;
  },
});

export const complete = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== userId) {
      throw new Error("Reminder not found or not authorized");
    }

    await ctx.db.patch(args.reminderId, { completed: true });
    return { success: true };
  },
});

export const deleteReminder = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== userId) {
      throw new Error("Reminder not found or not authorized");
    }

    await ctx.db.delete(args.reminderId);
    return { success: true };
  },
});

export const generateICS = query({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== userId) {
      throw new Error("Reminder not found or not authorized");
    }

    const startDate = new Date(reminder.when);
    const endDate = new Date(reminder.when + 60 * 60 * 1000); // 1 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyBuddy//StudyBuddy//EN',
      'BEGIN:VEVENT',
      `UID:${reminder._id}@studybuddy.app`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${reminder.title}`,
      `DESCRIPTION:${reminder.description || ''}`,
      `CATEGORIES:${reminder.type.toUpperCase()}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return {
      content: icsContent,
      filename: `${reminder.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
      mimeType: 'text/calendar',
    };
  },
});
