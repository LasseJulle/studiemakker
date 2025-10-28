import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notes, subject, difficulty = 'medium', questionCount = 20 } = await req.json()

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Combine note contents
    const combinedContent = notes.map((note: any) =>
      `${note.title}\n${note.content}`
    ).join('\n\n---\n\n')

    const prompt = `Create a comprehensive exam with ${questionCount} questions for ${subject} at ${difficulty} difficulty level.

Study materials:
${combinedContent}

Create a mix of:
- Multiple choice questions (60%)
- True/False questions (20%)
- Short answer questions (20%)

Format as JSON array where each question has:
- type: "multiple_choice", "true_false", or "short_answer"
- question: the question text
- options: array of options (for multiple choice)
- correct_answer: the correct answer
- points: point value (1-5 based on difficulty)
- explanation: brief explanation

Return only the JSON array.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced educator creating comprehensive exam questions. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const examText = data.choices[0].message.content

    let questions
    try {
      questions = JSON.parse(examText)
    } catch {
      const jsonMatch = examText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse exam questions')
      }
    }

    return new Response(
      JSON.stringify({
        questions,
        metadata: {
          subject,
          difficulty,
          totalQuestions: questions.length,
          totalPoints: questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
