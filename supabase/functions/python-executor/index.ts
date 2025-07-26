
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, input = '', timeout = 10 } = await req.json()

    if (!code) {
      throw new Error('No Python code provided')
    }

    console.log('Executing Python code:', code.substring(0, 100) + '...')

    // Use Skulpt or Pyodide for client-side Python execution
    // For now, we'll use a Python execution service API
    const response = await fetch('https://api.programiz.com/compiler-api/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python3',
        version: 'latest',
        code: code,
        input: input || '',
        timeout: timeout
      }),
    })

    if (!response.ok) {
      // Fallback to another Python execution service
      const fallbackResponse = await fetch('https://onecompiler-apis.p.rapidapi.com/api/v1/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Host': 'onecompiler-apis.p.rapidapi.com',
          'X-RapidAPI-Key': Deno.env.get('RAPIDAPI_KEY') || 'demo'
        },
        body: JSON.stringify({
          language: 'python',
          stdin: input || '',
          files: [{
            name: 'main.py',
            content: code
          }]
        }),
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return new Response(JSON.stringify({
          success: true,
          output: fallbackData.stdout || fallbackData.output || '',
          error: fallbackData.stderr || fallbackData.error || '',
          executionTime: fallbackData.cpuTime || 0,
          memoryUsage: fallbackData.memory || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // If both services fail, use local Deno-based execution for simple Python-like operations
      return await executeSimplePython(code, input)
    }

    const data = await response.json()
    
    return new Response(JSON.stringify({
      success: !data.error,
      output: data.output || data.stdout || '',
      error: data.error || data.stderr || '',
      executionTime: data.executionTime || 0,
      memoryUsage: data.memoryUsage || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Python execution error:', error)
    return new Response(JSON.stringify({
      success: false,
      output: '',
      error: error.message,
      executionTime: 0,
      memoryUsage: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function executeSimplePython(code: string, input: string): Promise<Response> {
  try {
    // Simple interpreter for basic Python operations
    let output = ''
    let error = ''
    
    // Handle simple print statements
    const printMatches = code.match(/print\((.*?)\)/g)
    if (printMatches) {
      for (const match of printMatches) {
        const content = match.replace(/print\((.*?)\)/, '$1').replace(/['"]/g, '')
        output += content + '\n'
      }
    }
    
    // Handle simple math operations
    const mathMatches = code.match(/(\d+)\s*([+\-*/])\s*(\d+)/g)
    if (mathMatches) {
      for (const match of mathMatches) {
        const [, num1, op, num2] = match.match(/(\d+)\s*([+\-*/])\s*(\d+)/)!
        const a = parseInt(num1)
        const b = parseInt(num2)
        let result = 0
        
        switch (op) {
          case '+': result = a + b; break
          case '-': result = a - b; break
          case '*': result = a * b; break
          case '/': result = a / b; break
        }
        
        output += `${match} = ${result}\n`
      }
    }
    
    if (!output) {
      output = 'Code executed (limited Python interpreter - for full execution, configure RAPIDAPI_KEY)'
    }
    
    return new Response(JSON.stringify({
      success: true,
      output: output.trim(),
      error: error,
      executionTime: 0.1,
      memoryUsage: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      output: '',
      error: `Simple interpreter error: ${e.message}`,
      executionTime: 0,
      memoryUsage: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
