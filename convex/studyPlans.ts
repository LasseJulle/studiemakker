import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createPlan = mutation({
  args: {
    title: v.string(),
    goals: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("studyPlans", {
      userId,
      title: args.title,
      description: args.goals,
      subject: "General",
      startDate: Date.now(),
      endDate: args.dueDate,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePlan = mutation({
  args: {
    planId: v.id("studyPlans"),
    title: v.optional(v.string()),
    goals: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    progress: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { planId, ...updates } = args;
    const plan = await ctx.db.get(planId);
    
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or not authorized");
    }

    return await ctx.db.patch(planId, updates);
  },
});

export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("studyPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("studyPlans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or not authorized");
    }

    // Also delete associated plan notes
    const planNotes = await ctx.db
      .query("planNotes")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    for (const planNote of planNotes) {
      await ctx.db.delete(planNote._id);
    }

    await ctx.db.delete(args.planId);
  },
});

export const addNoteToPlan = mutation({
  args: {
    planId: v.id("studyPlans"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if association already exists
    const existing = await ctx.db
      .query("planNotes")
      .withIndex("by_plan_note", (q) => q.eq("planId", args.planId).eq("noteId", args.noteId))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("planNotes", {
      planId: args.planId,
      noteId: args.noteId,
      completed: false,
      addedAt: Date.now(),
    });
  },
});

export const toggleNoteCompletion = mutation({
  args: {
    planId: v.id("studyPlans"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const planNote = await ctx.db
      .query("planNotes")
      .withIndex("by_plan_note", (q) => q.eq("planId", args.planId).eq("noteId", args.noteId))
      .unique();

    if (!planNote) {
      throw new Error("Plan note association not found");
    }

    await ctx.db.patch(planNote._id, {
      completed: !planNote.completed,
    });

    // Update plan progress
    await updatePlanProgress(ctx, args.planId);
  },
});

export const getPlanNotes = query({
  args: { planId: v.id("studyPlans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const planNotes = await ctx.db
      .query("planNotes")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const notesWithDetails = [];
    for (const planNote of planNotes) {
      const note = await ctx.db.get(planNote.noteId);
      if (note) {
        notesWithDetails.push({
          ...planNote,
          note,
        });
      }
    }

    return notesWithDetails;
  },
});

// Helper function to update plan progress
async function updatePlanProgress(ctx: any, planId: any) {
  const planNotes = await ctx.db
    .query("planNotes")
    .withIndex("by_plan", (q: any) => q.eq("planId", planId))
    .collect();

  if (planNotes.length === 0) {
    await ctx.db.patch(planId, { progress: 0 });
    return;
  }

  const completedCount = planNotes.filter((pn: any) => pn.completed).length;
  const progress = Math.round((completedCount / planNotes.length) * 100);

  await ctx.db.patch(planId, { progress });
}
