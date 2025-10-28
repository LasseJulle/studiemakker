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
    const { noteContent, subject, questionCount = 5, questionTypes = ['multiple_choice', 'true_false'] } = await req.json()

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Create a quiz with ${questionCount} questions based on the following content about ${subject}.

Question types to include: ${questionTypes.join(', ')}

Note content:
${noteContent}

Format as a JSON array where each question has:
- type: "multiple_choice" or "true_false"
- question: the question text
- options: array of options (for multiple choice)
- correct_answer: the correct answer
- explanation: brief explanation of why this is correct

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
            content: 'You are a helpful assistant that creates educational quiz questions. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const quizText = data.choices[0].message.content

    // Parse JSON response
    let questions
    try {
      questions = JSON.parse(quizText)
    } catch {
      const jsonMatch = quizText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse quiz questions')
      }
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
