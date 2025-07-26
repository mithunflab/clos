
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Maximize2
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
  const [navMinimized, setNavMinimized] = useState(false);
  const [renderServiceId, setRenderServiceId] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadExistingProject();
    } else {
      setProjectName(`cloud-bot-${Date.now()}`);
    }
  }, [projectId]);

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
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'load-code',
          repoName: repoName
        }
      });

      if (error) {
        console.error('Error loading code from GitHub:', error);
        return;
      }

      if (data && data.files) {
        setProjectFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading code from GitHub:', error);
    }
  };

  const handleFilesGenerated = useCallback((files: ProjectFile[]) => {
    console.log('Files generated:', files);
    setProjectFiles(prev => {
      // Merge new files with existing ones, replacing duplicates
      const updatedFiles = [...prev];
      files.forEach(newFile => {
        const existingIndex = updatedFiles.findIndex(f => f.fileName === newFile.fileName);
        if (existingIndex >= 0) {
          updatedFiles[existingIndex] = newFile;
        } else {
          updatedFiles.push(newFile);
        }
      });
      return updatedFiles;
    });
    setIsGenerating(false);
    
    setRenderLogs(prev => [
      ...prev,
      `Generated ${files.length} files`,
      ...files.map(f => `Created: ${f.fileName}`)
    ]);
  }, []);

  const handleSessionFileUpload = (file: File) => {
    if (file && file.name.endsWith('.session')) {
      setSessionFile(file);
      
      // Add session file to file tree immediately
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
      
      setRenderLogs(prev => [...prev, `Session file uploaded: ${file.name}`]);
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
    setRenderLogs(prev => [...prev, `Updated: ${fileName}`]);
  };

  const fetchRenderLogs = async (serviceId: string) => {
    try {
      // This would fetch real logs from Render API
      // For now, we'll simulate logs
      const mockLogs = [
        `[${new Date().toISOString()}] Starting deployment...`,
        `[${new Date().toISOString()}] Building Docker image...`,
        `[${new Date().toISOString()}] Installing dependencies...`,
        `[${new Date().toISOString()}] Service deployed successfully!`
      ];
      
      setRenderLogs(prev => [...prev, ...mockLogs]);
    } catch (error) {
      console.error('Error fetching render logs:', error);
    }
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

    setIsCreatingRepo(true);
    setRenderLogs(prev => [...prev, 'Creating GitHub repository...']);
    
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
        setRenderLogs(prev => [...prev, `GitHub repository created: ${data.repoUrl}`]);
        
        toast({
          title: "Success",
          description: "GitHub repository created successfully!",
        });
      } else {
        throw new Error(data?.error || 'Failed to create repository');
      }

    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      setRenderLogs(prev => [...prev, `Error creating repository: ${error.message}`]);
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
    setRenderLogs(prev => [...prev, 'Syncing files to GitHub...']);
    
    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'sync-to-git',
          projectName: projectName,
          files: projectFiles,
          sessionFile: sessionFile,
          githubRepoUrl: githubRepoUrl
        }
      });

      if (error) throw error;

      if (data && data.success) {
        setRenderLogs(prev => [...prev, 'Files synced to GitHub successfully']);
        toast({
          title: "Success",
          description: "Files synced to GitHub successfully!",
        });
      } else {
        throw new Error(data?.error || 'Sync failed');
      }

    } catch (error) {
      console.error('Error syncing to Git:', error);
      setRenderLogs(prev => [...prev, `Sync error: ${error.message}`]);
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

    setIsDeploying(true);
    setDeploymentStatus('deploying');
    setRenderLogs(prev => [...prev, 'Starting deployment to Render...']);

    try {
      // First sync latest changes to Git
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
          'Deployment successful!', 
          `Service URL: ${data.serviceUrl}`
        ]);

        // Start fetching real-time logs
        if (data.serviceId) {
          await fetchRenderLogs(data.serviceId);
        }

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
      setRenderLogs(prev => [...prev, `Deployment failed: ${error.message}`]);
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
      <div className={`transition-all duration-300 ${navMinimized ? 'w-16' : 'w-96'} border-r border-border flex flex-col`}>
        {navMinimized ? (
          <div className="p-4 flex flex-col items-center space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNavMinimized(false)}
              className="w-8 h-8 p-0"
              title="Maximize"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 p-0"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-8 h-8 p-0"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Cloud Runner</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="w-8 h-8 p-0"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNavMinimized(true)}
                  className="w-8 h-8 p-0"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CloudRunnerAIAssistant
              onFilesGenerated={handleFilesGenerated}
              onSessionFileRequest={handleSessionFileRequest}
              sessionFile={sessionFile}
              currentFiles={projectFiles}
              onSessionFileUpload={handleSessionFileUpload}
              onGeneratingStart={() => setIsGenerating(true)}
            />
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="bg-background border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground hover:bg-accent p-2"
              >
                <Home className="w-5 h-5" />
              </Button>
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
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreateGitHubRepo}
                disabled={!projectFiles.length || isCreatingRepo}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGitSync}
                  disabled={isSyncing || !projectFiles.length}
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
              )}
              
              <Button 
                onClick={handleDeploy}
                disabled={!githubRepoUrl || isDeploying}
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

        {/* Main Content */}
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
