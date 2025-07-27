
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RENDER_API_KEY = Deno.env.get('RENDER_API')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Request received:', req.method, req.url)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('No authorization header')
      return new Response('Unauthorized - No auth header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    console.log('User auth result:', { user: !!user, error: authError?.message })

    if (!user || authError) {
      console.log('Authentication failed:', authError?.message)
      return new Response('Unauthorized - Invalid token', { status: 401, headers: corsHeaders })
    }

    console.log('Parsing request body...')
    const { action, instanceName, instanceId, username, password } = await req.json()
    console.log('Request data:', { action, instanceName, instanceId, username: !!username, password: !!password })

    if (!RENDER_API_KEY) {
      console.log('RENDER_API_KEY not found in environment variables')
      return new Response(JSON.stringify({
        error: 'Render API key not configured',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('RENDER_API_KEY configured:', !!RENDER_API_KEY)

    const renderHeaders = {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    switch (action) {
      case 'create-n8n-instance': {
        try {
          const serviceName = instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
          const serviceUrl = `https://${serviceName}.onrender.com`

          // Simple payload that works with Render API
          const payload = {
            name: serviceName,
            type: "web_service",
            serviceDetails: {
              env: "docker",
              dockerfilePath: "",
              dockerContext: "",
              pullRequestPreviewsEnabled: false
            },
            image: {
              imagePath: "n8nio/n8n:latest"
            },
            envVars: [
              { key: "N8N_BASIC_AUTH_ACTIVE", value: "true" },
              { key: "N8N_BASIC_AUTH_USER", value: username || "admin" },
              { key: "N8N_BASIC_AUTH_PASSWORD", value: password || "admin123" }
            ]
          }

          console.log('Creating Render service with payload:', JSON.stringify(payload, null, 2))

          const response = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify(payload)
          })

          const responseText = await response.text()
          console.log('Render API response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          })

          if (!response.ok) {
            console.error('Render API error:', responseText)
            throw new Error(`Render API error: ${response.status} - ${responseText}`)
          }

          const service = JSON.parse(responseText)
          console.log('Render service created:', service)
          
          const serviceId = service.id

          // Update database with service details
          const { error: updateError } = await supabaseClient
            .from('cloud_n8n_instances')
            .update({
              render_service_id: serviceId,
              instance_url: serviceUrl,
              status: 'creating'
            })
            .eq('id', instanceId)

          if (updateError) {
            console.error('Database update error:', updateError)
            throw new Error('Failed to update database')
          }

          return new Response(JSON.stringify({
            success: true,
            serviceId,
            serviceUrl,
            credentials: {
              username: username || 'admin',
              password: password || 'admin123'
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (error) {
          console.error('N8N instance creation error:', error)
          
          // Update status to error
          await supabaseClient
            .from('cloud_n8n_instances')
            .update({ status: 'error' })
            .eq('id', instanceId)

          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'check-deployment-status': {
        try {
          if (!instanceId) {
            throw new Error('Instance ID is required')
          }

          // Get the render service ID from the database
          const { data: instance, error } = await supabaseClient
            .from('cloud_n8n_instances')
            .select('render_service_id')
            .eq('id', instanceId)
            .single()

          if (error || !instance?.render_service_id) {
            throw new Error('Instance not found or missing render service ID')
          }

          const response = await fetch(`https://api.render.com/v1/services/${instance.render_service_id}`, {
            headers: renderHeaders
          })

          if (!response.ok) {
            throw new Error('Failed to check deployment status')
          }

          const service = await response.json()
          const isActive = service.service?.state === 'active'

          // Update database status if active
          if (isActive) {
            await supabaseClient
              .from('cloud_n8n_instances')
              .update({ status: 'active' })
              .eq('id', instanceId)
          }

          return new Response(JSON.stringify({
            success: true,
            status: service.service?.state || 'unknown',
            isActive
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (error) {
          console.error('Status check error:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'delete-n8n-instance': {
        try {
          if (!instanceId) {
            throw new Error('Instance ID is required')
          }

          // Get the render service ID from the database
          const { data: instance, error } = await supabaseClient
            .from('cloud_n8n_instances')
            .select('render_service_id')
            .eq('id', instanceId)
            .single()

          if (error || !instance?.render_service_id) {
            throw new Error('Instance not found or missing render service ID')
          }

          const response = await fetch(`https://api.render.com/v1/services/${instance.render_service_id}`, {
            method: 'DELETE',
            headers: renderHeaders
          })

          if (!response.ok && response.status !== 404) {
            throw new Error('Failed to delete Render service')
          }

          return new Response(JSON.stringify({
            success: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (error) {
          console.error('Delete error:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
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
    console.error('N8N Cloud Manager Error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
