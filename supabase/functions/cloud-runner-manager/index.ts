import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GIT_TOKEN = Deno.env.get('GIT_TOKEN')
const RENDER_API_KEY = Deno.env.get('RENDER_API')

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

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
      console.error('Authentication failed - no user found')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { action, projectName, files, sessionFile, repoName, githubRepoUrl, projectId, updateExisting, repoOwner } = await req.json()

    console.log(`Processing action: ${action} for user: ${user.id}`)

    // Handle configuration check
    if (action === 'check-config') {
      const hasKeys = !!(GIT_TOKEN && RENDER_API_KEY)
      console.log(`Configuration check - GIT_TOKEN: ${!!GIT_TOKEN}, RENDER_API_KEY: ${!!RENDER_API_KEY}`)
      
      return new Response(JSON.stringify({ 
        hasKeys: hasKeys,
        success: true
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify API keys for GitHub and Render operations
    if (['create-github-repo', 'sync-to-git', 'load-code'].includes(action) && !GIT_TOKEN) {
      console.error('GitHub token not configured')
      return new Response(JSON.stringify({ 
        error: 'GitHub API token not configured. Please ensure GIT_TOKEN is set in Supabase secrets.',
        success: false,
        requiresConfig: true
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'deploy-to-render' && !RENDER_API_KEY) {
      console.error('Render API key not configured')
      return new Response(JSON.stringify({ 
        error: 'Render API key not configured. Please ensure RENDER_API is set in Supabase secrets.',
        success: false,
        requiresConfig: true
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fixed GitHub headers with proper authentication
    const githubHeaders = {
      'Authorization': `Bearer ${GIT_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'CloudRunner-Bot/1.0'
    }

    const renderHeaders = {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // Get GitHub username with proper error handling
    let githubUsername = '';
    
    try {
      console.log('Authenticating with GitHub using Bearer token...')
      
      const userResponse = await fetch('https://api.github.com/user', {
        headers: githubHeaders
      })
      
      console.log('GitHub user response status:', userResponse.status)
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('GitHub authentication failed:', {
          status: userResponse.status,
          statusText: userResponse.statusText,
          body: errorText
        })
        
        let errorMessage = 'GitHub authentication failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          console.error('Could not parse GitHub error response:', errorText)
        }
        
        return new Response(JSON.stringify({
          error: `GitHub API Error (${userResponse.status}): ${errorMessage}. Please verify your GIT_TOKEN in Supabase secrets has the correct permissions (repo, user).`,
          success: false,
          debug: {
            status: userResponse.status,
            tokenExists: !!GIT_TOKEN,
            tokenLength: GIT_TOKEN?.length || 0
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const githubUser = await userResponse.json()
      githubUsername = githubUser.login
      console.log(`GitHub authenticated for user: ${githubUsername}`)
      
    } catch (error) {
      console.error('Failed to authenticate with GitHub:', error)
      return new Response(JSON.stringify({
        error: `Failed to authenticate with GitHub: ${error.message}. Please verify your GIT_TOKEN is a valid GitHub Personal Access Token with repo permissions.`,
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    switch (action) {
      case 'create-github-repo': {
        try {
          console.log(`Creating GitHub repo for project: ${projectName} with ${files?.length || 0} files`)
          
          // Generate unique repository name
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
          const uniqueRepoName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`
          
          console.log('Creating new GitHub repository:', uniqueRepoName)
          
          // Create GitHub repository
          const repoPayload = {
            name: uniqueRepoName,
            description: `Cloud Runner Project - ${projectName}`,
            private: false,
            auto_init: false,
            has_issues: true,
            has_projects: true,
            has_wiki: false
          }
          
          const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: githubHeaders,
            body: JSON.stringify(repoPayload)
          })

          if (!repoResponse.ok) {
            const error = await repoResponse.text()
            console.error('Failed to create repository:', error)
            throw new Error(`Repository creation failed (${repoResponse.status}): ${error}`)
          }

          const repo = await repoResponse.json()
          console.log('Repository created successfully:', repo.full_name)

          // Wait for repository to be ready
          await new Promise(resolve => setTimeout(resolve, 2000))

          let filesUploaded = 0;

          // Upload project files
          for (const file of files) {
            try {
              console.log(`Uploading file: ${file.fileName}`)
              
              const uploadResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${file.fileName}`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({
                  message: `Add ${file.fileName}`,
                  content: encodeBase64(file.content),
                  committer: {
                    name: 'Cloud Runner Bot',
                    email: 'cloudrunner@casel.ai'
                  }
                })
              })

              if (uploadResponse.ok) {
                filesUploaded++
                console.log(`Successfully uploaded file: ${file.fileName}`)
              } else {
                const errorText = await uploadResponse.text()
                console.error(`Failed to upload file ${file.fileName}:`, errorText)
              }
            } catch (error) {
              console.error(`Error uploading file ${file.fileName}:`, error)
            }
          }

          // Add README.md
          const readmeContent = `# ${projectName}

This is an automated Python project generated by Casel AI Cloud Runner.

## Setup

1. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

2. Run the project:
\`\`\`bash
python main.py
\`\`\`

## Files

${files.map(f => `- \`${f.fileName}\``).join('\n')}

Generated on: ${new Date().toISOString()}
`

          try {
            const readmeResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/README.md`, {
              method: 'PUT',
              headers: githubHeaders,
              body: JSON.stringify({
                message: 'Add README.md',
                content: encodeBase64(readmeContent),
                committer: {
                  name: 'Cloud Runner Bot',
                  email: 'cloudrunner@casel.ai'
                }
              })
            })
            
            if (readmeResponse.ok) {
              console.log('README.md created successfully')
            }
          } catch (error) {
            console.error('Failed to create README:', error)
          }

          // Save to database
          if (projectId) {
            try {
              await supabaseClient
                .from('cloud_runner_projects')
                .upsert({
                  id: projectId,
                  user_id: user.id,
                  project_name: projectName,
                  github_repo_name: uniqueRepoName,
                  github_repo_url: repo.html_url,
                  session_file_uploaded: !!sessionFile,
                  deployment_status: 'repo_created',
                  updated_at: new Date().toISOString()
                })
              
              console.log('Project saved to database')
            } catch (error) {
              console.error('Failed to save project to database:', error)
            }
          }

          return new Response(JSON.stringify({
            success: true,
            repoName: uniqueRepoName,
            repoUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            filesUploaded: filesUploaded,
            username: githubUsername
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
          
        } catch (error) {
          console.error('Error creating GitHub repo:', error)
          return new Response(JSON.stringify({
            error: `Failed to create GitHub repository: ${error.message}`,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'sync-to-git': {
        try {
          console.log(`Syncing ${files?.length || 0} files to GitHub repo: ${repoName}`)
          
          if (!repoName || !files || files.length === 0) {
            throw new Error('Repository name and files are required for sync')
          }

          let syncedFiles = 0
          const syncResults = []

          for (const file of files) {
            try {
              console.log(`Syncing file: ${file.fileName} to ${repoName}`)
              
              // Try to get existing file SHA
              let fileSha = null
              try {
                const existingFileResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/${file.fileName}`, {
                  headers: githubHeaders
                })
                
                if (existingFileResponse.ok) {
                  const existingFile = await existingFileResponse.json()
                  fileSha = existingFile.sha
                }
              } catch (error) {
                console.log(`File ${file.fileName} doesn't exist yet, will create new`)
              }

              // Update or create file
              const syncPayload = {
                message: fileSha ? `Update ${file.fileName}` : `Add ${file.fileName}`,
                content: encodeBase64(file.content),
                committer: {
                  name: 'Cloud Runner Bot',
                  email: 'cloudrunner@casel.ai'
                },
                ...(fileSha && { sha: fileSha })
              }

              const syncResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/${file.fileName}`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify(syncPayload)
              })

              if (syncResponse.ok) {
                syncedFiles++
                syncResults.push({
                  fileName: file.fileName,
                  status: 'success',
                  action: fileSha ? 'updated' : 'created'
                })
              } else {
                const errorText = await syncResponse.text()
                syncResults.push({
                  fileName: file.fileName,
                  status: 'error',
                  error: `HTTP ${syncResponse.status}: ${errorText}`
                })
              }
            } catch (error) {
              syncResults.push({
                fileName: file.fileName,
                status: 'error',
                error: error.message
              })
            }
          }

          // Update project status
          if (projectId) {
            try {
              await supabaseClient
                .from('cloud_runner_projects')
                .update({
                  deployment_status: 'synced',
                  updated_at: new Date().toISOString()
                })
                .eq('id', projectId)
                .eq('user_id', user.id)
            } catch (error) {
              console.error('Failed to update project sync status:', error)
            }
          }

          return new Response(JSON.stringify({
            success: true,
            syncedFiles: syncedFiles,
            totalFiles: files.length,
            results: syncResults,
            repoUrl: `https://github.com/${githubUsername}/${repoName}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
          
        } catch (error) {
          console.error('Error syncing to GitHub:', error)
          return new Response(JSON.stringify({
            error: `Failed to sync to GitHub: ${error.message}`,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'deploy-to-render': {
        try {
          console.log('=== STARTING RENDER DEPLOYMENT ===')
          console.log('Project name:', projectName)
          console.log('GitHub repo URL:', githubRepoUrl)
          console.log('Project ID:', projectId)
          console.log('RENDER_API_KEY exists:', !!RENDER_API_KEY)

          if (!githubRepoUrl) {
            throw new Error('GitHub repository URL is required for deployment')
          }

          if (!RENDER_API_KEY) {
            console.error('RENDER_API_KEY not found in environment')
            throw new Error('Render API key not configured. Please check Supabase secrets.')
          }

          // First, get the user's ownerId from Render
          console.log('🔍 Fetching Render owner info...')
          const ownerResponse = await fetch('https://api.render.com/v1/owners', {
            headers: renderHeaders
          })

          if (!ownerResponse.ok) {
            const errorText = await ownerResponse.text()
            console.error('Failed to get owner info:', ownerResponse.status, errorText)
            throw new Error(`Failed to get owner info: ${ownerResponse.status} - ${errorText}`)
          }

          const owners = await ownerResponse.json()
          console.log('Render owners response:', owners)
          
          const ownerId = owners?.[0]?.id || owners?.id

          if (!ownerId) {
            console.error('No owner ID found in response:', owners)
            throw new Error('Could not determine owner ID for Render deployment')
          }

          console.log('Found Render owner ID:', ownerId)

          const serviceName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 32)
          
          // CORRECT Render API format - exact working payload
          const renderPayload = {
            type: "web",
            name: serviceName,
            ownerId: ownerId,
            repo: githubRepoUrl,
            branch: "main",
            buildCommand: "pip install -r requirements.txt",
            startCommand: "python main.py",
            plan: "starter",
            region: "oregon",
            autoDeploy: true,
            rootDir: ".",
            envVars: []
          }

          console.log('Creating Render background worker service with payload:', JSON.stringify(renderPayload, null, 2))
          
          const renderResponse = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify(renderPayload)
          })

          console.log('Render response status:', renderResponse.status)
          const responseText = await renderResponse.text()
          console.log('Render response body:', responseText)

          if (!renderResponse.ok) {
            console.error('Render deployment failed:', renderResponse.status, responseText)
            
            // Parse error details
            let errorDetails = responseText
            try {
              const errorData = JSON.parse(responseText)
              errorDetails = errorData.message || errorData.error || JSON.stringify(errorData)
            } catch (e) {
              // Use raw response if not JSON
            }
            
            throw new Error(`Render deployment failed (${renderResponse.status}): ${errorDetails}`)
          }

          let service
          try {
            service = JSON.parse(responseText)
          } catch (e) {
            console.error('Failed to parse Render response:', responseText)
            throw new Error('Invalid response from Render API')
          }

          const serviceId = service.id || service.service?.id
          if (!serviceId) {
            console.error('No service ID in response:', service)
            throw new Error('No service ID returned from Render API')
          }

          console.log('Render service created successfully:', serviceId)
          
          const serviceUrl = `https://dashboard.render.com/web/${serviceId}`

          // Update project with deployment info
          if (projectId) {
            try {
              await supabaseClient
                .from('cloud_runner_projects')
                .update({
                  render_service_id: serviceId,
                  render_service_url: serviceUrl,
                  deployment_status: 'deployed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', projectId)
                .eq('user_id', user.id)
              
              console.log('Project deployment status updated in database')
            } catch (error) {
              console.error('Failed to update project deployment status:', error)
            }
          }

          return new Response(JSON.stringify({
            success: true,
            serviceId: serviceId,
            serviceUrl: serviceUrl,
            deployId: serviceId
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Render deployment error:', error)
          console.error('Error stack:', error.stack)
          console.error('Error details:', JSON.stringify(error, null, 2))
          return new Response(JSON.stringify({
            error: error.message,
            success: false,
            debug: {
              errorType: error.constructor.name,
              stack: error.stack
            }
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'get-deployment-logs': {
        try {
          console.log('Fetching deployment logs for service:', projectId)
          
          if (!projectId) {
            throw new Error('Service ID is required to fetch logs')
          }

          const logsResponse = await fetch(`https://api.render.com/v1/services/${projectId}/logs?limit=100`, {
            headers: renderHeaders
          })

          if (!logsResponse.ok) {
            const errorText = await logsResponse.text()
            console.error('Failed to fetch logs:', logsResponse.status, errorText)
            throw new Error(`Failed to fetch logs: ${logsResponse.status} - ${errorText}`)
          }

          const logs = await logsResponse.text()
          console.log('Logs fetched successfully, length:', logs.length)

          // Parse and format logs
          const logLines = logs.split('\n').filter(line => line.trim())
          const formattedLogs = logLines.map(line => {
            try {
              const logEntry = JSON.parse(line)
              const timestamp = new Date(logEntry.timestamp).toLocaleTimeString()
              return `[${timestamp}] ${logEntry.message}`
            } catch (e) {
              return line
            }
          })

          return new Response(JSON.stringify({
            success: true,
            logs: formattedLogs.join('\n'),
            timestamp: new Date().toISOString()
          }), {
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

      case 'get-deployment-status': {
        try {
          console.log('Checking deployment status for service:', projectId)
          
          if (!projectId) {
            throw new Error('Service ID is required to check status')
          }

          const statusResponse = await fetch(`https://api.render.com/v1/services/${projectId}`, {
            headers: renderHeaders
          })

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text()
            console.error('Failed to fetch status:', statusResponse.status, errorText)
            throw new Error(`Failed to fetch status: ${statusResponse.status} - ${errorText}`)
          }

          const serviceData = await statusResponse.json()
          console.log('Service status fetched:', serviceData.service?.serviceDetails?.status)

          return new Response(JSON.stringify({
            success: true,
            status: serviceData.service?.serviceDetails?.status || 'unknown',
            url: serviceData.service?.serviceDetails?.url,
            createdAt: serviceData.service?.createdAt,
            updatedAt: serviceData.service?.updatedAt
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error checking deployment status:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'load-existing-project': {
        try {
          console.log('Loading existing project:', projectId)
          
          if (!projectId) {
            throw new Error('Project ID is required')
          }

          // Get project from database
          const { data: project, error } = await supabaseClient
            .from('cloud_runner_projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single()

          if (error || !project) {
            throw new Error('Project not found')
          }

          // Load files from GitHub if repository exists
          let files = []
          if (project.github_repo_name) {
            try {
              const repoResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${project.github_repo_name}/contents`, {
                headers: githubHeaders
              })

              if (repoResponse.ok) {
                const contents = await repoResponse.json()
                
                for (const item of contents) {
                  if (item.type === 'file' && item.name !== 'README.md') {
                    try {
                      const fileResponse = await fetch(item.download_url)
                      if (fileResponse.ok) {
                        const content = await fileResponse.text()
                        files.push({
                          fileName: item.name,
                          content: content,
                          language: item.name.endsWith('.py') ? 'python' : 'text'
                        })
                      }
                    } catch (error) {
                      console.error(`Failed to load file ${item.name}:`, error)
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Failed to load repository files:', error)
            }
          }

          return new Response(JSON.stringify({
            success: true,
            project: project,
            files: files
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error loading project:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'redeploy-project': {
        try {
          console.log('Redeploying project:', projectId)
          
          if (!projectId) {
            throw new Error('Project ID is required for redeployment')
          }

          // Get project from database
          const { data: project, error } = await supabaseClient
            .from('cloud_runner_projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single()

          if (error || !project) {
            throw new Error('Project not found')
          }

          if (!project.render_service_id) {
            throw new Error('No existing deployment found for this project')
          }

          // Trigger redeploy on Render
          const redeployResponse = await fetch(`https://api.render.com/v1/services/${project.render_service_id}/deploys`, {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify({
              clearCache: 'do_not_clear'
            })
          })

          if (!redeployResponse.ok) {
            const errorText = await redeployResponse.text()
            console.error('Failed to redeploy:', redeployResponse.status, errorText)
            throw new Error(`Failed to redeploy: ${redeployResponse.status} - ${errorText}`)
          }

          const deployResult = await redeployResponse.json()
          console.log('Redeploy triggered:', deployResult.deploy?.id)

          // Update project status
          await supabaseClient
            .from('cloud_runner_projects')
            .update({
              deployment_status: 'deploying',
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .eq('user_id', user.id)

          return new Response(JSON.stringify({
            success: true,
            deployId: deployResult.deploy?.id,
            serviceId: project.render_service_id,
            serviceUrl: project.render_service_url
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error redeploying project:', error)
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
        console.error('Invalid action requested:', action)
        return new Response('Invalid action', { status: 400, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Cloud Runner Manager Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
