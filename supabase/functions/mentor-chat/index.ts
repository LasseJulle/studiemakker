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
    const { message, context } = await req.json()

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an experienced and supportive study mentor. Your goal is to help students learn effectively by:
        - Providing clear, detailed explanations
        - Breaking down complex topics into understandable parts
        - Offering study strategies and tips
        - Encouraging critical thinking
        - Being patient and supportive
        - Answering in Danish when the student writes in Danish
        Always be encouraging and help build the student's confidence while ensuring they truly understand the material.`
      }
    ]

    // Add context if provided
    if (context && Array.isArray(context)) {
      context.forEach((msg: any) => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
