import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to encode content to base64 with proper Unicode support
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// Helper function to format chat history as readable text
function formatChatAsText(chat: any[]): string {
  if (!chat || chat.length === 0) {
    return "No chat history available.";
  }
  
  let chatText = "Chat History\n";
  chatText += "=".repeat(50) + "\n\n";
  
  chat.forEach((message, index) => {
    const timestamp = new Date().toISOString();
    const role = message.role === 'user' ? 'USER' : 'AI ASSISTANT';
    
    chatText += `[${index + 1}] ${role} (${timestamp})\n`;
    chatText += "-".repeat(30) + "\n";
    chatText += `${message.content}\n\n`;
  });
  
  return chatText;
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
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { action, workflowData, workflowId, repoName } = await req.json()
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN')

    if (!githubToken) {
      return new Response('GitHub token not configured', { status: 500, headers: corsHeaders })
    }

    const githubHeaders = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }

    // Get GitHub username for repository operations
    const userResponse = await fetch('https://api.github.com/user', {
      headers: githubHeaders
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info')
    }
    
    const githubUser = await userResponse.json()
    const githubUsername = githubUser.login

    switch (action) {
      case 'create-repo': {
        // Check if workflow already exists in database
        const { data: existingWorkflow, error: checkError } = await supabaseClient
          .from('user_workflows')
          .select('github_repo_name, github_repo_url')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Database check error:', checkError)
          throw new Error(`Database check failed: ${checkError.message}`)
        }

        if (existingWorkflow) {
          console.log('Workflow already exists, updating instead of creating new repo')
          // Update existing workflow instead of creating new repo
          const updateResult = await updateExistingWorkflow(
            supabaseClient,
            githubHeaders,
            githubUsername,
            existingWorkflow.github_repo_name,
            workflowData,
            workflowId,
            user.id
          )
          return new Response(JSON.stringify(updateResult), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Create unique repository name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
        const uniqueRepoName = `casel-workflow-${user.id.substring(0, 8)}-${timestamp}`
        
        // Create GitHub repository
        const repoResponse = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: githubHeaders,
          body: JSON.stringify({
            name: uniqueRepoName,
            description: `Casel AI Workflow - ${workflowData.name || 'Untitled'}`,
            private: true,
            auto_init: true
          })
        })

        if (!repoResponse.ok) {
          const error = await repoResponse.text()
          console.error('GitHub repo creation failed:', error)
          throw new Error(`Failed to create repository: ${error}`)
        }

        const repo = await repoResponse.json()
        
        // Enhanced workflow content with comprehensive data
        const workflowContent = {
          workflow: workflowData.workflow,
          chat: workflowData.chat || [],
          nodes: workflowData.nodes || [],
          connections: workflowData.connections || {},
          metadata: {
            created_at: new Date().toISOString(),
            user_id: user.id,
            workflow_id: workflowId,
            version: '1.0.0',
            ai_model: 'gemini-2.0-flash-exp'
          }
        }

        // Create workflow.json file with proper encoding
        const fileResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/workflow.json`, {
          method: 'PUT',
          headers: githubHeaders,
          body: JSON.stringify({
            message: 'Initial workflow creation with enhanced data',
            content: encodeBase64(JSON.stringify(workflowContent, null, 2))
          })
        })

        if (!fileResponse.ok) {
          const fileError = await fileResponse.text()
          console.error('GitHub file creation failed:', fileError)
          throw new Error('Failed to create workflow file')
        }

        // Create chat history as text file
        if (workflowData.chat && workflowData.chat.length > 0) {
          const chatText = formatChatAsText(workflowData.chat);
          await fetch(`https://api.github.com/repos/${repo.full_name}/contents/chat-history.txt`, {
            method: 'PUT',
            headers: githubHeaders,
            body: JSON.stringify({
              message: 'Add chat history as text file',
              content: encodeBase64(chatText)
            })
          })
        }

        // Store in Supabase with upsert to handle duplicates
        const { error: dbError } = await supabaseClient
          .from('user_workflows')
          .upsert({
            user_id: user.id,
            workflow_id: workflowId,
            workflow_name: workflowData.name || 'Untitled Workflow',
            github_repo_name: uniqueRepoName,
            github_repo_url: repo.html_url,
            github_repo_id: repo.id.toString(),
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'user_id,workflow_id'
          })

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error(`Database storage failed: ${dbError.message}`)
        }

        console.log('Successfully stored workflow in database');

        return new Response(JSON.stringify({
          success: true,
          repository: {
            name: uniqueRepoName,
            url: repo.html_url,
            id: repo.id,
            full_name: repo.full_name
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update-workflow': {
        // Get repository info from database
        const { data: workflowInfo, error: fetchError } = await supabaseClient
          .from('user_workflows')
          .select('github_repo_name, github_repo_url')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)
          .single()

        if (fetchError || !workflowInfo) {
          console.error('Workflow not found:', fetchError)
          throw new Error('Workflow not found in database')
        }

        const updateResult = await updateExistingWorkflow(
          supabaseClient,
          githubHeaders,
          githubUsername,
          workflowInfo.github_repo_name,
          workflowData,
          workflowId,
          user.id
        )

        return new Response(JSON.stringify(updateResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'load-workflow': {
        // Get repository info
        const { data: workflowInfo } = await supabaseClient
          .from('user_workflows')
          .select('github_repo_name')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)
          .single()

        if (!workflowInfo) {
          throw new Error('Workflow not found in database')
        }

        // Get workflow file from GitHub
        const fileResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${workflowInfo.github_repo_name}/contents/workflow.json`, {
          headers: githubHeaders
        })

        if (!fileResponse.ok) {
          throw new Error('Failed to load workflow from GitHub')
        }

        const fileData = await fileResponse.json()
        const content = JSON.parse(atob(fileData.content))

        return new Response(JSON.stringify({
          success: true,
          workflow: content.workflow,
          chat: content.chat || [],
          nodes: content.nodes || [],
          connections: content.connections || {},
          metadata: content.metadata || {}
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'delete-workflow': {
        // Get repository info from database
        const { data: workflowInfo, error: fetchError } = await supabaseClient
          .from('user_workflows')
          .select('github_repo_name, github_repo_url')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)
          .single()

        if (fetchError || !workflowInfo) {
          console.error('Workflow not found:', fetchError)
          throw new Error('Workflow not found in database')
        }

        // Delete GitHub repository
        const deleteResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${workflowInfo.github_repo_name}`, {
          method: 'DELETE',
          headers: githubHeaders
        })

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const deleteError = await deleteResponse.text()
          console.error('GitHub repo deletion failed:', deleteError)
          throw new Error('Failed to delete GitHub repository')
        }

        // Delete from database
        const { error: dbError } = await supabaseClient
          .from('user_workflows')
          .delete()
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)

        if (dbError) {
          console.error('Database deletion error:', dbError)
          throw new Error(`Database deletion failed: ${dbError.message}`)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Workflow deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response('Invalid action', { status: 400, headers: corsHeaders })
    }

  } catch (error) {
    console.error('GitHub Manager Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function updateExistingWorkflow(
  supabaseClient: any,
  githubHeaders: any,
  githubUsername: string,
  repoName: string,
  workflowData: any,
  workflowId: string,
  userId: string
) {
  try {
    // Get current file to get SHA
    const getCurrentFile = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/workflow.json`, {
      headers: githubHeaders
    })

    if (!getCurrentFile.ok) {
      throw new Error('Failed to get current workflow file')
    }

    const currentFile = await getCurrentFile.json()
    
    // Enhanced workflow content for updates
    const workflowContent = {
      workflow: workflowData.workflow,
      chat: workflowData.chat || [],
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || {},
      metadata: {
        updated_at: new Date().toISOString(),
        user_id: userId,
        workflow_id: workflowId,
        version: '1.1.0'
      }
    }

    // Update workflow file
    const updateResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/workflow.json`, {
      method: 'PUT',
      headers: githubHeaders,
      body: JSON.stringify({
        message: 'Update workflow with enhanced data',
        content: encodeBase64(JSON.stringify(workflowContent, null, 2)),
        sha: currentFile.sha
      })
    })

    if (!updateResponse.ok) {
      const updateError = await updateResponse.text()
      console.error('GitHub update failed:', updateError)
      throw new Error('Failed to update workflow file')
    }

    // Update chat history as text file if exists
    if (workflowData.chat && workflowData.chat.length > 0) {
      try {
        const chatText = formatChatAsText(workflowData.chat);
        const getChatFile = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/chat-history.txt`, {
          headers: githubHeaders
        })
        
        if (getChatFile.ok) {
          const chatFile = await getChatFile.json()
          await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/chat-history.txt`, {
            method: 'PUT',
            headers: githubHeaders,
            body: JSON.stringify({
              message: 'Update chat history as text file',
              content: encodeBase64(chatText),
              sha: chatFile.sha
            })
          })
        } else {
          await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/chat-history.txt`, {
            method: 'PUT',
            headers: githubHeaders,
            body: JSON.stringify({
              message: 'Add chat history as text file',
              content: encodeBase64(chatText)
            })
          })
        }
      } catch (chatError) {
        console.warn('Failed to update chat history, but continuing...', chatError)
      }
    }

    // Update last_updated in database
    await supabaseClient
      .from('user_workflows')
      .update({ 
        last_updated: new Date().toISOString(),
        workflow_name: workflowData.name || 'Untitled Workflow'
      })
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)

    return {
      success: true,
      message: 'Workflow updated successfully',
      repository: {
        name: repoName,
        url: `https://github.com/${githubUsername}/${repoName}`
      }
    }
  } catch (error) {
    console.error('Error updating workflow:', error)
    throw error
  }
}
