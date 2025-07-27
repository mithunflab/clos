
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API')

async function callGemini(prompt: string, model: string = 'gemini-2.0-flash-exp') {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function callGeminiWithFallback(prompt: string) {
  const models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ]

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`)
      return await callGemini(prompt, model)
    } catch (error) {
      console.error(`Model ${model} failed:`, error)
      if (model === models[models.length - 1]) {
        throw error
      }
      continue
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { prompt, context } = await req.json()

    if (!GEMINI_API_KEY) {
      return new Response('Gemini API key not configured', { status: 500, headers: corsHeaders })
    }

    // Enhanced prompt for workflow generation
    const enhancedPrompt = `
You are an AI assistant specialized in creating N8N workflows. 

Context: ${context || 'No additional context provided'}

User Request: ${prompt}

Please provide a detailed response that includes:
1. A clear explanation of what the workflow will do
2. Step-by-step breakdown of the workflow logic
3. Specific N8N nodes that should be used
4. Any credentials or configurations needed
5. Expected inputs and outputs

Be specific and technical, as this will be used to generate an actual N8N workflow.
`

    const response = await callGeminiWithFallback(enhancedPrompt)

    // Check and update AI credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('ai_credits')
      .select('current_credits')
      .eq('user_id', user.id)
      .single()

    if (creditsError) {
      console.error('Error fetching credits:', creditsError)
      return new Response('Failed to check credits', { status: 500, headers: corsHeaders })
    }

    if (credits.current_credits <= 0) {
      return new Response('Insufficient credits', { status: 402, headers: corsHeaders })
    }

    // Deduct credit
    await supabaseClient
      .from('ai_credits')
      .update({ 
        current_credits: credits.current_credits - 1,
        total_credits_used: credits.total_credits_used + 1
      })
      .eq('user_id', user.id)

    return new Response(JSON.stringify({ 
      response,
      creditsRemaining: credits.current_credits - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Assistant Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
