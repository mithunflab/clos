
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
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import SessionFileUpload from '@/components/SessionFileUpload';
import CloudRunnerAIAssistant from '@/components/CloudRunnerAIAssistant';
import CloudRunnerFileTree from '@/components/CloudRunnerFileTree';
import PlaygroundCanvas from '@/components/PlaygroundCanvas';
import { useCloudRunnerProjects } from '@/hooks/useCloudRunnerProjects';

interface ProjectFile {
  name: string;
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
    setProjectFiles(files);
    setIsGenerating(false);
    
    setRenderLogs(prev => [
      ...prev,
      `Generated ${files.length} files`,
      ...files.map(f => `Created: ${f.name}`)
    ]);
  }, []);

  const handleSessionFileUpload = (file: File) => {
    if (file && file.name.endsWith('.session')) {
      setSessionFile(file);
      setRenderLogs(prev => [...prev, `Session file uploaded: ${file.name}`]);
      toast({
        title: "Success",
        description: "Session file uploaded successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Please upload a valid .session file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSessionFile = () => {
    setSessionFile(null);
    setRenderLogs(prev => [...prev, 'Session file removed']);
    toast({
      title: "Success",
      description: "Session file removed",
    });
  };

  const handleCreateGitHubRepo = async () => {
    if (!user || projectFiles.length === 0) return;

    setIsCreatingRepo(true);
    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-github-repo',
          projectName: projectName,
          files: projectFiles,
          sessionFile: sessionFile
        }
      });

      if (error) throw error;

      setGithubRepoUrl(data.repoUrl);
      setRenderLogs(prev => [...prev, `GitHub repository created: ${data.repoUrl}`]);
      
      // Save project to database
      const { error: dbError } = await supabase
        .from('cloud_runner_projects')
        .upsert({
          id: projectId || undefined,
          user_id: user.id,
          project_name: projectName,
          github_repo_name: data.repoName,
          github_repo_url: data.repoUrl,
          session_file_uploaded: !!sessionFile
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      toast({
        title: "Success",
        description: "GitHub repository created successfully!",
      });

    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      toast({
        title: "Error",
        description: "Failed to create GitHub repository",
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

      setRenderLogs(prev => [...prev, 'Files synced to GitHub successfully']);
      toast({
        title: "Success",
        description: "Files synced to GitHub successfully!",
      });

    } catch (error) {
      console.error('Error syncing to Git:', error);
      toast({
        title: "Error",
        description: "Failed to sync files to GitHub",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeploy = async () => {
    if (!user || !githubRepoUrl) return;

    setIsDeploying(true);
    setRenderLogs(prev => [...prev, 'Starting deployment...']);

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'deploy-to-render',
          projectName: projectName,
          githubRepoUrl: githubRepoUrl,
          projectId: projectId
        }
      });

      if (error) throw error;

      setDeploymentStatus('deployed');
      setRenderLogs(prev => [
        ...prev, 
        'Deployment successful!', 
        `Service URL: ${data.serviceUrl}`
      ]);

      toast({
        title: "Success",
        description: "Project deployed successfully to Render!",
      });

    } catch (error) {
      console.error('Error deploying to Render:', error);
      setDeploymentStatus('error');
      setRenderLogs(prev => [...prev, `Deployment failed: ${error.message}`]);
      toast({
        title: "Error",
        description: "Failed to deploy to Render",
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
    // This could trigger a modal or focus on the session upload area
    toast({
      title: "Session File Required",
      description: "Please upload a Telegram session file to continue",
    });
  };

  return (
    <div className="h-screen flex bg-background relative">
      <div className="w-96 border-r border-border flex flex-col">
        <CloudRunnerAIAssistant
          onFilesGenerated={handleFilesGenerated}
          onSessionFileRequest={handleSessionFileRequest}
          sessionFile={sessionFile}
          currentFiles={projectFiles}
        />
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
            <div className="w-full h-full flex flex-col">
              <CloudRunnerFileTree
                files={projectFiles}
                logs={renderLogs}
                isGenerating={isGenerating}
              />
              
              {/* Session File Upload Area */}
              {!sessionFile && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Session File</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload your Telegram session file
                        </p>
                      </div>
                      <SessionFileUpload
                        onFileUpload={handleSessionFileUpload}
                        currentFile={sessionFile}
                        onRemoveFile={handleRemoveSessionFile}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </PlaygroundCanvas>
        </div>
      </div>
    </div>
  );
};

export default CloudRunner;
