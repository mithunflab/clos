import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  FileCode, 
  Github, 
  ExternalLink, 
  Cloud,
  Play,
  Terminal,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  Code2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
}

interface DeploymentState {
  step: 'idle' | 'generating' | 'creating-repo' | 'deploying' | 'success' | 'error';
  progress: number;
  message: string;
  githubUrl?: string;
  renderUrl?: string;
  serviceId?: string;
}

const StreamlinedCloudRunner: React.FC = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployment, setDeployment] = useState<DeploymentState>({
    step: 'idle',
    progress: 0,
    message: 'Ready to generate and deploy'
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
  };

  const generateFiles = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description of what you want to build');
      return;
    }

    setDeployment({
      step: 'generating',
      progress: 20,
      message: 'AI is generating your project files...'
    });
    addLog('🤖 Starting AI file generation...');

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-assistant', {
        body: { 
          message: prompt,
          action: 'generate-files'
        }
      });

      if (error) throw error;

      if (data?.files) {
        setFiles(data.files);
        setProjectName(data.projectName || `project-${Date.now()}`);
        addLog(`✅ Generated ${data.files.length} files`);
        data.files.forEach((file: ProjectFile) => {
          addLog(`📄 Created: ${file.fileName}`);
        });
        
        setDeployment({
          step: 'idle',
          progress: 0,
          message: `Ready to deploy ${data.files.length} files`
        });
        toast.success(`Generated ${data.files.length} files successfully!`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      addLog(`❌ Generation failed: ${error.message}`);
      setDeployment({
        step: 'error',
        progress: 0,
        message: 'Failed to generate files'
      });
      toast.error('Failed to generate files');
    }
  };

  const deployProject = async () => {
    if (!files.length) {
      toast.error('No files to deploy. Generate some code first!');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    // Step 1: Create GitHub Repository
    setDeployment({
      step: 'creating-repo',
      progress: 25,
      message: 'Creating GitHub repository...'
    });
    addLog('🔄 Creating GitHub repository...');

    try {
      const { data: repoData, error: repoError } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-github-repo',
          projectName: projectName,
          files: files
        }
      });

      if (repoError) throw repoError;

      const githubUrl = repoData.repoUrl;
      addLog(`✅ GitHub repository created: ${repoData.repoName}`);
      addLog(`🔗 Repository URL: ${githubUrl}`);
      
      setDeployment(prev => ({
        ...prev,
        progress: 50,
        message: 'GitHub repository created successfully',
        githubUrl
      }));

      // Step 2: Deploy to Render
      setDeployment(prev => ({
        ...prev,
        step: 'deploying',
        progress: 70,
        message: 'Deploying to Render...'
      }));
      addLog('🚀 Starting Render deployment...');

      // Direct Render API call
      const renderApiKey = 'rnd_5Dn7pSgA4Oq1e28F9vXh3oZnKcMj'; // Replace with actual key
      
      const renderResponse = await fetch('https://api.render.com/v1/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${renderApiKey}`
        },
        body: JSON.stringify({
          type: 'web',
          name: projectName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
          ownerId: await getRenderOwnerId(renderApiKey),
          repo: githubUrl,
          branch: 'main',
          buildCommand: 'pip install -r requirements.txt',
          startCommand: 'python main.py',
          plan: 'starter',
          region: 'oregon',
          autoDeploy: true,
          rootDir: '.',
          envVars: []
        })
      });

      if (!renderResponse.ok) {
        const errorData = await renderResponse.text();
        throw new Error(`Render deployment failed: ${renderResponse.status} - ${errorData}`);
      }

      const renderData = await renderResponse.json();
      const renderUrl = renderData.service.serviceUrl;
      const serviceId = renderData.service.id;

      addLog(`✅ Render deployment successful!`);
      addLog(`🌐 Service URL: ${renderUrl}`);
      addLog(`📦 Service ID: ${serviceId}`);

      setDeployment({
        step: 'success',
        progress: 100,
        message: 'Deployment completed successfully!',
        githubUrl,
        renderUrl,
        serviceId
      });

      toast.success('Project deployed successfully!');

    } catch (error) {
      console.error('Deployment error:', error);
      addLog(`❌ Deployment failed: ${error.message}`);
      setDeployment({
        step: 'error',
        progress: 0,
        message: `Deployment failed: ${error.message}`
      });
      toast.error(`Deployment failed: ${error.message}`);
    }
  };

  const getRenderOwnerId = async (apiKey: string) => {
    try {
      const response = await fetch('https://api.render.com/v1/owners', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (response.ok) {
        const owners = await response.json();
        return owners[0]?.owner?.id;
      }
    } catch (error) {
      console.error('Failed to get owner ID:', error);
    }
    return 'default-owner-id';
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'generating':
        return <Bot className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'creating-repo':
        return <Github className="h-5 w-5 text-purple-500 animate-spin" />;
      case 'deploying':
        return <Cloud className="h-5 w-5 text-orange-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const resetDeployment = () => {
    setFiles([]);
    setPrompt('');
    setProjectName('');
    setLogs([]);
    setDeployment({
      step: 'idle',
      progress: 0,
      message: 'Ready to generate and deploy'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Please sign in to use Cloud Runner</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Cloud Runner
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Describe your project → AI generates code → Auto-deploy to Render
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input & Generation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Code Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-bot"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Describe what you want to build</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Create a Telegram bot that responds to messages, or a web scraper that extracts data..."
                  className="w-full h-32 p-3 border rounded-lg resize-none mt-1"
                />
              </div>

              <Button 
                onClick={generateFiles} 
                disabled={deployment.step === 'generating' || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {deployment.step === 'generating' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Files */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Generated Files ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileCode className="h-4 w-4 text-blue-500" />
                      <span className="font-mono text-sm">{file.fileName}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {file.language}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Deployment & Status */}
        <div className="space-y-6">
          {/* Deployment Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Deploy to Cloud
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deployment Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {getStepIcon(deployment.step)}
                  <span className="font-medium">{deployment.message}</span>
                </div>
                
                {deployment.progress > 0 && (
                  <Progress value={deployment.progress} className="h-2" />
                )}
              </div>

              {/* Links */}
              {deployment.githubUrl && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    📂 GitHub Repository
                  </p>
                  <a 
                    href={deployment.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all flex items-center gap-1"
                  >
                    {deployment.githubUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {deployment.renderUrl && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    🌐 Live Application
                  </p>
                  <a 
                    href={deployment.renderUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 text-sm break-all flex items-center gap-1"
                  >
                    {deployment.renderUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Deploy Button */}
              <div className="flex gap-2">
                <Button 
                  onClick={deployProject}
                  disabled={!files.length || ['generating', 'creating-repo', 'deploying'].includes(deployment.step)}
                  className="flex-1"
                  size="lg"
                >
                  {deployment.step === 'creating-repo' ? (
                    <>
                      <Github className="h-4 w-4 mr-2 animate-spin" />
                      Creating Repo...
                    </>
                  ) : deployment.step === 'deploying' ? (
                    <>
                      <Cloud className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Deploy Now
                    </>
                  )}
                </Button>

                {deployment.step === 'success' && (
                  <Button variant="outline" onClick={resetDeployment}>
                    New Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Live Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full">
                <div className="space-y-1 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">Logs will appear here...</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="text-green-600 dark:text-green-400">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StreamlinedCloudRunner;