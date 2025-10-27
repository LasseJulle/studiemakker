import { action } from "./_generated/server";
import { v } from "convex/values";

export const chatWithAI = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
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
              content: "You are a helpful AI study mentor. Provide clear, educational responses to help students learn and understand concepts better. Keep responses concise but informative."
            },
            {
              role: "user",
              content: args.prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("AI chat error:", error);
      throw new Error("Failed to get AI response. Please try again.");
    }
  },
});
