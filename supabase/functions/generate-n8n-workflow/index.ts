import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_API_KEY = Deno.env.get('N8N_API_KEY')
const N8N_URL = Deno.env.get('N8N_URL') || 'https://n8n.casel.cloud'

// Function to normalize URL and remove double slashes
function normalizeUrl(url: string): string {
  if (!url) return url
  
  // Remove trailing slash
  url = url.replace(/\/$/, '')
  
  // Fix double slashes (but keep protocol://)
  url = url.replace(/([^:]\/)\/+/g, '$1')
  
  return url
}

// Function to validate N8N URL
function validateN8nUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

serve(async (req) => {
  console.log('=== N8N WORKFLOW DEPLOYMENT STARTED ===')
  console.log('Request method:', req.method)
  
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
    console.log('Action:', action)
    console.log('Workflow ID:', workflowId)
    console.log('N8N Config:', n8nConfig)

    // Determine N8N endpoint and API key
    let n8nUrl = normalizeUrl(N8N_URL)
    let apiKey = N8N_API_KEY

    console.log('Default N8N_URL:', n8nUrl)
    console.log('Default N8N_API_KEY configured:', !!apiKey)

    if (n8nConfig && !n8nConfig.use_casel_cloud) {
      if (n8nConfig.n8n_url) {
        n8nUrl = normalizeUrl(n8nConfig.n8n_url)
      }
      if (n8nConfig.n8n_api_key) {
        apiKey = n8nConfig.n8n_api_key
      }
      console.log('Using custom N8N config:', { url: n8nUrl, hasKey: !!apiKey })
    }

    // Validate N8N URL
    if (!validateN8nUrl(n8nUrl)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid N8N URL format',
        success: false,
        debug: { n8nUrl, isValid: false }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'N8N API key not configured',
        success: false,
        debug: {
          n8nUrl,
          hasApiKey: !!apiKey,
          N8N_URL_env: !!N8N_URL,
          N8N_API_KEY_env: !!N8N_API_KEY,
          usesCaselCloud: n8nConfig?.use_casel_cloud !== false
        }
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
        // Construct API endpoint properly
        const endpoint = `${n8nUrl}/api/v1/workflows${workflowId && action === 'update' ? `/${workflowId}` : ''}`
        const method = action === 'update' ? 'PUT' : 'POST'

        console.log('Making request to:', endpoint)
        console.log('Method:', method)
        console.log('Headers:', { ...n8nHeaders, 'X-N8N-API-KEY': '[REDACTED]' })

        const response = await fetch(endpoint, {
          method,
          headers: n8nHeaders,
          body: JSON.stringify(workflow)
        })

        const responseText = await response.text()
        console.log('N8N API response:', {
          status: response.status,
          statusText: response.statusText,
          url: endpoint,
          responseText: responseText.substring(0, 500) // First 500 chars
        })

        if (!response.ok) {
          console.error('N8N API error response:', {
            status: response.status,
            statusText: response.statusText,
            url: endpoint,
            errorText: responseText,
            headers: Object.fromEntries(response.headers.entries())
          })
          
          let errorMessage = `N8N API error: ${response.status}`
          if (response.status === 404) {
            errorMessage = 'N8N instance not found or not accessible. Please check if your N8N instance is running and the URL is correct.'
          } else if (response.status === 401) {
            errorMessage = 'N8N API authentication failed. Please check your API key.'
          } else if (response.status === 500) {
            errorMessage = 'N8N server error. Please try again or check N8N logs.'
          }
          
          throw new Error(`${errorMessage} - ${responseText}`)
        }

        let result
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse N8N response:', responseText)
          throw new Error('Invalid JSON response from N8N API')
        }

        const workflowUrl = `${n8nUrl}/workflow/${result.id}`
        console.log('Workflow deployed successfully:', result.id)

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

        const endpoint = `${n8nUrl}/api/v1/workflows/${workflowId}/activate`
        console.log('Activating workflow:', endpoint)

        const response = await fetch(endpoint, {
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

        const endpoint = `${n8nUrl}/api/v1/workflows/${workflowId}/deactivate`
        console.log('Deactivating workflow:', endpoint)

        const response = await fetch(endpoint, {
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

        const endpoint = `${n8nUrl}/api/v1/workflows/${workflowId}`
        console.log('Deleting workflow:', endpoint)

        const response = await fetch(endpoint, {
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
      success: false,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
