import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getNotesByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getNotesBySubject = query({
  args: { userId: v.id("users"), subject: v.string() },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return notes.filter(note => 
      note.category?.toLowerCase() === args.subject?.toLowerCase()
    );
  },
});

export const search = query({
  args: {
    userId: v.id("users"),
    q: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    subject: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    sort: v.optional(v.union(v.literal("updated"), v.literal("created"), v.literal("title"))),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by search query
    if (args.q) {
      const query = args.q.toLowerCase();
      notes = notes.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      notes = notes.filter(note => 
        note.tags && args.tags!.some(tag => note.tags!.includes(tag))
      );
    }

    // Filter by subject
    if (args.subject) {
      notes = notes.filter(note => 
        note.category?.toLowerCase() === args.subject!.toLowerCase()
      );
    }

    // Filter by date range
    if (args.dateFrom) {
      notes = notes.filter(note => note.updatedAt >= args.dateFrom!);
    }
    if (args.dateTo) {
      notes = notes.filter(note => note.updatedAt <= args.dateTo!);
    }

    // Sort results
    const sortBy = args.sort || "updated";
    notes.sort((a, b) => {
      switch (sortBy) {
        case "created":
          return b._creationTime - a._creationTime;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return notes;
  },
});

export const getNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

export const createNote = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      ...args,
      updatedAt: now,
      sharedWith: [],
    });

    // Create version
    await ctx.runMutation(api.notes.createVersion, {
      noteId,
      content: args.content,
      title: args.title,
    });

    // Log note creation
    await ctx.runMutation(api.progress.logNoteCreated, {});
    
    return noteId;
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { noteId, ...updates } = args;
    const now = Date.now();
    
    const note = await ctx.db.get(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    const result = await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: now,
    });

    // Create version if content changed
    if (updates.content && updates.content !== note.content) {
      await ctx.runMutation(api.notes.createVersion, {
        noteId,
        content: updates.content,
        title: updates.title || note.title,
      });
    }

    // Log note update
    await ctx.runMutation(api.progress.logNoteUpdated, {});
    
    return result;
  },
});

export const updateNoteGrade = mutation({
  args: {
    noteId: v.id("notes"),
    grade: v.number(),
    feedback: v.string(),
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

    return await ctx.db.patch(args.noteId, {
      grade: args.grade,
      feedback: args.feedback,
    });
  },
});

export const shareNote = mutation({
  args: {
    noteId: v.id("notes"),
    toEmail: v.string(),
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

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.toEmail))
      .unique();

    if (!targetUser) {
      throw new Error("Bruger ikke fundet");
    }

    // Add to shared list if not already shared
    const currentShared = note.sharedWith || [];
    if (!currentShared.includes(targetUser._id)) {
      await ctx.db.patch(args.noteId, {
        sharedWith: [...currentShared, targetUser._id],
      });
    }

    return { success: true, sharedWith: targetUser.email };
  },
});

export const getSharedNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const allNotes = await ctx.db.query("notes").collect();
    return allNotes.filter(note => 
      note.sharedWith && note.sharedWith.includes(userId)
    );
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    // Delete all versions first
    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();
    
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(args.noteId);
  },
});

export const getNotesCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return notes.length;
  },
});

export const getRecentNotes = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    return await ctx.db
      .query("notes")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const getAverageGrade = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const gradedNotes = notes.filter(note => note.grade !== undefined);
    
    if (gradedNotes.length === 0) {
      return null;
    }

    const totalGrade = gradedNotes.reduce((sum, note) => sum + (note.grade || 0), 0);
    return Math.round((totalGrade / gradedNotes.length) * 10) / 10; // Round to 1 decimal
  },
});

export const getSubjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const subjects = [...new Set(
      notes
        .map(note => note.category)
        .filter(Boolean)
    )];

    return subjects;
  },
});

// Version History
export const createVersion = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("noteVersions", {
      noteId: args.noteId,
      userId,
      content: args.content,
      title: args.title,
      createdAt: Date.now(),
    });
  },
});

export const getVersions = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .collect();
  },
});

export const restoreVersion = mutation({
  args: {
    noteId: v.id("notes"),
    versionId: v.id("noteVersions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== userId) {
      throw new Error("Version not found or not authorized");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Create new version with current content before restoring
    await ctx.runMutation(api.notes.createVersion, {
      noteId: args.noteId,
      content: note.content,
      title: note.title,
    });

    // Restore the version
    await ctx.db.patch(args.noteId, {
      content: version.content,
      title: version.title,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Import/Export
export const importFromText = action({
  args: {
    content: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args): Promise<{ noteId: any; title: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      // Use AI to extract title and tags
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Analyser teksten og foreslå en titel og relevante tags. Svar i JSON format: {\"title\": \"string\", \"tags\": [\"string\"], \"category\": \"string\"}"
            },
            {
              role: "user",
              content: `Analyser denne tekst fra filen "${args.filename}":\n\n${args.content.substring(0, 2000)}`
            }
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      let title = args.filename.replace(/\.[^/.]+$/, ""); // Remove extension
      let tags: string[] = [];
      let category = "";

      if (response.ok) {
        const data = await response.json();
        try {
          const result = JSON.parse(data.choices[0].message.content);
          title = result.title || title;
          tags = result.tags || [];
          category = result.category || "";
        } catch {
          // Use filename as fallback
        }
      }

      // Create the note
      const noteId: any = await ctx.runMutation(api.notes.createNote, {
        userId,
        title,
        content: args.content,
        category,
        tags,
      });

      // Log import activity
      await ctx.runMutation(api.progress.log, {
        userId,
        noteId,
        minutes: 2,
        activity: "import",
      });

      return { noteId, title };
    } catch (error) {
      console.error("Import error:", error);
      throw new Error("Kunne ikke importere filen. Prøv igen.");
    }
  },
});

export const exportNote = query({
  args: { 
    noteId: v.id("notes"),
    format: v.union(v.literal("markdown"), v.literal("text")),
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

    if (args.format === "markdown") {
      let content = `# ${note.title}\n\n`;
      
      if (note.category) {
        content += `**Kategori:** ${note.category}\n\n`;
      }
      
      if (note.tags && note.tags.length > 0) {
        content += `**Tags:** ${note.tags.map(tag => `#${tag}`).join(', ')}\n\n`;
      }
      
      content += note.content;
      
      if (note.grade) {
        content += `\n\n---\n\n**Karakter:** ${note.grade}/10\n\n`;
        if (note.feedback) {
          content += `**Feedback:** ${note.feedback}`;
        }
      }
      
      return {
        content,
        filename: `${note.title}.md`,
        mimeType: "text/markdown",
      };
    } else {
      return {
        content: `${note.title}\n\n${note.content}`,
        filename: `${note.title}.txt`,
        mimeType: "text/plain",
      };
    }
  },
});
