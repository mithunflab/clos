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
      return new Response(JSON.stringify({
        error: 'Authorization header required',
        success: false
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    console.log('User auth result:', { user: !!user, error: authError?.message })

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'User not authenticated',
        success: false
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, instanceName, instanceId, username, password, renderServiceId } = await req.json()
    console.log('Request data:', { action, instanceName, instanceId, username: username ? 'string' : undefined, password: password ? 'string' : undefined, renderServiceId })

    // Validate inputs for create action
    if (action === 'create-n8n-instance') {
      if (typeof username !== 'string' || typeof password !== 'string') {
        console.error('Invalid username or password type:', { username: typeof username, password: typeof password })
        return new Response(JSON.stringify({
          error: 'Username and password must be strings',
          success: false,
          debug: {
            usernameType: typeof username,
            passwordType: typeof password,
            receivedUsername: username,
            receivedPassword: password
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!username.trim() || !password.trim()) {
        console.error('Empty username or password')
        return new Response(JSON.stringify({
          error: 'Username and password cannot be empty',
          success: false
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

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
      'Accept': 'application/json'
    }

    switch (action) {
      case 'list-services': {
        try {
          console.log('=== LISTING RENDER SERVICES ===')
          
          const response = await fetch('https://api.render.com/v1/services', {
            headers: renderHeaders
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Render API error:', response.status, errorText)
            throw new Error(`Render API error: ${response.status} - ${errorText}`)
          }

          const services = await response.json()
          console.log('Listed services successfully:', services.length || 0, 'services')

          return new Response(JSON.stringify({
            success: true,
            services: services
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error listing services:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'get-deployment-logs': {
        try {
          console.log('=== GETTING DEPLOYMENT LOGS ===')
          console.log('Service ID:', renderServiceId)
          
          if (!renderServiceId) {
            throw new Error('Service ID is required to fetch deployment logs')
          }

          const response = await fetch(`https://api.render.com/v1/services/${renderServiceId}/deploys?limit=20`, {
            headers: renderHeaders
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Render API error:', response.status, errorText)
            throw new Error(`Render API error: ${response.status} - ${errorText}`)
          }

          const deployments = await response.json()
          console.log('Retrieved deployment logs:', deployments.length || 0, 'deployments')

          return new Response(JSON.stringify({
            success: true,
            deployments: deployments,
            logsUrl: `https://api.render.com/v1/services/${renderServiceId}/deploys?limit=20`
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error fetching deployment logs:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'create-n8n-instance': {
        try {
          console.log('=== CREATING N8N INSTANCE ===')
          console.log('Service name:', instanceName)
          
          const serviceName = instanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
          const serviceUrl = `https://${serviceName}.onrender.com`
          
          console.log('Service URL:', serviceUrl)
          console.log('Username (validated):', username)
          console.log('Password length:', password.length)

          // Step 1: Get the owner ID from Render API
          console.log('=== STEP 1: Getting ownerId from Render API ===')
          
          const ownersResponse = await fetch('https://api.render.com/v1/owners', {
            headers: renderHeaders
          })

          if (!ownersResponse.ok) {
            const errorText = await ownersResponse.text()
            console.error('Failed to get owners:', ownersResponse.status, errorText)
            throw new Error(`Failed to get owners: ${ownersResponse.status} - ${errorText}`)
          }

          const owners = await ownersResponse.json()
          console.log('Owners response:', JSON.stringify(owners, null, 2))

          let ownerId: string
          if (Array.isArray(owners) && owners.length > 0) {
            ownerId = owners[0].owner?.id || owners[0].id
          } else if (owners && owners.id) {
            ownerId = owners.id
          }

          if (!ownerId) {
            console.error('No owner ID found in response:', owners)
            throw new Error('Could not determine owner ID for Render deployment')
          }

          console.log('Found owner ID:', ownerId)

          // Step 2: Create the service with proper payload structure based on API docs
          const payload = {
            ownerId: ownerId,
            name: serviceName,
            type: "web_service",
            env: "docker",
            region: "oregon",
            plan: "starter",
            image: {
              imagePath: "n8nio/n8n:latest"
            },
            envVars: [
              { key: "PORT", value: "10000" },
              { key: "N8N_BASIC_AUTH_ACTIVE", value: "true" },
              { key: "N8N_BASIC_AUTH_USER", value: username },
              { key: "N8N_BASIC_AUTH_PASSWORD", value: password }
            ]
          }

          console.log('=== STEP 2: Creating Render service with payload ===')
          console.log('Payload:', JSON.stringify(payload, null, 2))
          
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
            let errorDetails = responseText
            try {
              const errorJson = JSON.parse(responseText)
              errorDetails = errorJson.message || errorJson.error || responseText
            } catch {
              // Use raw response text if JSON parsing fails
            }
            console.error('Render API error:', errorDetails)
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

          const deployUrl = service.url || serviceUrl
          console.log('Service created with ID:', serviceId)
          console.log('Service URL:', deployUrl)

          // Step 3: Update database with service info
          const { error: updateError } = await supabaseClient
            .from('cloud_n8n_instances')
            .update({
              render_service_id: serviceId,
              instance_url: deployUrl,
              status: 'creating'
            })
            .eq('id', instanceId)

          if (updateError) {
            console.error('Failed to update database:', updateError)
            // Don't throw here, service is created, just log the error
          }

          // Step 4: Trigger manual deploy to ensure service starts
          console.log('=== STEP 3: Triggering manual deploy ===')
          
          const deployResponse = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
            method: 'POST',
            headers: renderHeaders
          })

          if (!deployResponse.ok) {
            const deployErrorText = await deployResponse.text()
            console.error('Deploy trigger failed:', deployResponse.status, deployErrorText)
            // Don't throw here, service is created, deploy will happen automatically
          } else {
            const deployResult = await deployResponse.json()
            console.log('Deploy triggered successfully:', deployResult)
          }

          return new Response(JSON.stringify({
            success: true,
            serviceId: serviceId,
            serviceUrl: deployUrl,
            credentials: {
              username: username,
              password: password
            },
            message: 'N8N instance deployment started successfully',
            logsUrl: `https://api.render.com/v1/services/${serviceId}/deploys?limit=20`
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('N8N instance creation error:', error)
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
          console.log('=== CHECKING DEPLOYMENT STATUS ===')
          console.log('Instance ID:', instanceId)

          // Get the render service ID from database
          const { data: instance, error: fetchError } = await supabaseClient
            .from('cloud_n8n_instances')
            .select('render_service_id, instance_url')
            .eq('id', instanceId)
            .single()

          if (fetchError || !instance?.render_service_id) {
            console.error('Failed to get instance:', fetchError)
            throw new Error('Instance not found or no render service ID')
          }

          const serviceId = instance.render_service_id
          console.log('Checking status for service:', serviceId)

          // Get service details
          const serviceResponse = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
            headers: renderHeaders
          })

          if (!serviceResponse.ok) {
            const errorText = await serviceResponse.text()
            console.error('Service fetch error:', serviceResponse.status, errorText)
            throw new Error(`Service fetch error: ${serviceResponse.status} - ${errorText}`)
          }

          const serviceData = await serviceResponse.json()
          console.log('Service data:', serviceData)

          // Check if service is active by trying to get its latest deploy
          const deploysResponse = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=1`, {
            headers: renderHeaders
          })

          let isActive = false
          let deployStatus = 'unknown'
          
          if (deploysResponse.ok) {
            const deployData = await deploysResponse.json()
            if (deployData && deployData.length > 0) {
              deployStatus = deployData[0].status
              isActive = deployStatus === 'live'
            }
          }

          console.log('Deploy status:', deployStatus, 'Is active:', isActive)

          // Update database status
          const newStatus = isActive ? 'active' : 'creating'
          const { error: statusUpdateError } = await supabaseClient
            .from('cloud_n8n_instances')
            .update({ status: newStatus })
            .eq('id', instanceId)

          if (statusUpdateError) {
            console.error('Failed to update status:', statusUpdateError)
          }

          return new Response(JSON.stringify({
            success: true,
            status: deployStatus,
            isActive: isActive,
            serviceUrl: instance.instance_url
          }), {
            status: 200,
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
          console.log('=== DELETING N8N INSTANCE ===')
          console.log('Service ID:', renderServiceId)

          if (!renderServiceId) {
            throw new Error('Service ID is required for deletion')
          }

          const deleteResponse = await fetch(`https://api.render.com/v1/services/${renderServiceId}`, {
            method: 'DELETE',
            headers: renderHeaders
          })

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text()
            console.error('Delete failed:', deleteResponse.status, errorText)
            throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`)
          }

          console.log('Service deleted successfully')

          return new Response(JSON.stringify({
            success: true,
            message: 'Service deleted successfully'
          }), {
            status: 200,
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

      default: {
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`,
          success: false
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})