
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { instanceId, instanceName, basicAuthUser, basicAuthPassword } = await req.json();

    // Get the Render API key from secrets
    const renderApiKey = Deno.env.get('RENDER_API_KEY');
    if (!renderApiKey) {
      throw new Error('Render API key not configured');
    }

    // Create the service payload for Render
    const servicePayload = {
      type: "web_service",
      name: `n8n-${instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      repo: "https://github.com/n8n-io/n8n",
      rootDir: "/",
      region: "oregon",
      plan: "starter",
      buildCommand: "npm install",
      startCommand: "npm start",
      runtime: "node",
      envVars: [
        {
          key: "N8N_BASIC_AUTH_ACTIVE",
          value: "true"
        },
        {
          key: "N8N_BASIC_AUTH_USER",
          value: basicAuthUser
        },
        {
          key: "N8N_BASIC_AUTH_PASSWORD",
          value: basicAuthPassword
        },
        {
          key: "N8N_HOST",
          value: "0.0.0.0"
        },
        {
          key: "N8N_PORT",
          value: "10000"
        },
        {
          key: "N8N_PROTOCOL",
          value: "https"
        },
        {
          key: "WEBHOOK_URL",
          value: "https://n8n-" + instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + ".onrender.com"
        },
        {
          key: "GENERIC_TIMEZONE",
          value: "UTC"
        }
      ]
    };

    // Deploy to Render
    const renderResponse = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${renderApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(servicePayload),
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      throw new Error(`Render deployment failed: ${errorText}`);
    }

    const renderData = await renderResponse.json();

    // Update the instance in Supabase
    const { error: updateError } = await supabase
      .from('cloud_n8n_instances')
      .update({
        render_service_id: renderData.id,
        render_service_url: renderData.serviceDetails?.url || `https://${servicePayload.name}.onrender.com`,
        deployment_status: 'deploying'
      })
      .eq('id', instanceId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        serviceId: renderData.id,
        serviceUrl: renderData.serviceDetails?.url || `https://${servicePayload.name}.onrender.com`,
        message: 'N8N instance deployment started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error deploying N8N instance:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to deploy N8N instance'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
