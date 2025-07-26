
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  FileCode, 
  Github, 
  ExternalLink, 
  AlertTriangle,
  Cloud,
  Play,
  Code
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CloudRunnerAIAssistant from '@/components/CloudRunnerAIAssistant';
import CloudRunnerFileTree from '@/components/CloudRunnerFileTree';
import SessionFileUpload from '@/components/SessionFileUpload';
import PythonRunner from '@/components/PythonRunner';

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
}

const CloudRunner: React.FC = () => {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');

  useEffect(() => {
    if (files.length > 0 && !projectName) {
      setProjectName(`cloud-bot-${Date.now()}`);
    }
  }, [files]);

  const handleFilesGenerated = (newFiles: ProjectFile[]) => {
    console.log('Files generated callback received:', newFiles);
    
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      
      newFiles.forEach(newFile => {
        const existingIndex = updatedFiles.findIndex(f => f.fileName === newFile.fileName);
        if (existingIndex >= 0) {
          updatedFiles[existingIndex] = newFile;
          console.log('Updated existing file:', newFile.fileName);
        } else {
          updatedFiles.push(newFile);
          console.log('Added new file:', newFile.fileName);
        }
      });
      
      return updatedFiles;
    });
  };

  const handleSessionFileRequest = () => {
    toast.info('Please upload your session.session file for Telegram bot functionality');
  };

  const handleSessionFileUpload = (file: File) => {
    setSessionFile(file);
    addLog(`Session file uploaded: ${file.name}`);
    toast.success('Session file uploaded successfully');
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleCreateGitHubRepo = async () => {
    if (!files.length) {
      toast.error('No files to upload. Generate some code first!');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreatingRepo(true);
    addLog('Creating GitHub repository...');

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-github-repo',
          projectName: projectName,
          files: files,
          sessionFile: sessionFile
        }
      });

      if (error) {
        console.error('GitHub repo creation error:', error);
        throw error;
      }

      if (data?.success) {
        setGithubRepoUrl(data.repoUrl);
        addLog(`✅ Repository created: ${data.repoName}`);
        addLog(`📁 ${data.filesUploaded || files.length} files uploaded`);
        toast.success(`Repository created: ${data.repoName}`);
      } else {
        throw new Error(data?.error || 'Failed to create repository');
      }
    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      const errorMessage = error.message || 'Failed to create GitHub repository';
      addLog(`❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleDeployToRender = async () => {
    if (!githubRepoUrl) {
      toast.error('Create a GitHub repository first');
      return;
    }

    setIsDeploying(true);
    addLog('Deploying to Render...');

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'deploy-to-render',
          projectName: projectName,
          githubRepoUrl: githubRepoUrl
        }
      });

      if (error) throw error;

      if (data?.success) {
        setDeploymentUrl(data.serviceUrl);
        addLog(`🚀 Deployed successfully: ${data.serviceUrl}`);
        toast.success('Deployment successful!');
      } else {
        throw new Error(data?.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error.message || 'Deployment failed';
      addLog(`❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleGeneratingStart = () => {
    console.log('Generation started - setting isGenerating to true');
    setIsGenerating(true);
  };

  const handleGeneratingEnd = () => {
    console.log('Generation ended - setting isGenerating to false');
    setIsGenerating(false);
    
    // Add a small delay to ensure UI updates properly
    setTimeout(() => {
      console.log('Setting isGenerating to false after file processing');
      setIsGenerating(false);
    }, 100);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Please sign in to use Cloud Runner</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cloud Runner</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered Python automation with real-time execution
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {githubRepoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(githubRepoUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                View Repo
              </Button>
            )}
            
            {deploymentUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(deploymentUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Live Site
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Project name (auto-generated)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isCreatingRepo}
            />
          </div>
          
          <Button
            onClick={handleCreateGitHubRepo}
            disabled={isCreatingRepo || files.length === 0}
            className="flex items-center gap-2"
          >
            <Github className="h-4 w-4" />
            {isCreatingRepo ? 'Creating...' : 'Create Repository'}
          </Button>
          
          <Button
            onClick={handleDeployToRender}
            disabled={isDeploying || !githubRepoUrl}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Cloud className="h-4 w-4" />
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="assistant" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Project Files
                {files.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {files.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="runner" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Python Runner
              </TabsTrigger>
              <TabsTrigger value="session" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Session Upload
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="assistant" className="h-full m-0">
              <div className="h-full p-4">
                <CloudRunnerAIAssistant
                  onFilesGenerated={handleFilesGenerated}
                  onSessionFileRequest={handleSessionFileRequest}
                  sessionFile={sessionFile}
                  currentFiles={files}
                  onSessionFileUpload={handleSessionFileUpload}
                  onGeneratingStart={handleGeneratingStart}
                  onGeneratingEnd={handleGeneratingEnd}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="h-full m-0">
              <div className="h-full p-4">
                <CloudRunnerFileTree
                  files={files}
                  logs={logs}
                  isGenerating={isGenerating}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="runner" className="h-full m-0">
              <div className="h-full p-4">
                <PythonRunner />
              </div>
            </TabsContent>
            
            <TabsContent value="session" className="h-full m-0">
              <div className="h-full p-4">
                <SessionFileUpload
                  onFileUpload={handleSessionFileUpload}
                  currentFile={sessionFile}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default CloudRunner;
