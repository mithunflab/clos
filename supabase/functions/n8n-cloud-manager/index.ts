
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RENDER_API_KEY = Deno.env.get('RENDER_API')

serve(async (req) => {
  console.log('=== N8N CLOUD MANAGER STARTED ===')
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
          console.log('=== CREATING N8N INSTANCE ===')
          
          const serviceName = instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
          const serviceUrl = `https://${serviceName}.onrender.com`
          
          console.log('Service name:', serviceName)
          console.log('Service URL:', serviceUrl)

          // Get owner ID first
          console.log('Fetching Render owner info...')
          const ownerResponse = await fetch('https://api.render.com/v1/owners', {
            headers: renderHeaders
          })

          if (!ownerResponse.ok) {
            const ownerErrorText = await ownerResponse.text()
            console.error('Failed to get owner info:', ownerResponse.status, ownerErrorText)
            throw new Error(`Failed to get owner info: ${ownerResponse.status} - ${ownerErrorText}`)
          }

          const owners = await ownerResponse.json()
          console.log('Render owners response:', owners)
          
          // Handle different Render API response formats
          const ownerId = owners?.[0]?.owner?.id || owners?.[0]?.id || owners?.id

          if (!ownerId) {
            console.error('No owner ID found in response:', owners)
            throw new Error('Could not determine owner ID for Render deployment')
          }

          console.log('Found Render owner ID:', ownerId)

          // CORRECT and MINIMAL Render API payload for Docker image deployment
          const payload = {
            type: "web_service",
            name: serviceName,
            ownerId: ownerId,
            image: {
              imagePath: "n8nio/n8n:latest"
            },
            envVars: [
              {
                key: "N8N_BASIC_AUTH_ACTIVE",
                value: "true"
              },
              {
                key: "N8N_BASIC_AUTH_USER",
                value: username || "admin"
              },
              {
                key: "N8N_BASIC_AUTH_PASSWORD",
                value: password || "admin123"
              },
              {
                key: "N8N_HOST",
                value: `${serviceName}.onrender.com`
              },
              {
                key: "N8N_PORT",
                value: "5678"
              },
              {
                key: "PORT",
                value: "5678"
              },
              {
                key: "WEBHOOK_URL",
                value: `https://${serviceName}.onrender.com/`
              },
              {
                key: "N8N_EDITOR_BASE_URL",
                value: `https://${serviceName}.onrender.com/`
              },
              {
                key: "N8N_PROTOCOL",
                value: "https"
              },
              {
                key: "NODE_ENV",
                value: "production"
              },
              {
                key: "N8N_METRICS",
                value: "true"
              },
              {
                key: "N8N_LOG_LEVEL",
                value: "info"
              }
            ],
            autoDeploy: true
          }

          console.log('Creating Render service with MINIMAL payload:', JSON.stringify(payload, null, 2))
          
          const renderResponse = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify(payload)
          })

          const responseText = await renderResponse.text()
          console.log('Render API response:', {
            status: renderResponse.status,
            statusText: renderResponse.statusText,
            body: responseText
          })

          if (!renderResponse.ok) {
            console.error('Render API error:', responseText)
            
            // Parse error details
            let errorDetails = responseText
            try {
              const errorData = JSON.parse(responseText)
              errorDetails = errorData.message || errorData.error || JSON.stringify(errorData)
            } catch (e) {
              // Use raw response if not JSON
            }
            
            throw new Error(`Render API error: ${renderResponse.status} - ${errorDetails}`)
          }

          let service
          try {
            service = JSON.parse(responseText)
          } catch (e) {
            console.error('Failed to parse Render response:', responseText)
            throw new Error('Invalid response from Render API')
          }

          console.log('Render service created successfully:', service)
          
          const serviceId = service.id || service.service?.id
          if (!serviceId) {
            console.error('No service ID in response:', service)
            throw new Error('No service ID returned from Render API')
          }

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

          console.log('Database updated successfully')

          return new Response(JSON.stringify({
            success: true,
            serviceId,
            serviceUrl,
            credentials: {
              username: username || 'admin',
              password: password || 'admin123'
            },
            message: 'N8N instance deployment started successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (error) {
          console.error('N8N instance creation error:', error)
          
          // Update status to error
          if (instanceId) {
            await supabaseClient
              .from('cloud_n8n_instances')
              .update({ status: 'error' })
              .eq('id', instanceId)
          }

          return new Response(JSON.stringify({
            error: error.message,
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
      }

      case 'check-deployment-status': {
        try {
          if (!instanceId) {
            throw new Error('Instance ID is required')
          }

          console.log('Checking deployment status for instance:', instanceId)

          // Get the render service ID from the database
          const { data: instance, error } = await supabaseClient
            .from('cloud_n8n_instances')
            .select('render_service_id')
            .eq('id', instanceId)
            .single()

          if (error || !instance?.render_service_id) {
            throw new Error('Instance not found or missing render service ID')
          }

          console.log('Checking Render service:', instance.render_service_id)

          const response = await fetch(`https://api.render.com/v1/services/${instance.render_service_id}`, {
            headers: renderHeaders
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Failed to check deployment status:', errorText)
            throw new Error('Failed to check deployment status')
          }

          const service = await response.json()
          console.log('Service status:', service.service?.serviceDetails?.status)
          
          const isActive = service.service?.serviceDetails?.status === 'live'

          // Update database status if active
          if (isActive) {
            await supabaseClient
              .from('cloud_n8n_instances')
              .update({ status: 'active' })
              .eq('id', instanceId)
          }

          return new Response(JSON.stringify({
            success: true,
            status: service.service?.serviceDetails?.status || 'unknown',
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

          console.log('Deleting N8N instance:', instanceId)

          // Get the render service ID from the database
          const { data: instance, error } = await supabaseClient
            .from('cloud_n8n_instances')
            .select('render_service_id')
            .eq('id', instanceId)
            .single()

          if (error || !instance?.render_service_id) {
            throw new Error('Instance not found or missing render service ID')
          }

          console.log('Deleting Render service:', instance.render_service_id)

          const response = await fetch(`https://api.render.com/v1/services/${instance.render_service_id}`, {
            method: 'DELETE',
            headers: renderHeaders
          })

          if (!response.ok && response.status !== 404) {
            const errorText = await response.text()
            console.error('Failed to delete Render service:', errorText)
            throw new Error('Failed to delete Render service')
          }

          console.log('Render service deleted successfully')

          return new Response(JSON.stringify({
            success: true,
            message: 'N8N instance deleted successfully'
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
