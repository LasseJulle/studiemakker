import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get all user notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all study plans
    const studyPlans = await ctx.db
      .query("studyPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get recent mentor chats for feedback
    const recentChats = await ctx.db
      .query("mentorChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);

    // Calculate weekly notes (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weeklyNotes = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = Date.now() - (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      
      const dayNotes = notes.filter(note => 
        note.updatedAt >= dayStart && note.updatedAt < dayEnd
      ).length;
      
      const date = new Date(dayStart);
      weeklyNotes.push({
        day: date.toLocaleDateString('da-DK', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        notes: dayNotes
      });
    }

    // Calculate average grade
    const gradedNotes = notes.filter(note => note.grade !== undefined);
    const avgGrade = gradedNotes.length > 0 
      ? Math.round((gradedNotes.reduce((sum, note) => sum + (note.grade || 0), 0) / gradedNotes.length) * 10) / 10
      : null;

    // Calculate plan progress
    const totalProgress = studyPlans.length > 0
      ? Math.round(studyPlans.reduce((sum, plan) => {
          const completedTasks = plan.tasks.filter(task => task.completed).length;
          const totalTasks = plan.tasks.length;
          const planProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          return sum + planProgress;
        }, 0) / studyPlans.length)
      : 0;

    // Get recent notes (last 3)
    const recentNotes = notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3);

    // Get last feedbacks from mentor chats
    const lastFeedbacks = recentChats.slice(0, 3);

    return {
      weeklyNotes,
      averageGrade: avgGrade,
      planProgress: totalProgress,
      recentNotes,
      activePlans: studyPlans.slice(0, 3), // Show top 3 active plans
      lastFeedbacks,
      totalNotes: notes.length,
      totalPlans: studyPlans.length,
      gradedNotesCount: gradedNotes.length
    };
  },
});

export const markIntroSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { hasSeenIntro: true });
    } else {
      await ctx.db.insert("userStats", {
        userId,
        hasSeenIntro: true,
        totalStudyMinutes: 0,
        notesCreated: 0,
        plansCompleted: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
      });
    }
  },
});

export const hasSeenIntro = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const userStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return userStats?.hasSeenIntro || false;
  },
});
