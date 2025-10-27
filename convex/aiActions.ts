import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const summarizeNote = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<string> => {
    const note: any = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note) {
      throw new Error("Note not found");
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
              content: "You are a helpful study assistant. Create a concise, well-structured summary of the provided study notes. Use markdown formatting with headers, bullet points, and emphasis where appropriate. Focus on key concepts and important information."
            },
            {
              role: "user",
              content: `Please summarize these study notes:\n\nTitle: ${note.title}\n\nContent:\n${note.content}`
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
      return data.choices[0].message.content;
    } catch (error) {
      console.error("AI summarize error:", error);
      throw new Error("Failed to generate summary. Please try again.");
    }
  },
});

export const quizFromNote = action({
  args: { 
    noteId: v.id("notes"),
    questionCount: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<any> => {
    const note: any = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note) {
      throw new Error("Note not found");
    }

    const count = args.questionCount || 5;

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
              content: `You are a helpful study assistant. Create exactly ${count} quiz questions based on the provided study notes. Format your response as a JSON array where each question is an object with "question" and "answer" fields. Make questions that test understanding of key concepts.`
            },
            {
              role: "user",
              content: `Create ${count} quiz questions from these study notes:\n\nTitle: ${note.title}\n\nContent:\n${note.content}`
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
        return JSON.parse(content);
      } catch {
        // If JSON parsing fails, return a formatted response
        return [{
          question: "Generated Quiz",
          answer: content
        }];
      }
    } catch (error) {
      console.error("AI quiz error:", error);
      throw new Error("Failed to generate quiz. Please try again.");
    }
  },
});
