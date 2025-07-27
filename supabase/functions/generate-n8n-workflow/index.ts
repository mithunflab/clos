
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_API_KEY = Deno.env.get('N8N_API_KEY')
const DEFAULT_N8N_URL = 'https://n8n.casel.cloud'

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

    const { action, workflow, workflowId, n8nConfig } = await req.json()

    // Determine N8N endpoint
    let n8nUrl = DEFAULT_N8N_URL
    let apiKey = N8N_API_KEY

    if (n8nConfig && !n8nConfig.use_casel_cloud) {
      n8nUrl = n8nConfig.n8n_url
      apiKey = n8nConfig.n8n_api_key
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'N8N API key not configured',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const n8nHeaders = {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    switch (action) {
      case 'deploy':
      case 'update': {
        let endpoint = `${n8nUrl}/api/v1/workflows`
        let method = 'POST'

        if (action === 'update' && workflowId) {
          endpoint = `${n8nUrl}/api/v1/workflows/${workflowId}`
          method = 'PUT'
        }

        const response = await fetch(endpoint, {
          method,
          headers: n8nHeaders,
          body: JSON.stringify(workflow)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('N8N API error:', errorText)
          throw new Error(`N8N API error: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        const workflowUrl = `${n8nUrl}/workflow/${result.id}`

        return new Response(JSON.stringify({
          success: true,
          workflowId: result.id,
          workflowUrl,
          message: action === 'update' ? 'Workflow updated successfully' : 'Workflow deployed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'activate': {
        if (!workflowId) {
          throw new Error('Workflow ID is required for activation')
        }

        const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}/activate`, {
          method: 'POST',
          headers: n8nHeaders
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('N8N activation error:', errorText)
          throw new Error(`N8N activation error: ${response.status} - ${errorText}`)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Workflow activated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'deactivate': {
        if (!workflowId) {
          throw new Error('Workflow ID is required for deactivation')
        }

        const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}/deactivate`, {
          method: 'POST',
          headers: n8nHeaders
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('N8N deactivation error:', errorText)
          throw new Error(`N8N deactivation error: ${response.status} - ${errorText}`)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Workflow deactivated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'delete': {
        if (!workflowId) {
          throw new Error('Workflow ID is required for deletion')
        }

        const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
          method: 'DELETE',
          headers: n8nHeaders
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('N8N deletion error:', errorText)
          throw new Error(`N8N deletion error: ${response.status} - ${errorText}`)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Workflow deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          success: false
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('N8N Manager Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'An error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
