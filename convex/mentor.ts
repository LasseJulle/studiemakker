import { action, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const askMentor = action({
  args: { 
    noteId: v.id("notes"), 
    question: v.string() 
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the note content
    const note: any = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    try {
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Du er en hjælpsom dansk studie-mentor. Forklar let og konkret. Brug markdown-formatering hvor det giver mening. Fokuser på at hjælpe studerende med at forstå koncepter bedre."
            },
            {
              role: "user",
              content: `Baseret på mine studienoter, kan du hjælpe mig med følgende spørgsmål?\n\nMine noter:\nTitel: ${note.title}\nIndhold: ${note.content}\n\nSpørgsmål: ${args.question}`
            }
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("AI mentor error:", error);
      throw new Error("Kunne ikke få svar fra AI-mentoren. Prøv igen.");
    }
  },
});

export const gradeNote = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<{ grade: number; feedback: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the note content
    const note: any = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    try {
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Du er en dansk lærer der vurderer studienoter. Giv en karakter fra 1-10 og kort konstruktiv feedback på dansk. Fokuser på: klarhed, struktur, dybde og fuldstændighed. Svar i JSON format: {\"grade\": number, \"feedback\": \"string\"}"
            },
            {
              role: "user",
              content: `Vurder venligst disse studienoter:\n\nTitel: ${note.title}\nIndhold: ${note.content}\n\nKategori: ${note.category || "Ingen"}`
            }
          ],
          max_tokens: 400,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content: string = data.choices[0].message.content;
      
      try {
        const result = JSON.parse(content);
        
        // Save grade and feedback to the note
        await ctx.runMutation(api.notes.updateNoteGrade, {
          noteId: args.noteId,
          grade: result.grade,
          feedback: result.feedback,
        });
        
        return {
          grade: result.grade,
          feedback: result.feedback,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          grade: 7,
          feedback: content,
        };
      }
    } catch (error) {
      console.error("AI grading error:", error);
      throw new Error("Kunne ikke vurdere noten. Prøv igen.");
    }
  },
});

export const gradeEstimate = action({
  args: { 
    userId: v.id("users"), 
    subject: v.string() 
  },
  handler: async (ctx, args): Promise<{
    grade: number;
    confidence: number;
    strengths: string[];
    gaps: string[];
    nextSteps: string[];
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== args.userId) {
      throw new Error("Not authenticated");
    }

    // Get all notes for the subject
    const notes: any[] = await ctx.runQuery(api.notes.getNotesBySubject, { 
      userId: args.userId, 
      subject: args.subject 
    });

    if (notes.length === 0) {
      throw new Error("Ingen noter fundet for dette fag");
    }

    // Combine note content
    const combinedContent = notes.map(note => 
      `${note.title}: ${note.content}`
    ).join('\n\n');

    try {
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Du er en dansk lærer der vurderer sandsynlig karakter baseret på studienoter. Brug 7-trinsskalaen (12, 10, 7, 4, 2, 0, -3). Vurdér klarhed, dækning og fejl. Returnér JSON: {\"grade\": number, \"confidence\": number (0-100), \"strengths\": [\"string\"], \"gaps\": [\"string\"], \"nextSteps\": [\"string\"]}"
            },
            {
              role: "user",
              content: `Vurdér sandsynlig karakter for ${args.subject} baseret på disse noter:\n\n${combinedContent.substring(0, 4000)}`
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content: string = data.choices[0].message.content;
      
      try {
        const result = JSON.parse(content);
        return {
          grade: result.grade || 7,
          confidence: result.confidence || 70,
          strengths: result.strengths || ["Grundlæggende forståelse"],
          gaps: result.gaps || ["Mangler dybere analyse"],
          nextSteps: result.nextSteps || ["Gennemgå materialet igen"],
        };
      } catch {
        // Fallback
        return {
          grade: 7,
          confidence: 50,
          strengths: ["Grundlæggende noter oprettet"],
          gaps: ["Behov for mere detaljerede noter"],
          nextSteps: ["Udvid dine noter med flere eksempler"],
        };
      }
    } catch (error) {
      console.error("Grade estimate error:", error);
      throw new Error("Kunne ikke estimere karakter. Prøv igen.");
    }
  },
});

export const improveNote = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<{ improvedText: string; summary: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the note content
    const note: any = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    try {
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Du er en dansk sprogekspert. Gør teksten mere klar, grammatisk korrekt og nem at forstå for en dansk studerende. Bevar det faglige indhold, men gør sproget mere præcist og struktureret. Svar i JSON format: {\"improvedText\": \"forbedret tekst\", \"summary\": \"kort sammendrag af ændringer\"}"
            },
            {
              role: "user",
              content: `Forbedr følgende studienote:\n\nTitel: ${note.title}\nIndhold: ${note.content}`
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content: string = data.choices[0].message.content;
      
      try {
        const result = JSON.parse(content);
        return {
          improvedText: result.improvedText,
          summary: result.summary,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          improvedText: note.content,
          summary: "Kunne ikke forbedre teksten automatisk.",
        };
      }
    } catch (error) {
      console.error("AI improvement error:", error);
      throw new Error("Kunne ikke forbedre noten. Prøv igen.");
    }
  },
});

export const examPrep = action({
  args: { subject: v.string() },
  handler: async (ctx, args): Promise<Array<{ question: string; answer: string }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all notes for the subject
    const notes: any[] = await ctx.runQuery(api.notes.getNotesBySubject, { 
      userId, 
      subject: args.subject 
    });

    if (notes.length === 0) {
      throw new Error("Ingen noter fundet for dette fag");
    }

    // Combine note content
    const combinedContent = notes.map(note => 
      `${note.title}: ${note.content}`
    ).join('\n\n');

    try {
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Du er en dansk lærer der laver eksamensspørgsmål. Baseret på studienoterne, lav 10 relevante spørgsmål med korte, præcise svar. Fokuser på de vigtigste koncepter. Svar i JSON format: [{\"question\": \"spørgsmål\", \"answer\": \"kort svar\"}]"
            },
            {
              role: "user",
              content: `Lav eksamensspørgsmål baseret på disse noter om ${args.subject}:\n\n${combinedContent.substring(0, 3000)}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content: string = data.choices[0].message.content;
      
      try {
        const questions = JSON.parse(content);
        
        // Save exam set
        await ctx.runMutation(api.mentor.saveExamSet, {
          userId,
          subject: args.subject,
          questions,
        });
        
        return questions;
      } catch {
        // Fallback questions
        return [
          {
            question: "Hvad er hovedpointerne i dine noter?",
            answer: "Gennemgå dine noter for at identificere nøglekoncepter."
          }
        ];
      }
    } catch (error) {
      console.error("Exam prep error:", error);
      throw new Error("Kunne ikke generere eksamensspørgsmål. Prøv igen.");
    }
  },
});

export const getMentorHistory = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("mentorChats")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
});

export const saveMentorChat = mutation({
  args: {
    noteId: v.id("notes"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("mentorChats", {
      userId,
      noteId: args.noteId,
      message: args.question,
      response: args.answer,
      createdAt: Date.now(),
    });
  },
});

export const saveExamSet = mutation({
  args: {
    userId: v.id("users"),
    subject: v.string(),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("examSets", {
      userId: args.userId,
      subject: args.subject,
      questions: args.questions.map(q => ({ ...q, difficulty: "medium" })),
      createdAt: Date.now(),
    });
  },
});

export const getExamSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("examSets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
