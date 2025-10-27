import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Override users table to include hasSeenIntro for backward compatibility
const customAuthTables = {
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    hasSeenIntro: v.optional(v.boolean()), // Legacy field
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
};

const applicationTables = {
  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    grade: v.optional(v.number()),
    feedback: v.optional(v.string()),
    updatedAt: v.number(),
    sharedWith: v.optional(v.array(v.id("users"))), // Legacy field, kept for compatibility
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_category", ["category"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    }),

  noteVersions: defineTable({
    noteId: v.id("notes"),
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_user", ["userId"]),

  // New sharing system
  noteShares: defineTable({
    noteId: v.id("notes"),
    ownerId: v.id("users"),
    sharedWithId: v.id("users"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_shared_with", ["sharedWithId"])
    .index("by_note_user", ["noteId", "sharedWithId"]),

  // Comments system
  comments: defineTable({
    noteId: v.id("notes"),
    authorId: v.id("users"),
    text: v.string(),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    selectionText: v.optional(v.string()),
    resolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_author", ["authorId"]),

  // Presence system
  presence: defineTable({
    noteId: v.id("notes"),
    userId: v.id("users"),
    cursor: v.optional(v.number()),
    selection: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    lastSeen: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_note_user", ["noteId", "userId"]),

  // Reminders system
  reminders: defineTable({
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    title: v.string(),
    description: v.optional(v.string()),
    when: v.number(),
    type: v.union(
      v.literal("study"),
      v.literal("review"),
      v.literal("exam"),
      v.literal("deadline")
    ),
    completed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"])
    .index("by_when", ["when"]),

  // Study materials
  flashcardSets: defineTable({
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    subject: v.string(),
    cards: v.array(v.object({
      front: v.string(),
      back: v.string(),
      difficulty: v.string(),
      tag: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"]),

  flashcardSessions: defineTable({
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
    cardIndex: v.number(),
    response: v.union(
      v.literal("again"),
      v.literal("hard"),
      v.literal("good"),
      v.literal("easy")
    ),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_set", ["setId"]),

  quizzes: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"]),

  quizSessions: defineTable({
    userId: v.id("users"),
    quizId: v.id("quizzes"),
    answers: v.array(v.object({
      questionIndex: v.number(),
      answer: v.string(),
      correct: v.boolean(),
    })),
    score: v.number(),
    total: v.number(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_quiz", ["quizId"]),

  studyPlans: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    tasks: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      completed: v.boolean(),
      dueDate: v.optional(v.number()),
      estimatedMinutes: v.optional(v.number()),
    }))),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Legacy fields for backward compatibility
    dueDate: v.optional(v.number()),
    goals: v.optional(v.string()),
    progress: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_subject", ["subject"]),

  progressLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD format
    minutes: v.number(),
    notesCreated: v.number(),
    notesUpdated: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  files: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    noteId: v.optional(v.id("notes")),
    uploadedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"]),

  userStats: defineTable({
    userId: v.id("users"),
    hasSeenIntro: v.boolean(),
    totalStudyMinutes: v.number(),
    notesCreated: v.number(),
    plansCompleted: v.number(),
    lastActiveDate: v.string(),
  })
    .index("by_user", ["userId"]),

  mentorChats: defineTable({
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    message: v.string(),
    response: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"]),

  examSets: defineTable({
    userId: v.id("users"),
    subject: v.string(),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      difficulty: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  planNotes: defineTable({
    planId: v.id("studyPlans"),
    noteId: v.id("notes"),
    completed: v.boolean(),
    addedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_plan", ["planId"])
    .index("by_plan_note", ["planId", "noteId"]),
};

export default defineSchema({
  ...customAuthTables,
  ...applicationTables,
});
