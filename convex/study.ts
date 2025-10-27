import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// @ts-ignore
export const generateFlashcards: any = action({
  args: {
    noteId: v.optional(v.id("notes")),
    subject: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let content = "";
    let title = "";

    if (args.noteId) {
      const note = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
      if (!note) {
        throw new Error("Note not found");
      }

      // Check access
      const canView = note.userId === userId || 
        await ctx.runQuery(api.sharing.canView, { noteId: args.noteId });

      if (!canView) {
        throw new Error("Not authorized");
      }

      content = note.content;
      title = note.title;
    } else if (args.subject) {
      const notes = await ctx.runQuery(api.notes.getNotesBySubject, {
        userId,
        subject: args.subject,
      });
      
      content = notes.map(n => n.content).join('\n\n');
      title = args.subject;
    } else {
      throw new Error("Either noteId or subject must be provided");
    }

    if (!content.trim()) {
      throw new Error("No content found to generate flashcards from");
    }

    const count = args.count || 10;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Generer ${count} flashcards baseret på det givne indhold. Returner JSON format:
              {
                "cards": [
                  {
                    "front": "spørgsmål eller begreb",
                    "back": "svar eller forklaring", 
                    "difficulty": "easy|medium|hard",
                    "tag": "relevant kategori"
                  }
                ]
              }
              
              Lav varierede spørgsmål: definitioner, eksempler, sammenhænge, anvendelse.`
            },
            {
              role: "user",
              content: `Titel: ${title}\n\nIndhold:\n${content.substring(0, 4000)}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      // Save flashcard set
      const setId = await ctx.runMutation(api.study.saveFlashcardSet, {
        userId,
        noteId: args.noteId,
        subject: args.subject || title,
        cards: result.cards,
      });

      return { setId, cards: result.cards };
    } catch (error) {
      console.error("Flashcard generation error:", error);
      throw new Error("Kunne ikke generere flashcards. Prøv igen.");
    }
  },
});

// @ts-ignore
export const generateQuiz = action({
  args: {
    noteId: v.optional(v.id("notes")),
    subject: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let content = "";
    let title = "";

    if (args.noteId) {
      const note = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
      if (!note) {
        throw new Error("Note not found");
      }

      const canView = note.userId === userId || 
        await ctx.runQuery(api.sharing.canView, { noteId: args.noteId });

      if (!canView) {
        throw new Error("Not authorized");
      }

      content = note.content;
      title = note.title;
    } else if (args.subject) {
      const notes = await ctx.runQuery(api.notes.getNotesBySubject, {
        userId,
        subject: args.subject,
      });
      
      content = notes.map(n => n.content).join('\n\n');
      title = args.subject;
    } else {
      throw new Error("Either noteId or subject must be provided");
    }

    if (!content.trim()) {
      throw new Error("No content found to generate quiz from");
    }

    const count = args.count || 5;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Generer en quiz med ${count} spørgsmål baseret på indholdet. Returner JSON format:
              {
                "questions": [
                  {
                    "type": "multiple_choice|short_answer",
                    "question": "spørgsmålet",
                    "options": ["A", "B", "C", "D"], // kun for multiple choice
                    "correct": "korrekte svar",
                    "explanation": "forklaring af svaret"
                  }
                ]
              }
              
              Bland multiple choice og korte svar. Fokuser på forståelse, ikke kun fakta.`
            },
            {
              role: "user",
              content: `Titel: ${title}\n\nIndhold:\n${content.substring(0, 4000)}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      // Save quiz
      const quizId = await ctx.runMutation(api.study.saveQuiz, {
        userId,
        noteId: args.noteId,
        subject: args.subject || title,
        questions: result.questions,
      });

      return { quizId, questions: result.questions };
    } catch (error) {
      console.error("Quiz generation error:", error);
      throw new Error("Kunne ikke generere quiz. Prøv igen.");
    }
  },
});

export const saveFlashcardSet = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    subject: v.string(),
    cards: v.array(v.object({
      front: v.string(),
      back: v.string(),
      difficulty: v.string(),
      tag: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      throw new Error("Not authenticated");
    }

    const setId = await ctx.db.insert("flashcardSets", {
      userId: args.userId,
      noteId: args.noteId,
      subject: args.subject,
      cards: args.cards,
      createdAt: Date.now(),
    });

    return setId;
  },
});

export const saveQuiz = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    subject: v.string(),
    questions: v.array(v.object({
      type: v.string(),
      question: v.string(),
      options: v.optional(v.array(v.string())),
      correct: v.string(),
      explanation: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      throw new Error("Not authenticated");
    }

    const quizId = await ctx.db.insert("quizzes", {
      userId: args.userId,
      noteId: args.noteId,
      subject: args.subject,
      questions: args.questions,
      createdAt: Date.now(),
    });

    return quizId;
  },
});

export const getFlashcardSets = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      return [];
    }

    return await ctx.db
      .query("flashcardSets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getQuizzes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      return [];
    }

    return await ctx.db
      .query("quizzes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const recordFlashcardSession = mutation({
  args: {
    setId: v.id("flashcardSets"),
    cardIndex: v.number(),
    response: v.union(
      v.literal("again"),
      v.literal("hard"), 
      v.literal("good"),
      v.literal("easy")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const set = await ctx.db.get(args.setId);
    if (!set || set.userId !== userId) {
      throw new Error("Flashcard set not found or not authorized");
    }

    // Record the session for spaced repetition
    await ctx.db.insert("flashcardSessions", {
      userId,
      setId: args.setId,
      cardIndex: args.cardIndex,
      response: args.response,
      timestamp: Date.now(),
    });

    // Log study time
    await ctx.runMutation(api.progress.logStudySession, {
      minutes: 2, // 2 minutes per flashcard
    });

    return { success: true };
  },
});

export const recordQuizSession = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(v.object({
      questionIndex: v.number(),
      answer: v.string(),
      correct: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz || quiz.userId !== userId) {
      throw new Error("Quiz not found or not authorized");
    }

    const score = args.answers.filter(a => a.correct).length;
    const total = args.answers.length;

    await ctx.db.insert("quizSessions", {
      userId,
      quizId: args.quizId,
      answers: args.answers,
      score,
      total,
      timestamp: Date.now(),
    });

    // Log study time (5 minutes per quiz)
    await ctx.runMutation(api.progress.logStudySession, {
      minutes: 5,
    });

    return { score, total, percentage: Math.round((score / total) * 100) };
  },
});
