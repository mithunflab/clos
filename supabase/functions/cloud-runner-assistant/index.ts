
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, sessionFileUploaded, currentFiles } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Create system prompt for concise Python automation assistant
    const systemPrompt = `You are an expert Python developer who creates automation scripts. Be CONCISE - give short, actionable responses.

Key guidelines:
1. Always generate complete, working Python code
2. For Telegram bots, use Telethon library
3. Generate main.py and requirements.txt files
4. Be brief - max 2-3 sentences in chat
5. Focus on next steps
6. Session file status: ${sessionFileUploaded ? 'Available' : 'NEEDED - remind user to upload session.session file for Telegram bots'}

Current files: ${currentFiles?.length ? currentFiles.map(f => f.name).join(', ') : 'None'}

Response format:
- Keep chat responses under 50 words
- End with clear next step
- Generate files when user describes what they want`

    const latestMessage = messages[messages.length - 1]
    
    const geminiMessages = [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\nUser: " + latestMessage.content }]
      }
    ]

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    let aiResponse = data.candidates[0]?.content?.parts[0]?.text || 'I can help you create Python automation scripts. What would you like to build?'

    // Parse response to extract code files
    const files = []
    
    // Look for code blocks and extract files
    const codeBlockRegex = /```(\w+)?\s*(?:# (\w+\.[\w.]+))?\s*\n([\s\S]*?)```/g
    let match
    
    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
      const language = match[1] || 'python'
      const filename = match[2] || (language === 'python' ? 'main.py' : `file.${language}`)
      const content = match[3].trim()
      
      if (content) {
        files.push({
          name: filename,
          content: content,
          language: language
        })
      }
    }

    // Add requirements.txt for Python projects
    if (aiResponse.toLowerCase().includes('telegram') || aiResponse.toLowerCase().includes('telethon')) {
      if (!files.some(f => f.name === 'requirements.txt')) {
        files.push({
          name: 'requirements.txt',
          content: 'telethon>=1.30.0\npython-dotenv>=0.19.0\naiofiles>=0.8.0',
          language: 'text'
        })
      }
    }

    // Make response more concise
    aiResponse = aiResponse.replace(/```[\s\S]*?```/g, '').trim()
    if (aiResponse.length > 150) {
      const sentences = aiResponse.split('. ')
      aiResponse = sentences.slice(0, 2).join('. ') + '.'
    }

    return new Response(JSON.stringify({
      response: aiResponse,
      files: files
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Cloud Runner Assistant Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      response: 'Sorry, I encountered an error. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
