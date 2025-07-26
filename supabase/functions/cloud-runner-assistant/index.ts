
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

    // Create system prompt for Python automation assistant
    const systemPrompt = `You are an expert Python developer specializing in automation scripts, particularly Telegram bots using Telethon. You help users create complete Python projects.

Key guidelines:
1. Always generate complete, working Python code
2. For Telegram bots, use Telethon library (not python-telegram-bot)
3. Generate main.py and requirements.txt files
4. Include proper error handling and logging
5. Make code production-ready with proper structure
6. Session file handling: ${sessionFileUploaded ? 'User has uploaded a session.session file' : 'No session file uploaded yet - remind user to upload one for Telegram bots'}

When user asks for automation:
- Create main.py with complete implementation
- Create requirements.txt with all dependencies
- Include clear comments and documentation
- Handle authentication properly
- Use environment variables for sensitive data

Current files in project: ${currentFiles?.length ? currentFiles.map(f => f.name).join(', ') : 'None'}

Be conversational but focus on generating practical, working code.`

    const latestMessage = messages[messages.length - 1]
    
    // Prepare messages for Gemini
    const geminiMessages = [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\nUser request: " + latestMessage.content }]
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
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    let aiResponse = data.candidates[0]?.content?.parts[0]?.text || 'Sorry, I could not generate a response.'

    // Parse response to extract code files if AI generated them
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

    // If we detect specific patterns, create standard files
    if (aiResponse.toLowerCase().includes('telegram') || aiResponse.toLowerCase().includes('telethon')) {
      // Check if we need to add requirements.txt
      if (!files.some(f => f.name === 'requirements.txt')) {
        files.push({
          name: 'requirements.txt',
          content: 'telethon>=1.30.0\npython-dotenv>=0.19.0\naiofiles>=0.8.0',
          language: 'text'
        })
      }
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
