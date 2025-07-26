
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
        error: 'GitHub API token not configured. Please contact your administrator to add the GIT_TOKEN secret.',
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
        error: 'Render API key not configured. Please contact your administrator to add the RENDER_API secret.',
        success: false,
        requiresConfig: true
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const githubHeaders = {
      'Authorization': `token ${GIT_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CloudRunner/1.0',
    }

    const renderHeaders = {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // Get GitHub username with better error handling
    let githubUsername = '';
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: githubHeaders
      })
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('GitHub authentication failed:', errorText)
        throw new Error(`GitHub authentication failed: ${userResponse.status} ${errorText}`)
      }
      
      const githubUser = await userResponse.json()
      githubUsername = githubUser.login
      console.log(`GitHub authenticated for user: ${githubUsername}`)
    } catch (error) {
      console.error('Failed to authenticate with GitHub:', error)
      return new Response(JSON.stringify({
        error: 'Failed to authenticate with GitHub. Please check your API token.',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    switch (action) {
      case 'sync-to-git': {
        try {
          console.log(`Syncing ${files?.length || 0} files to Git repository: ${githubRepoUrl}`)
          
          // Extract repo name from URL
          const urlParts = githubRepoUrl.split('/')
          const repoNameFromUrl = urlParts[urlParts.length - 1]
          const fullRepoName = `${githubUsername}/${repoNameFromUrl}`

          console.log('Syncing to existing repository:', fullRepoName)

          let filesUpdated = 0;
          let filesSkipped = 0;

          // Update project files in existing repository
          for (const file of files) {
            try {
              console.log(`Processing file: ${file.fileName}`)
              
              const fileResponse = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/${file.fileName}`, {
                headers: githubHeaders
              })

              let sha = null
              if (fileResponse.ok) {
                const existingFile = await fileResponse.json()
                sha = existingFile.sha
                console.log(`Found existing file ${file.fileName} with SHA: ${sha}`)
              } else {
                console.log(`File ${file.fileName} does not exist, creating new`)
              }

              const updateResponse = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/${file.fileName}`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({
                  message: `Update ${file.fileName} - ${new Date().toISOString()}`,
                  content: encodeBase64(file.content),
                  sha: sha
                })
              })

              if (!updateResponse.ok) {
                const errorText = await updateResponse.text()
                console.error(`Failed to update file ${file.fileName}:`, errorText)
                filesSkipped++
              } else {
                console.log(`Successfully updated ${file.fileName}`)
                filesUpdated++
              }
            } catch (error) {
              console.error(`Error updating file ${file.fileName}:`, error)
              filesSkipped++
            }
          }

          // Upload session file if provided
          if (sessionFile) {
            try {
              console.log('Processing session file upload')
              
              const sessionResponse = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/session.session`, {
                headers: githubHeaders
              })

              let sessionSha = null
              if (sessionResponse.ok) {
                const existingSession = await sessionResponse.json()
                sessionSha = existingSession.sha
              }

              const sessionContent = 'session-file-placeholder'
              
              await fetch(`https://api.github.com/repos/${fullRepoName}/contents/session.session`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({
                  message: `Update session.session file - ${new Date().toISOString()}`,
                  content: encodeBase64(sessionContent),
                  sha: sessionSha
                })
              })
              
              console.log('Session file uploaded successfully')
            } catch (error) {
              console.error('Error uploading session file:', error)
            }
          }

          console.log(`Sync completed - Updated: ${filesUpdated}, Skipped: ${filesSkipped}`)

          return new Response(JSON.stringify({
            success: true,
            message: `Files synced successfully - Updated: ${filesUpdated}, Skipped: ${filesSkipped}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Git sync error:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'create-github-repo': {
        try {
          console.log(`Creating GitHub repo for project: ${projectName} with ${files?.length || 0} files`)
          
          // Check if this project already has a GitHub repository
          if (projectId) {
            const { data: existingProject } = await supabaseClient
              .from('cloud_runner_projects')
              .select('github_repo_url, github_repo_name')
              .eq('id', projectId)
              .eq('user_id', user.id)
              .single()

            if (existingProject?.github_repo_url) {
              console.log('Project already has repository, updating existing:', existingProject.github_repo_url)
              
              // Just sync to existing repository instead of creating new one
              const urlParts = existingProject.github_repo_url.split('/')
              const repoNameFromUrl = urlParts[urlParts.length - 1]
              const fullRepoName = `${githubUsername}/${repoNameFromUrl}`

              let filesUpdated = 0;

              // Update files in existing repository
              for (const file of files) {
                try {
                  const fileResponse = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/${file.fileName}`, {
                    headers: githubHeaders
                  })

                  let sha = null
                  if (fileResponse.ok) {
                    const existingFile = await fileResponse.json()
                    sha = existingFile.sha
                  }

                  const updateResponse = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/${file.fileName}`, {
                    method: 'PUT',
                    headers: githubHeaders,
                    body: JSON.stringify({
                      message: `Update ${file.fileName} - ${new Date().toISOString()}`,
                      content: encodeBase64(file.content),
                      sha: sha
                    })
                  })

                  if (updateResponse.ok) {
                    filesUpdated++
                  }
                } catch (error) {
                  console.error(`Error updating file ${file.fileName}:`, error)
                }
              }

              console.log(`Updated existing repository with ${filesUpdated} files`)

              return new Response(JSON.stringify({
                success: true,
                repoName: existingProject.github_repo_name,
                repoUrl: existingProject.github_repo_url,
                message: `Updated existing repository with ${filesUpdated} files`
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }
          }

          // Create new repository only if none exists
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
          const uniqueRepoName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`
          
          console.log('Creating new GitHub repository:', uniqueRepoName)
          
          // Create GitHub repository
          const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: githubHeaders,
            body: JSON.stringify({
              name: uniqueRepoName,
              description: `Cloud Runner Project - ${projectName}`,
              private: false,
              auto_init: true
            })
          })

          if (!repoResponse.ok) {
            const error = await repoResponse.text()
            console.error('Failed to create repository:', error)
            throw new Error(`Failed to create repository: ${repoResponse.status} ${error}`)
          }

          const repo = await repoResponse.json()
          console.log('Repository created:', repo.full_name)

          let filesUploaded = 0;

          // Upload project files
          for (const file of files) {
            try {
              const uploadResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${file.fileName}`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({
                  message: `Add ${file.fileName}`,
                  content: encodeBase64(file.content)
                })
              })

              if (uploadResponse.ok) {
                filesUploaded++
                console.log(`Uploaded file: ${file.fileName}`)
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

${files.map(f => `- \`${f.fileName}\`: ${f.fileName === 'main.py' ? 'Main application file' : f.fileName === 'requirements.txt' ? 'Python dependencies' : 'Project file'}`).join('\n')}

Generated on: ${new Date().toISOString()}
`

          try {
            await fetch(`https://api.github.com/repos/${repo.full_name}/contents/README.md`, {
              method: 'PUT',
              headers: githubHeaders,
              body: JSON.stringify({
                message: 'Add README.md',
                content: encodeBase64(readmeContent)
              })
            })
          } catch (error) {
            console.error('Failed to create README:', error)
          }

          // Save to database
          try {
            await supabaseClient
              .from('cloud_runner_projects')
              .upsert({
                id: projectId || undefined,
                user_id: user.id,
                project_name: projectName,
                github_repo_name: uniqueRepoName,
                github_repo_url: repo.html_url,
                session_file_uploaded: !!sessionFile,
                updated_at: new Date().toISOString()
              })
            
            console.log('Project saved to database')
          } catch (error) {
            console.error('Failed to save project to database:', error)
          }

          console.log(`Repository created with ${filesUploaded} files uploaded`)

          return new Response(JSON.stringify({
            success: true,
            repoName: uniqueRepoName,
            repoUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            filesUploaded: filesUploaded
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error creating GitHub repo:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'load-code': {
        try {
          // Get all files from the repository
          const contentsResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents`, {
            headers: githubHeaders
          })

          if (!contentsResponse.ok) {
            throw new Error('Failed to load repository contents')
          }

          const contents = await contentsResponse.json()
          const files = []

          // Load main project files
          const fileNames = ['main.py', 'requirements.txt', 'README.md']
          
          for (const fileName of fileNames) {
            const fileInfo = contents.find((item: any) => item.name === fileName)
            if (fileInfo) {
              const fileResponse = await fetch(fileInfo.download_url)
              if (fileResponse.ok) {
                const content = await fileResponse.text()
                files.push({
                  fileName: fileName,
                  content: content,
                  language: fileName.endsWith('.py') ? 'python' : fileName.endsWith('.txt') ? 'text' : 'markdown'
                })
              }
            }
          }

          return new Response(JSON.stringify({
            success: true,
            files: files
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error loading code:', error)
          return new Response(JSON.stringify({
            error: error.message,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      case 'deploy-to-render': {
        try {
          console.log('Starting deployment to Render for project:', projectName)
          
          // Create Render service with enhanced configuration
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

          // Update database with deployment info
          try {
            await supabaseClient
              .from('cloud_runner_projects')
              .update({
                render_service_id: service.service?.id,
                render_service_url: serviceUrl,
                deployment_status: 'deployed',
                updated_at: new Date().toISOString()
              })
              .eq('id', projectId)
            
            console.log('Database updated with deployment info')
          } catch (error) {
            console.error('Failed to update database with deployment info:', error)
          }

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
