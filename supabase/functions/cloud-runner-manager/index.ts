
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

    const { action, projectName, files, sessionFile, repoName, githubRepoUrl, projectId, updateExisting } = await req.json()

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
      console.log('GIT_TOKEN exists:', !!GIT_TOKEN)
      console.log('GIT_TOKEN length:', GIT_TOKEN?.length || 0)
      
      const userResponse = await fetch('https://api.github.com/user', {
        headers: githubHeaders
      })
      
      console.log('GitHub user response status:', userResponse.status)
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('GitHub authentication failed:', {
          status: userResponse.status,
          statusText: userResponse.statusText,
          headers: Object.fromEntries(userResponse.headers.entries()),
          body: errorText
        })
        
        let errorMessage = 'GitHub authentication failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
          console.error('GitHub API error details:', errorData)
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
        success: false,
        debug: {
          tokenExists: !!GIT_TOKEN,
          tokenLength: GIT_TOKEN?.length || 0
        }
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
          
          // Create GitHub repository with improved payload
          const repoPayload = {
            name: uniqueRepoName,
            description: `Cloud Runner Project - ${projectName}`,
            private: false,
            auto_init: false,
            has_issues: true,
            has_projects: true,
            has_wiki: false
          }
          
          console.log('Repository payload:', JSON.stringify(repoPayload, null, 2))
          
          const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: githubHeaders,
            body: JSON.stringify(repoPayload)
          })

          console.log('Repository creation response status:', repoResponse.status)

          if (!repoResponse.ok) {
            const error = await repoResponse.text()
            console.error('Failed to create repository:', {
              status: repoResponse.status,
              statusText: repoResponse.statusText,
              headers: Object.fromEntries(repoResponse.headers.entries()),
              body: error
            })
            
            let errorMessage = 'Failed to create repository'
            try {
              const errorData = JSON.parse(error)
              errorMessage = errorData.message || errorMessage
              console.error('Repository creation error details:', errorData)
            } catch (e) {
              console.error('Could not parse repository creation error:', error)
            }
            
            throw new Error(`Repository creation failed (${repoResponse.status}): ${errorMessage}`)
          }

          const repo = await repoResponse.json()
          console.log('Repository created successfully:', repo.full_name)

          // Wait a moment for repository to be ready
          await new Promise(resolve => setTimeout(resolve, 2000))

          let filesUploaded = 0;

          // Upload project files with better error handling
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
                console.error(`Failed to upload file ${file.fileName}:`, {
                  status: uploadResponse.status,
                  error: errorText
                })
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

${files.map(f => `- \`${f.fileName}\`: ${f.fileName === 'main.py' ? 'Main application file' : f.fileName === 'requirements.txt' ? 'Python dependencies' : 'Project file'}`).join('\n')}

Generated on: ${new Date().toISOString()}
`

          try {
            console.log('Creating README.md...')
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
            } else {
              const errorText = await readmeResponse.text()
              console.error('Failed to create README:', errorText)
            }
          } catch (error) {
            console.error('Failed to create README:', error)
          }

          // Save to database if projectId is provided
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

          console.log(`Repository created successfully with ${filesUploaded} files uploaded`)

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
            success: false,
            debug: {
              tokenExists: !!GIT_TOKEN,
              username: githubUsername || 'unknown'
            }
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'deploy-to-render': {
        try {
          console.log('Starting deployment to Render for project:', projectName)
          
          const serviceName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 32)
          
          const renderPayload = {
            type: 'web_service',
            name: serviceName,
            repo: githubRepoUrl,
            branch: 'main',
            runtime: 'python',
            buildCommand: 'pip install -r requirements.txt',
            startCommand: 'python main.py',
            plan: 'free',
            autoDeploy: 'yes',
            envVars: [],
            rootDir: '.'
          }

          console.log('Creating Render service with payload:', JSON.stringify(renderPayload, null, 2))
          
          const renderResponse = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: renderHeaders,
            body: JSON.stringify(renderPayload)
          })

          if (!renderResponse.ok) {
            const errorText = await renderResponse.text()
            console.error('Render deployment failed:', renderResponse.status, errorText)
            throw new Error(`Render deployment failed: ${renderResponse.status} - ${errorText}`)
          }

          const service = await renderResponse.json()
          console.log('Render service created:', service.service?.id)

          const serviceUrl = service.service?.serviceDetails?.url || `https://${serviceName}.onrender.com`

          return new Response(JSON.stringify({
            success: true,
            serviceId: service.service?.id,
            serviceUrl: serviceUrl,
            deployId: service.service?.id
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Render deployment error:', error)
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
