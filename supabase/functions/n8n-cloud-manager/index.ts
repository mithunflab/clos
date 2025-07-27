
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

    const { action, instanceName, instanceId } = await req.json()

    if (!RENDER_API_KEY) {
      return new Response(JSON.stringify({
        error: 'Render API key not configured',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const renderHeaders = {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    switch (action) {
      case 'create-n8n-instance': {
        try {
          // Get owner ID first
          const ownerResponse = await fetch('https://api.render.com/v1/owners', {
            headers: renderHeaders
          })

          if (!ownerResponse.ok) {
            throw new Error('Failed to get Render owner info')
          }

          const owners = await ownerResponse.json()
          const ownerId = owners?.[0]?.id || owners?.id

          if (!ownerId) {
            throw new Error('Could not determine owner ID')
          }

          // Generate random password
          const password = Math.random().toString(36).slice(-12)
          const serviceName = instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-')

          const payload = {
            type: "web_service",
            name: serviceName,
            ownerId: ownerId,
            serviceDetails: {
              env: "docker",
              image: {
                imagePath: "n8nio/n8n:latest"
              }
            },
            envVars: [
              { key: "N8N_BASIC_AUTH_ACTIVE", value: "true" },
              { key: "N8N_BASIC_AUTH_USER", value: "admin" },
              { key: "N8N_BASIC_AUTH_PASSWORD", value: password },
              { key: "PORT", value: "10000" },
              { key: "N8N_HOST", value: `${serviceName}.onrender.com` },
              { key: "WEBHOOK_URL", value: `https://${serviceName}.onrender.com/` }
            ],
            plan: "starter",
            region: "oregon",
            autoDeploy: true
          }

          const response = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify(payload)
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Render API error: ${response.status} - ${errorText}`)
          }

          const service = await response.json()
          const serviceId = service.id || service.service?.id
          const serviceUrl = `https://${serviceName}.onrender.com`

          // Update database with service details
          await supabaseClient
            .from('cloud_n8n_instances')
            .update({
              render_service_id: serviceId,
              instance_url: serviceUrl,
              status: 'creating'
            })
            .eq('id', instanceId)

          return new Response(JSON.stringify({
            success: true,
            serviceId,
            serviceUrl,
            credentials: {
              username: 'admin',
              password: password
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
