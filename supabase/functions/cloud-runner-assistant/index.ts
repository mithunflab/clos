
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, sessionFileUploaded, currentFiles } = await req.json()

    if (!GROQ_API_KEY) {
      throw new Error('Groq API key not configured')
    }

    // Create system prompt for concise Python automation assistant
    const systemPrompt = `You are an expert Python developer who creates automation scripts. Be CONCISE - give short, actionable responses.

Key guidelines:
1. Always generate complete, working Python code
2. For Telegram bots, use Telethon library
3. Generate main.py and requirements.txt files - NEVER duplicate filenames
4. Be brief - max 2-3 sentences in chat
5. Focus on next steps
6. Session file status: ${sessionFileUploaded ? 'Available' : 'NEEDED - remind user to upload session.session file for Telegram bots'}
7. ONLY use Groq API, never OpenAI

Current files: ${currentFiles?.length ? currentFiles.map(f => f.fileName).join(', ') : 'None'}

Response format:
- Keep chat responses under 50 words
- End with clear next step
- Generate files when user describes what they want
- NEVER create duplicate filenames
- Always use groq-python library, never openai library`

    const latestMessage = messages[messages.length - 1]
    
    const groqMessages = [
      {
        role: "user",
        content: systemPrompt + "\n\nUser: " + latestMessage.content
      }
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    let aiResponse = data.choices[0]?.message?.content || 'I can help you create Python automation scripts. What would you like to build?'

    // Parse response to extract code files with improved logic
    const files = []
    const seenFilenames = new Set()
    
    // Look for code blocks and extract files
    const codeBlockRegex = /```(\w+)?\s*(?:# (\w+\.[\w.]+))?\s*\n([\s\S]*?)```/g
    let match
    
    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
      const language = match[1] || 'python'
      let filename = match[2]
      const content = match[3].trim()
      
      // Determine filename if not specified
      if (!filename) {
        if (language === 'python') {
          filename = 'main.py'
        } else if (language === 'text' || language === 'txt') {
          filename = 'requirements.txt'
        } else {
          filename = `file.${language}`
        }
      }
      
      // Avoid duplicate filenames
      let finalFilename = filename
      let counter = 1
      while (seenFilenames.has(finalFilename)) {
        const nameParts = filename.split('.')
        const extension = nameParts.pop()
        const baseName = nameParts.join('.')
        finalFilename = `${baseName}_${counter}.${extension}`
        counter++
      }
      
      if (content && content.length > 5) {
        seenFilenames.add(finalFilename)
        files.push({
          fileName: finalFilename,
          content: content,
          language: language
        })
      }
    }

    // Add requirements.txt for Python projects if not already present - GROQ ONLY
    if (aiResponse.toLowerCase().includes('telegram') || aiResponse.toLowerCase().includes('telethon') || aiResponse.toLowerCase().includes('groq')) {
      if (!files.some(f => f.fileName === 'requirements.txt')) {
        files.push({
          fileName: 'requirements.txt',
          content: 'telethon>=1.30.0\ngroq>=0.4.1\npython-dotenv>=0.19.0\naiofiles>=0.8.0',
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

    console.log('Generated files:', files.map(f => f.fileName))

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
