import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Play, 
  Github, 
  ExternalLink, 
  Bot, 
  GitBranch, 
  Link,
  Settings,
  Plus,
  User,
  Home,
  Rocket,
  Loader2,
  Zap,
  Moon,
  Sun,
  Menu,
  X,
  Minimize2,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import CloudRunnerAIAssistant from '@/components/CloudRunnerAIAssistant';
import CloudRunnerFileTree from '@/components/CloudRunnerFileTree';
import PlaygroundCanvas from '@/components/PlaygroundCanvas';
import { useCloudRunnerProjects } from '@/hooks/useCloudRunnerProjects';
import { useTheme } from '@/hooks/useTheme';

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
}

const CloudRunner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id');
  const { user } = useAuth();
  const { toast } = useToast();
  const { createProject, updateProject } = useCloudRunnerProjects();
  const { theme, toggleTheme } = useTheme();
  
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('draft');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [renderServiceId, setRenderServiceId] = useState<string>('');
  const [hasApiKeys, setHasApiKeys] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadExistingProject();
    } else {
      setProjectName(`cloud-bot-${Date.now()}`);
    }
    checkApiKeys();
  }, [projectId]);

  const checkApiKeys = async () => {
    try {
      // Check if required secrets are configured
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: { action: 'check-config' }
      });
      
      if (!error && data?.hasKeys) {
        setHasApiKeys(true);
      } else {
        console.warn('API keys not configured properly');
        setRenderLogs(prev => [...prev, 'Warning: API keys not configured. GitHub and Render features may not work.']);
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
    }
  };

  const loadExistingProject = async () => {
    if (!projectId || !user) return;

    try {
      const { data: project, error } = await supabase
        .from('cloud_runner_projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        toast({
          title: "Error",
          description: "Failed to load project",
          variant: "destructive",
        });
        return;
      }

      if (project) {
        setProjectName(project.project_name);
        setDeploymentStatus(project.deployment_status || 'draft');
        setGithubRepoUrl(project.github_repo_url || '');
        setRenderServiceId(project.render_service_id || '');
        setRenderLogs(prev => [...prev, `Loaded project: ${project.project_name}`]);

        if (project.github_repo_name) {
          await loadCodeFromGitHub(project.github_repo_name);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
    }
  };

  const loadCodeFromGitHub = async (repoName: string) => {
    try {
      setRenderLogs(prev => [...prev, `Loading code from GitHub: ${repoName}`]);
      
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'load-code',
          repoName: repoName
        }
      });

      if (error) {
        console.error('Error loading code from GitHub:', error);
        setRenderLogs(prev => [...prev, `Error loading code: ${error.message}`]);
        return;
      }

      if (data && data.files) {
        setProjectFiles(data.files);
        setRenderLogs(prev => [...prev, `Loaded ${data.files.length} files from GitHub`]);
      }
    } catch (error) {
      console.error('Error loading code from GitHub:', error);
      setRenderLogs(prev => [...prev, `Error loading code: ${error.message}`]);
    }
  };

  const handleFilesGenerated = useCallback((files: ProjectFile[]) => {
    console.log('Files generated callback received:', files);
    
    if (files.length === 0) {
      setIsGenerating(false);
      return;
    }
    
    setProjectFiles(prev => {
      const updatedFiles = [...prev];
      files.forEach(newFile => {
        const existingIndex = updatedFiles.findIndex(f => f.fileName === newFile.fileName);
        if (existingIndex >= 0) {
          updatedFiles[existingIndex] = newFile;
          console.log(`Updated existing file: ${newFile.fileName}`);
        } else {
          updatedFiles.push(newFile);
          console.log(`Added new file: ${newFile.fileName}`);
        }
      });
      return updatedFiles;
    });
    
    setRenderLogs(prev => [
      ...prev,
      `Generated ${files.length} files at ${new Date().toLocaleTimeString()}`,
      ...files.map(f => `✓ Created: ${f.fileName} (${f.content.split('\\n').length} lines)`)
    ]);
    
    // Important: Set generating to false after processing files
    setTimeout(() => {
      console.log('Setting isGenerating to false after file processing');
      setIsGenerating(false);
    }, 500);
  }, []);

  const handleGeneratingStart = useCallback(() => {
    console.log('Generation started - setting isGenerating to true');
    setIsGenerating(true);
    setRenderLogs(prev => [...prev, `AI generation started at ${new Date().toLocaleTimeString()}`]);
  }, []);

  const handleGeneratingEnd = useCallback(() => {
    console.log('Generation ended - setting isGenerating to false');
    // Small delay to ensure file processing is complete
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  }, []);

  const handleSessionFileUpload = (file: File) => {
    if (file && file.name.endsWith('.session')) {
      setSessionFile(file);
      
      const sessionFileContent = {
        fileName: file.name,
        content: 'Binary session file - content not displayed',
        language: 'text'
      };
      
      setProjectFiles(prev => {
        const existingIndex = prev.findIndex(f => f.fileName === file.name);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = sessionFileContent;
          return updated;
        }
        return [...prev, sessionFileContent];
      });
      
      setRenderLogs(prev => [...prev, `Session file uploaded: ${file.name} at ${new Date().toLocaleTimeString()}`]);
      toast({
        title: "Success",
        description: "Session file uploaded and added to file tree",
      });
    } else {
      toast({
        title: "Error",
        description: "Please upload a valid .session file",
        variant: "destructive",
      });
    }
  };

  const handleFileUpdate = (fileName: string, content: string) => {
    setProjectFiles(prev => 
      prev.map(file => 
        file.fileName === fileName ? { ...file, content } : file
      )
    );
    setRenderLogs(prev => [...prev, `Updated: ${fileName} at ${new Date().toLocaleTimeString()}`]);
  };

  const handleCreateGitHubRepo = async () => {
    if (!user || projectFiles.length === 0) {
      toast({
        title: "Error",
        description: "No files to create repository with",
        variant: "destructive",
      });
      return;
    }

    if (!hasApiKeys) {
      toast({
        title: "Configuration Required",
        description: "GitHub API key not configured. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingRepo(true);
    setRenderLogs(prev => [...prev, `Creating GitHub repository at ${new Date().toLocaleTimeString()}...`]);
    
    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-github-repo',
          projectName: projectName,
          files: projectFiles,
          sessionFile: sessionFile,
          projectId: projectId
        }
      });

      if (error) {
        console.error('GitHub repo creation error:', error);
        throw error;
      }

      if (data && data.success) {
        setGithubRepoUrl(data.repoUrl);
        setRenderLogs(prev => [
          ...prev, 
          `✓ GitHub repository created successfully`,
          `Repository URL: ${data.repoUrl}`
        ]);
        
        toast({
          title: "Success",
          description: "GitHub repository created successfully!",
        });
      } else {
        throw new Error(data?.error || 'Failed to create repository');
      }

    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      setRenderLogs(prev => [...prev, `❌ Error creating repository: ${error.message}`]);
      toast({
        title: "Error",
        description: `Failed to create GitHub repository: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleGitSync = async () => {
    if (!user || !githubRepoUrl || projectFiles.length === 0) {
      toast({
        title: "Error",
        description: "No GitHub repository found or no files to sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setRenderLogs(prev => [...prev, `Syncing files to GitHub at ${new Date().toLocaleTimeString()}...`]);
    
    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'sync-to-git',
          projectName: projectName,
          files: projectFiles,
          sessionFile: sessionFile,
          githubRepoUrl: githubRepoUrl,
          updateExisting: true
        }
      });

      if (error) throw error;

      if (data && data.success) {
        setRenderLogs(prev => [...prev, '✓ Files synced to GitHub repository successfully']);
        toast({
          title: "Success",
          description: "Files synced to repository successfully!",
        });
      } else {
        throw new Error(data?.error || 'Sync failed');
      }

    } catch (error) {
      console.error('Error syncing to Git:', error);
      setRenderLogs(prev => [...prev, `❌ Sync error: ${error.message}`]);
      toast({
        title: "Error",
        description: `Failed to sync files: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeploy = async () => {
    if (!user || !githubRepoUrl) {
      toast({
        title: "Error",
        description: "GitHub repository required for deployment",
        variant: "destructive",
      });
      return;
    }

    if (!hasApiKeys) {
      toast({
        title: "Configuration Required",
        description: "Render API key not configured. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus('deploying');
    setRenderLogs(prev => [...prev, `Starting deployment to Render at ${new Date().toLocaleTimeString()}...`]);

    try {
      if (projectFiles.length > 0) {
        await handleGitSync();
      }

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'deploy-to-render',
          projectName: projectName,
          githubRepoUrl: githubRepoUrl,
          projectId: projectId
        }
      });

      if (error) throw error;

      if (data && data.success) {
        setDeploymentStatus('deployed');
        setRenderServiceId(data.serviceId);
        setRenderLogs(prev => [
          ...prev, 
          '✓ Deployment successful!', 
          `Service URL: ${data.serviceUrl}`,
          `Service ID: ${data.serviceId}`
        ]);

        toast({
          title: "Success",
          description: "Project deployed successfully to Render!",
        });
      } else {
        throw new Error(data?.error || 'Deployment failed');
      }

    } catch (error) {
      console.error('Error deploying to Render:', error);
      setDeploymentStatus('error');
      setRenderLogs(prev => [...prev, `❌ Deployment failed: ${error.message}`]);
      toast({
        title: "Error",
        description: `Failed to deploy: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'deploying':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500/30';
    }
  };

  const handleSessionFileRequest = () => {
    toast({
      title: "Session File Required",
      description: "Please upload a Telegram session file using the attachment button in the chat",
    });
  };

  return (
    <div className="h-screen flex bg-background relative">
      {/* Sidebar with proper navigation */}
      <div className={`transition-all duration-300 ${sidebarMinimized ? 'w-16' : 'w-96'} border-r border-border flex flex-col bg-card`}>
        {/* Fixed Header with Navigation Controls */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          {!sidebarMinimized && (
            <h2 className="font-semibold text-lg text-foreground">
              Cloud Runner
            </h2>
          )}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="p-2"
              title="Dashboard"
            >
              <Home className="w-4 h-4" />
              {!sidebarMinimized && <span className="ml-2">Dashboard</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {!sidebarMinimized && <span className="ml-2">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
              className="p-2"
              title={sidebarMinimized ? "Expand Menu" : "Minimize Menu"}
            >
              {sidebarMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {/* API Keys Status Indicator */}
        {!sidebarMinimized && (
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-2 text-sm">
              {hasApiKeys ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600">API Keys Configured</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    API Keys Missing
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* AI Assistant */}
        {!sidebarMinimized && (
          <div className="flex-1 overflow-hidden">
            <CloudRunnerAIAssistant
              onFilesGenerated={handleFilesGenerated}
              onSessionFileRequest={() => {
                toast({
                  title: "Session File Required",
                  description: "Please upload a Telegram session file using the attachment button in the chat",
                });
              }}
              sessionFile={sessionFile}
              currentFiles={projectFiles}
              onSessionFileUpload={(file: File) => {
                if (file && file.name.endsWith('.session')) {
                  setSessionFile(file);
                  
                  const sessionFileContent = {
                    fileName: file.name,
                    content: 'Binary session file - content not displayed',
                    language: 'text'
                  };
                  
                  setProjectFiles(prev => {
                    const existingIndex = prev.findIndex(f => f.fileName === file.name);
                    if (existingIndex >= 0) {
                      const updated = [...prev];
                      updated[existingIndex] = sessionFileContent;
                      return updated;
                    }
                    return [...prev, sessionFileContent];
                  });
                  
                  setRenderLogs(prev => [...prev, `Session file uploaded: ${file.name} at ${new Date().toLocaleTimeString()}`]);
                  toast({
                    title: "Success",
                    description: "Session file uploaded and added to file tree",
                  });
                } else {
                  toast({
                    title: "Error",
                    description: "Please upload a valid .session file",
                    variant: "destructive",
                  });
                }
              }}
              onGeneratingStart={handleGeneratingStart}
              onGeneratingEnd={handleGeneratingEnd}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Header */}
        <div className="bg-background border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Personal</span>
              </div>
              <div className="text-muted-foreground">›</div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-transparent text-foreground font-medium focus:outline-none border-b border-transparent focus:border-border transition-colors"
              />
              <Badge className={getStatusColor(deploymentStatus)}>
                {deploymentStatus}
              </Badge>
              {isGenerating && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreateGitHubRepo}
                disabled={!projectFiles.length || isCreatingRepo || !hasApiKeys}
                variant="outline"
                className="px-4"
              >
                {isCreatingRepo ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Github className="w-4 h-4 mr-2" />
                )}
                Create Repo
              </Button>
              
              {githubRepoUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGitSync}
                    disabled={isSyncing || !projectFiles.length || !hasApiKeys}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-4 h-4 mr-2" />
                        Git Sync
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(githubRepoUrl, '_blank')}
                    title="View GitHub Repository"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button 
                onClick={handleDeploy}
                disabled={!githubRepoUrl || isDeploying || !hasApiKeys}
                className="px-6 bg-green-500 hover:bg-green-600 text-white"
              >
                {isDeploying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                {isDeploying ? 'Deploying...' : 'Deploy'}
              </Button>
            </div>
          </div>
        </div>

        {/* File Tree Container */}
        <div className="flex-1 p-6 overflow-hidden min-h-0">
          <PlaygroundCanvas className="w-full h-full">
            <div className="w-full h-full">
              <CloudRunnerFileTree
                files={projectFiles}
                logs={renderLogs}
                isGenerating={isGenerating}
                onFileUpdate={handleFileUpdate}
              />
            </div>
          </PlaygroundCanvas>
        </div>
      </div>
    </div>
  );
};

export default CloudRunner;
