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
    const { noteContent, noteTitle } = await req.json()

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Analyze and improve the following study note. Provide:

1. An improved version with better structure, clarity, and completeness
2. Specific suggestions for what was improved
3. Constructive feedback on the original note

Note Title: ${noteTitle}

Original Content:
${noteContent}

Return a JSON object with:
{
  "improvedText": "the improved note content",
  "suggestions": "list of specific improvements made",
  "feedback": "constructive feedback for the student"
}

Return only valid JSON.`

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
            content: 'You are an experienced study coach who helps students improve their note-taking. Always return valid JSON.'
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
    const resultText = data.choices[0].message.content

    // Parse JSON response
    let result
    try {
      result = JSON.parse(resultText)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse improvement result')
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
