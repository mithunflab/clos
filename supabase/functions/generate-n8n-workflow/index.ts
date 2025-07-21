import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, action, workflowId, workflow, executionId, credentials, limit, n8nConfig } = await req.json();
    
    console.log('📨 Received request:', {
      message: message?.substring(0, 100),
      action,
      workflowId,
      executionId: executionId,
      limit,
      n8nConfig: n8nConfig ? 'Present' : 'Missing'
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get N8N configuration from request or environment
    let N8N_URL = null;
    let N8N_API_KEY = null;

    if (n8nConfig) {
      console.log('🔧 Using N8N config from request:', n8nConfig);
      
      if (n8nConfig.use_casel_cloud) {
        N8N_URL = 'https://n8n.casel.cloud';
        N8N_API_KEY = n8nConfig.n8n_api_key || Deno.env.get('N8N_API_KEY');
      } else if (n8nConfig.n8n_url) {
        N8N_URL = n8nConfig.n8n_url;
        N8N_API_KEY = n8nConfig.n8n_api_key || Deno.env.get('N8N_API_KEY');
      }
    }

    // Fallback to environment variables if no config provided
    if (!N8N_URL || !N8N_API_KEY) {
      console.log('🔧 Using environment variables for N8N config');
      N8N_URL = Deno.env.get('N8N_URL');
      N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    }

    console.log('🔗 N8N Configuration:', {
      url: N8N_URL,
      hasApiKey: !!N8N_API_KEY,
      source: n8nConfig ? 'request' : 'environment'
    });

    if (!N8N_URL || !N8N_API_KEY) {
      console.error('❌ N8N credentials not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'N8N credentials not configured. Please check your N8N configuration.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced API call wrapper
    const n8nApiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
      const url = `${N8N_URL}/api/v1/${endpoint}`;
      console.log(`🔗 N8N API Call: ${method} ${url}`);
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
        console.log(`📤 Request body:`, JSON.stringify(body, null, 2));
      }

      const response = await fetch(url, options);
      const responseText = await response.text();
      
      console.log(`📥 N8N API Response: ${response.status} ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);

      if (!response.ok) {
        throw new Error(`N8N API Error ${response.status}: ${responseText}`);
      }

      try {
        return JSON.parse(responseText);
      } catch {
        return { data: responseText };
      }
    };

    switch (action) {
      case 'deploy': {
        console.log('🚀 Deploying workflow to n8n:', workflow?.name);
        
        try {
          // Clean workflow for deployment with proper settings
          const cleanWorkflow = {
            name: workflow.name,
            nodes: (workflow.nodes || []).map((node: any) => ({
              id: node.id,
              name: node.name,
              type: node.type,
              typeVersion: node.typeVersion || 1,
              position: node.position,
              parameters: node.parameters || {},
              ...(node.credentials && { credentials: node.credentials })
            })),
            connections: workflow.connections || {},
            settings: {
              saveExecutionProgress: true,
              saveManualExecutions: true,
              saveDataErrorExecution: "all",
              saveDataSuccessExecution: "all",
              executionTimeout: 3600,
              timezone: "UTC",
              executionOrder: "v1"
            },
            staticData: {},
            active: false
          };

          console.log('📤 Sending cleaned workflow to n8n API');

          const result = await n8nApiCall('workflows', 'POST', cleanWorkflow);
          console.log('✅ Successfully deployed workflow to n8n:', result);
          
          // Use the actual workflow ID returned from N8N
          const actualWorkflowId = result.id;
          const workflowUrl = `${N8N_URL}/workflow/${actualWorkflowId}`;
          
          console.log('🔗 Real workflow URL:', workflowUrl);
          console.log('🆔 Real workflow ID:', actualWorkflowId);
          
          return new Response(JSON.stringify({
            success: true,
            workflowId: actualWorkflowId,
            message: `Workflow "${workflow.name}" deployed successfully to N8N!`,
            workflowUrl: workflowUrl
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error deploying to n8n:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to deploy workflow to N8N'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'update': {
        console.log('🔄 Updating existing workflow:', workflowId);
        
        try {
          if (!workflowId) {
            throw new Error('Workflow ID is required for update');
          }

          // Clean workflow for update with proper settings
          const cleanWorkflow = {
            name: workflow.name,
            nodes: (workflow.nodes || []).map((node: any) => ({
              id: node.id,
              name: node.name,
              type: node.type,
              typeVersion: node.typeVersion || 1,
              position: node.position,
              parameters: node.parameters || {},
              ...(node.credentials && { credentials: node.credentials })
            })),
            connections: workflow.connections || {},
            settings: {
              saveExecutionProgress: true,
              saveManualExecutions: true,
              saveDataErrorExecution: "all",
              saveDataSuccessExecution: "all",
              executionTimeout: 3600,
              timezone: "UTC",
              executionOrder: "v1"
            },
            staticData: {},
            active: false
          };

          console.log('📤 Updating workflow in n8n API');

          const result = await n8nApiCall(`workflows/${workflowId}`, 'PUT', cleanWorkflow);
          console.log('✅ Successfully updated workflow in n8n:', result);
          
          // Use the actual workflow ID returned from N8N
          const actualWorkflowId = result.id;
          const workflowUrl = `${N8N_URL}/workflow/${actualWorkflowId}`;
          
          console.log('🔗 Updated workflow URL:', workflowUrl);
          console.log('🆔 Updated workflow ID:', actualWorkflowId);
          
          return new Response(JSON.stringify({
            success: true,
            workflowId: actualWorkflowId,
            message: `Workflow "${workflow.name}" updated successfully in N8N!`,
            workflowUrl: workflowUrl
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error updating workflow in n8n:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to update workflow in N8N'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'activate': {
        console.log('🔌 Activating workflow:', workflowId);
        
        try {
          await n8nApiCall(`workflows/${workflowId}/activate`, 'POST');

          return new Response(JSON.stringify({
            success: true,
            message: 'Workflow activated successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error activating workflow:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'deactivate': {
        console.log('⏸️ Deactivating workflow:', workflowId);
        
        try {
          await n8nApiCall(`workflows/${workflowId}/deactivate`, 'POST');

          return new Response(JSON.stringify({
            success: true,
            message: 'Workflow deactivated successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error deactivating workflow:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'execute': {
        console.log('▶️ Executing workflow manually:', workflowId);
        
        try {
          const result = await n8nApiCall(`workflows/${workflowId}/execute`, 'POST');

          return new Response(JSON.stringify({
            success: true,
            executionId: result.executionId,
            message: 'Workflow execution started'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error executing workflow:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'stop-execution': {
        console.log('⏹️ Stopping execution:', executionId);
        
        try {
          await n8nApiCall(`executions/${executionId}/stop`, 'POST');

          return new Response(JSON.stringify({
            success: true,
            message: 'Execution stopped successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error stopping execution:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'delete-execution': {
        console.log('🗑️ Deleting execution:', executionId);
        
        try {
          await n8nApiCall(`executions/${executionId}`, 'DELETE');

          return new Response(JSON.stringify({
            success: true,
            message: 'Execution deleted successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error deleting execution:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'workflow-info': {
        console.log('📋 Fetching workflow info:', workflowId);
        
        try {
          const workflow = await n8nApiCall(`workflows/${workflowId}`);

          return new Response(JSON.stringify({
            success: true,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
              nodes: workflow.nodes,
              connections: workflow.connections,
              settings: workflow.settings,
              createdAt: workflow.createdAt,
              updatedAt: workflow.updatedAt,
              tags: workflow.tags,
              versionId: workflow.versionId
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching workflow info:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'executions': {
        console.log('📊 Fetching executions for workflow:', workflowId);
        
        try {
          const executions = await n8nApiCall(`executions?workflowId=${workflowId}&limit=${limit || 50}`);

          return new Response(JSON.stringify({
            success: true,
            executions: executions.data || [],
            count: executions.data?.length || 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching executions:', error);
          return new Response(JSON.stringify({
            success: true,
            executions: [],
            count: 0,
            message: 'Unable to fetch executions from n8n'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'execution-details': {
        console.log('🔍 Fetching execution details:', executionId);
        
        try {
          const execution = await n8nApiCall(`executions/${executionId}`);

          return new Response(JSON.stringify({
            success: true,
            execution: execution
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching execution details:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'workflows-list': {
        console.log('📝 Fetching all workflows');
        
        try {
          const workflows = await n8nApiCall('workflows');

          return new Response(JSON.stringify({
            success: true,
            workflows: workflows.data || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching workflows:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'credentials-list': {
        console.log('🔐 Fetching credentials');
        
        try {
          const credentials = await n8nApiCall('credentials');

          return new Response(JSON.stringify({
            success: true,
            credentials: credentials.data || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching credentials:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'node-types': {
        console.log('🔧 Fetching available node types');
        
        try {
          const nodeTypes = await n8nApiCall('node-types');

          return new Response(JSON.stringify({
            success: true,
            nodeTypes: nodeTypes
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error fetching node types:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'generate':
      default: {
        console.log('🤖 Generating workflow with Gemini API for:', message);
        
        const GEMINI_API_KEY = 'AIzaSyCuBM4mVKy_Tx8oMcpFw-2BUG3h22JvXyM';
        
        const geminiPrompt = `Generate a complete n8n workflow JSON for: ${message}

Create a realistic automation workflow with 5-10 interconnected nodes. Include proper node types, connections, and parameters.

Return ONLY valid JSON in this exact format:
{
  "name": "Workflow Name",
  "description": "Brief description", 
  "nodes": [
    {
      "id": "unique-uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.nodetype",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": {}
    }
  ],
  "connections": {
    "Node Name": {
      "main": [[{"node": "Next Node Name", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "saveExecutionProgress": true,
    "saveManualExecutions": true,
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all",
    "executionTimeout": 3600,
    "timezone": "UTC"
  },
  "staticData": {},
  "active": false
}`;

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
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
                maxOutputTokens: 4096,
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
          }

          const data = await response.json();
          
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('No content generated by Gemini');
          }

          let generatedText = data.candidates[0].content.parts[0].text;
          generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          const workflow = JSON.parse(generatedText);
          
          // Add UUIDs if missing
          if (workflow.nodes) {
            workflow.nodes = workflow.nodes.map((node: any) => ({
              ...node,
              id: node.id || crypto.randomUUID()
            }));
          }

          const workflowCode = JSON.stringify(workflow, null, 2);
          const generatedWorkflowId = crypto.randomUUID();
          
          return new Response(JSON.stringify({
            success: true,
            response: `Generated workflow: "${workflow.name}" with ${workflow.nodes?.length || 0} nodes`,
            workflow: workflow,
            code: {
              workflow: workflowCode
            },
            deployment: {
              success: false,
              workflowId: generatedWorkflowId,
              workflowName: workflow.name,
              message: `Workflow "${workflow.name}" generated successfully`,
              manualImport: true
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('❌ Error generating with Gemini:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Workflow generation failed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in edge function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
