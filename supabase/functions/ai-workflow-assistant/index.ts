
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are WorkflowAI, the world's best n8n automation architect. 

## 🎯 YOUR MISSION
Create SOPHISTICATED, WORKING n8n workflows that users can immediately deploy and use. You are a master at:
- Understanding complex automation needs
- Building complete n8n workflow JSON files with multiple node connections
- Creating workflows with proper error handling and conditional logic
- Providing clear setup guidance 

## 📋 WORKFLOW CREATION RULES

**ALWAYS generate workflows when users request automation!** Here's the process:

1. **Build Complete n8n JSON**: Create fully functional workflows with:
   - Proper node types and configurations (n8n-nodes-base.*)
   - Multiple connections between nodes (not just linear chains)
   - Realistic positioning for canvas display (200px+ spacing)
   - All required n8n metadata and credentials
   - Error handling and conditional branches
   - Sophisticated logic flow patterns

2. **Include in JSON Code Block**: Wrap your workflow in \`\`\`json ... \`\`\` tags

3. **Chat Explanation**: In your response, explain:
   - What the workflow does and how it works
   - Required credentials and how to get them  
   - Setup and activation steps
   - Customization options and advanced features

## 🔧 N8N WORKFLOW TEMPLATE

For EVERY automation request, create a sophisticated workflow like this:

\`\`\`json
{
  "name": "Descriptive Workflow Name", 
  "description": "Clear explanation of what this workflow does",
  "nodes": [
    {
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [100, 200],
      "parameters": {
        "path": "/webhook-endpoint",
        "httpMethod": "POST"
      }
    },
    {
      "id": "condition-check",
      "name": "Check Condition",
      "type": "n8n-nodes-base.if",
      "position": [400, 200],
      "parameters": {
        "conditions": {
          "boolean": [],
          "dateTime": [],
          "number": [],
          "string": [
            {
              "operation": "notEmpty",
              "value1": "={{ $json.email }}"
            }
          ]
        },
        "combineOperation": "all"
      }
    },
    {
      "id": "process-data",
      "name": "Process Data",
      "type": "n8n-nodes-base.code",
      "position": [700, 200],
      "parameters": {
        "jsCode": "// Transform and process the data\nreturn items.map(item => ({ ...item.json, processed: true }));"
      }
    },
    {
      "id": "send-email",
      "name": "Send Notification",
      "type": "n8n-nodes-base.sendEmail",
      "position": [1000, 200],
      "parameters": {
        "to": "={{ $json.email }}",
        "subject": "Processing Complete",
        "text": "Your request has been processed successfully."
      },
      "credentials": {
        "smtp": {
          "id": "",
          "name": ""
        }
      }
    },
    {
      "id": "error-handler",
      "name": "Error Handler",
      "type": "n8n-nodes-base.sendEmail",
      "position": [700, 400],
      "parameters": {
        "to": "admin@example.com",
        "subject": "Workflow Error",
        "text": "An error occurred: {{ $json.error }}"
      },
      "credentials": {
        "smtp": {
          "id": "",
          "name": ""
        }
      }
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [
        [
          {
            "node": "Check Condition",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Condition": {
      "main": [
        [
          {
            "node": "Process Data", 
            "type": "main",
            "index": 0
          }
        ],
        []
      ]
    },
    "Process Data": {
      "main": [
        [
          {
            "node": "Send Notification",
            "type": "main", 
            "index": 0
          }
        ]
      ],
      "error": [
        [
          {
            "node": "Error Handler",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {},
  "staticData": {}
}
\`\`\`

## 💡 EXAMPLES OF WHAT TO BUILD

- Telegram bot with Groq AI → \`telegram webhook → groq chat → send message\`
- Email notifications → \`schedule trigger → check data → send email\`
- Data sync → \`webhook → transform data → save to database\`
- Social media automation → \`rss feed → format content → post to twitter\`

Remember: You're building real automation solutions that work immediately when deployed!`;

// Model configuration with fallback - Gemini 2.5 Pro first
const MODELS = [
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp', 
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API');
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return new Response(JSON.stringify({ error: 'AI service not properly configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    const { message, chatHistory = [], currentWorkflow } = requestBody;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build enhanced system prompt with workflow context
    let systemPrompt = SYSTEM_PROMPT;
    
    if (currentWorkflow) {
      systemPrompt += `

You are currently working with a workflow that is loaded in the canvas:

**Workflow Name:** ${currentWorkflow.name || 'Untitled Workflow'}
**Node Count:** ${currentWorkflow.nodes?.length || 0}

**Current Nodes:**
${currentWorkflow.nodes?.map((node: any) => `- ${node.name} (${node.type})`).join('\n') || 'No nodes'}

When the user asks to modify, enhance, or work with "this workflow" or "the current workflow", they are referring to the above workflow. You can modify existing nodes, add new ones, or completely restructure it based on their request.

If they ask to create a new workflow, ignore the current workflow context and start fresh.`;
    }

    // Build conversation context for Gemini
    let conversationHistory = '';
    chatHistory.forEach((msg: any) => {
      conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    });
    conversationHistory += `User: ${message}\n\nAssistant: `;

    const geminiPrompt = `${systemPrompt}

Previous conversation:
${conversationHistory}

IMPORTANT: When generating workflows, create the n8n JSON structure and send it via workflow data stream. In your chat response, explain what you created, required credentials, and how to use it. DO NOT include JSON code in your chat response.`;

    console.log('Calling Gemini API with model fallback');

    // Try models in order until one works
    let geminiResponse = null;
    let usedModel = '';
    
    for (const model of MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        
        geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: geminiPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        });

        if (geminiResponse.ok) {
          usedModel = model;
          console.log(`Successfully connected with model: ${model}`);
          break;
        } else {
          const errorText = await geminiResponse.text();
          console.error(`Model ${model} failed:`, geminiResponse.status, errorText);
        }
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      console.error('All Gemini models failed');
      throw new Error('All AI models are currently unavailable');
    }

    console.log(`Gemini API response received using ${usedModel}, starting stream`);

    // Create a readable stream to handle Gemini's streaming response
    const readable = new ReadableStream({
      start(controller) {
        const reader = geminiResponse.body?.getReader();
        if (!reader) {
          console.error('No reader available from Gemini response');
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let jsonBuffer = '';
        let insideJsonBlock = false;

        const pump = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log(`Gemini stream finished using ${usedModel}, full content length:`, fullContent.length);
              
              // Final check for any remaining workflow
              if (jsonBuffer.trim()) {
                const workflowData = await tryParseWorkflow(jsonBuffer);
                if (workflowData) {
                  console.log('🎯 Sending final workflow data:', workflowData.name);
                  const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
                    type: 'workflow',
                    content: workflowData,
                    model: usedModel
                  })}\n\n`);
                  controller.enqueue(chunk);
                }
              }
              
              controller.close();
              return;
            }

            const chunkText = decoder.decode(value, { stream: true });
            buffer += chunkText;
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Handle Server-Sent Events format
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') {
                  console.log('Stream complete');
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(dataStr);
                  
                  if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const textContent = parsed.candidates[0].content.parts[0].text;
                    fullContent += textContent;
                    
                    // Enhanced JSON detection - look for workflow patterns
                    const hasJsonStart = textContent.includes('```json') || 
                                       textContent.includes('"nodes"') ||
                                       textContent.includes('"connections"') ||
                                       (textContent.includes('{') && textContent.includes('"name"'));
                    
                    // Process text character by character to detect JSON blocks
                    for (let i = 0; i < textContent.length; i++) {
                      const char = textContent[i];
                      
                      // Detect start of JSON block (more robust detection)
                      if (!insideJsonBlock) {
                        // Check for ```json
                        if (textContent.substr(i, 7) === '```json') {
                          insideJsonBlock = true;
                          jsonBuffer = '';
                          i += 6; // Skip past ```json
                          console.log('🔍 Started detecting JSON block');
                          continue;
                        }
                        // Check for inline JSON workflow patterns
                        if ((char === '{' && (
                              textContent.substr(i, 20).includes('"nodes"') ||
                              textContent.substr(i, 20).includes('"name"') ||
                              textContent.substr(i, 30).includes('"connections"')
                            )) || 
                            (hasJsonStart && char === '{' && jsonBuffer === '')) {
                          insideJsonBlock = true;
                          jsonBuffer = char;
                          console.log('🔍 Started detecting inline JSON workflow');
                          continue;
                        }
                      }
                      
                      // Detect end of JSON block
                      if (insideJsonBlock) {
                        jsonBuffer += char;
                        
                        // Check for explicit end markers
                        if (textContent.substr(i, 3) === '```') {
                          insideJsonBlock = false;
                          console.log('🔍 Completed JSON block (markdown), parsing...');
                          
                          // Try to parse and send workflow immediately
                          const workflowData = await tryParseWorkflow(jsonBuffer.replace(/```$/, ''));
                          if (workflowData) {
                            console.log('🎯 Sending workflow data in real-time:', workflowData.name);
                            const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
                              type: 'workflow',
                              content: workflowData,
                              model: usedModel
                            })}\n\n`);
                            controller.enqueue(chunk);
                          }
                          
                          jsonBuffer = '';
                          i += 2; // Skip past ```
                          continue;
                        }
                        
                        // Check for balanced braces (inline JSON)
                        const openBraces = (jsonBuffer.match(/{/g) || []).length;
                        const closeBraces = (jsonBuffer.match(/}/g) || []).length;
                        
                        if (openBraces > 0 && openBraces === closeBraces && jsonBuffer.length > 50) {
                          insideJsonBlock = false;
                          console.log('🔍 Completed inline JSON workflow, parsing...');
                          
                          // Try to parse and send workflow immediately
                          const workflowData = await tryParseWorkflow(jsonBuffer);
                          if (workflowData) {
                            console.log('🎯 Sending inline workflow data:', workflowData.name);
                            const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
                              type: 'workflow',
                              content: workflowData,
                              model: usedModel
                            })}\n\n`);
                            controller.enqueue(chunk);
                          }
                          
                          jsonBuffer = '';
                          continue;
                        }
                        // Don't send JSON characters to chat - they stay in buffer
                        continue;
                      }
                      
                      // Send non-JSON content to chat only if we're not inside a JSON block
                      if (!insideJsonBlock) {
                        const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
                          type: 'text',
                          content: char,
                          model: usedModel
                        })}\n\n`);
                        controller.enqueue(chunk);
                      }
                    }
                    
                  } else if (parsed.error) {
                    console.error('Gemini API error in stream:', parsed.error);
                    const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
                      type: 'error',
                      content: `Gemini API error: ${parsed.error?.message || 'Unknown error'}`,
                      model: usedModel
                    })}\n\n`);
                    controller.enqueue(chunk);
                    controller.close();
                    return;
                  }
                } catch (e) {
                  console.log('Skipping invalid SSE data:', dataStr.substring(0, 50));
                }
              }
            }

            return pump();
          } catch (error) {
            console.error('Streaming error:', error);
            const chunk = new TextEncoder().encode(`data: ${JSON.stringify({
              type: 'error',
              content: `Streaming error: ${error.message}`,
              model: usedModel
            })}\n\n`);
            controller.enqueue(chunk);
            controller.close();
          }
        };

        pump();
      }
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Error in AI workflow assistant:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Check the edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function tryParseWorkflow(jsonStr: string): Promise<any | null> {
  try {
    const trimmed = jsonStr.trim();
    if (!trimmed) return null;
    
    console.log('Attempting to parse workflow JSON, length:', trimmed.length);
    
    // Check if JSON appears complete (basic validation)
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      console.log('JSON appears incomplete, skipping parse attempt');
      return null;
    }
    
    // Count braces to check if JSON is balanced
    let braceCount = 0;
    for (const char of trimmed) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    if (braceCount !== 0) {
      console.log('JSON braces not balanced, skipping parse attempt');
      return null;
    }
    
    const parsed = JSON.parse(trimmed);
    
    // Validate it looks like an n8n workflow
    if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
      console.log('Found valid workflow with', parsed.nodes.length, 'nodes');
      
      // Ensure required fields for canvas display
      const workflow = {
        name: parsed.name || 'AI Generated Workflow',
        nodes: parsed.nodes.map((node: any, index: number) => ({
          ...node,
          id: node.id || `node-${index}`,
          position: node.position || [100 + (index % 4) * 300, 100 + Math.floor(index / 4) * 150]
        })),
        connections: parsed.connections || {},
        active: false,
        settings: parsed.settings || {},
        staticData: parsed.staticData || {},
        tags: parsed.tags || [],
        ...parsed
      };
      
      // Try to auto-deploy to n8n (this will clean the workflow for n8n API)
      const deployedWorkflow = await deployToN8n(workflow);
      return deployedWorkflow || workflow;
    }
    
    console.log('JSON parsed but does not look like a workflow');
    return null;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return null;
  }
}

async function deployToN8n(workflow: any): Promise<any | null> {
  try {
    console.log('🚀 Auto-deploying workflow to n8n:', workflow.name);
    
    const N8N_URL = Deno.env.get('N8N_URL');
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    
    if (!N8N_URL || !N8N_API_KEY) {
      console.log('❌ N8n credentials not found, skipping auto-deployment');
      return null;
    }
    
    // Clean workflow for n8n API - remove read-only fields
    const cleanWorkflow = {
      name: workflow.name,
      nodes: workflow.nodes || [],
      connections: workflow.connections || {}
    };
    
    console.log('📤 Sending clean workflow to n8n:', JSON.stringify(cleanWorkflow, null, 2));
    
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      body: JSON.stringify(cleanWorkflow)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ n8n deployment error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    console.log('✅ Successfully deployed workflow to n8n:', result.id);
    
    // Return workflow with deployment info
    return {
      ...workflow,
      deployment: {
        success: true,
        workflowId: result.id,
        workflowName: workflow.name,
        message: `Workflow "${workflow.name}" deployed successfully to n8n!`,
        workflowUrl: `${N8N_URL}/workflow/${result.id}`,
        n8nWorkflowId: result.id
      }
    };

  } catch (error) {
    console.error('❌ Error deploying to n8n:', error);
    return null;
  }
}
