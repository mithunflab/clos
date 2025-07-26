import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  FileCode, 
  Github, 
  ExternalLink, 
  AlertTriangle,
  Cloud,
  Play,
  Code,
  Terminal,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCloudRunnerProjects } from '@/hooks/useCloudRunnerProjects';
import CloudRunnerAIAssistant from '@/components/CloudRunnerAIAssistant';
import CloudRunnerFileTree from '@/components/CloudRunnerFileTree';
import SessionFileUpload from '@/components/SessionFileUpload';
import PythonRunner from '@/components/PythonRunner';

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
}

interface DeploymentStatus {
  status: string;
  progress: number;
  logs: string[];
  lastUpdate: string;
}

const CloudRunner: React.FC = () => {
  const { user } = useAuth();
  const { syncToGithub, getDeploymentStatus, getDeploymentLogs } = useCloudRunnerProjects();
  
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [renderServiceId, setRenderServiceId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    status: 'idle',
    progress: 0,
    logs: [],
    lastUpdate: ''
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  useEffect(() => {
    if (files.length > 0 && !projectName) {
      setProjectName(`cloud-bot-${Date.now()}`);
    }
  }, [files]);

  // Auto-sync files to GitHub when they change
  useEffect(() => {
    if (autoSyncEnabled && githubRepoName && files.length > 0 && !isGenerating) {
      const syncTimeout = setTimeout(() => {
        handleAutoSync();
      }, 2000); // Debounce for 2 seconds
      
      return () => clearTimeout(syncTimeout);
    }
  }, [files, githubRepoName, autoSyncEnabled, isGenerating]);

  // Monitor deployment status
  useEffect(() => {
    if (renderServiceId) {
      const statusInterval = setInterval(() => {
        checkDeploymentStatus();
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(statusInterval);
    }
  }, [renderServiceId]);

  // Start live log monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would connect to real-time log streams
      // For now, we combine logs from various sources
      const combinedLogs = [...logs, ...liveLogs];
      if (combinedLogs.length !== logs.length + liveLogs.length) {
        // Update if there are new logs
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [logs, liveLogs]);

  const handleAutoSync = async () => {
    if (!githubRepoName || files.length === 0 || isSyncing) return;
    
    console.log('Auto-syncing files to GitHub...');
    setIsSyncing(true);
    
    try {
      const result = await syncToGithub('', githubRepoName, files);
      if (result.success) {
        addLiveLog(`[${new Date().toLocaleTimeString()}] ✅ Auto-synced ${result.syncedFiles} files to GitHub`);
      } else {
        console.error('Auto-sync failed:', result.error);
        addLiveLog(`[${new Date().toLocaleTimeString()}] ❌ Auto-sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!githubRepoName || files.length === 0) {
      toast.error('No repository or files to sync');
      return;
    }

    setIsSyncing(true);
    addLiveLog(`[${new Date().toLocaleTimeString()}] 🔄 Starting manual sync to GitHub...`);

    try {
      const result = await syncToGithub('', githubRepoName, files);
      if (result.success) {
        addLiveLog(`[${new Date().toLocaleTimeString()}] ✅ Manually synced ${result.syncedFiles} files to GitHub`);
        toast.success(`Synced ${result.syncedFiles} files to GitHub`);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Manual sync failed';
      addLiveLog(`[${new Date().toLocaleTimeString()}] ❌ Manual sync failed: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkDeploymentStatus = async () => {
    if (!renderServiceId) return;

    try {
      const result = await getDeploymentStatus(renderServiceId);
      if (result.success && result.status) {
        setDeploymentStatus(prev => ({
          ...prev,
          status: result.status,
          lastUpdate: new Date().toISOString(),
          progress: result.status === 'live' ? 100 : prev.progress
        }));

        // Get logs if deployment is running
        if (['building', 'deploying'].includes(result.status)) {
          const logsResult = await getDeploymentLogs(renderServiceId);
          if (logsResult.success && logsResult.logs) {
            const newLogs = logsResult.logs.split('\n').filter(log => log.trim());
            setDeploymentStatus(prev => ({
              ...prev,
              logs: newLogs
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to check deployment status:', error);
    }
  };

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

    // Add to live logs
    const logEntry = `[${new Date().toLocaleTimeString()}] Generated ${newFiles.length} files`;
    addLiveLog(logEntry);
  };

  const handleSessionFileRequest = () => {
    toast.info('Please upload your session.session file for Telegram bot functionality');
  };

  const handleSessionFileUpload = (file: File) => {
    setSessionFile(file);
    addLog(`Session file uploaded: ${file.name}`);
    addLiveLog(`[${new Date().toLocaleTimeString()}] Session file uploaded: ${file.name}`);
    toast.success('Session file uploaded successfully');
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const addLiveLog = (message: string) => {
    setLiveLogs(prev => [...prev, message].slice(-100)); // Keep last 100 logs
  };

  const handlePythonLogsUpdate = (pythonLogs: string[]) => {
    setLiveLogs(prev => [...prev, ...pythonLogs]);
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
    addLiveLog(`[${new Date().toLocaleTimeString()}] Starting GitHub repository creation...`);

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
        setGithubRepoName(data.repoName);
        addLog(`✅ Repository created: ${data.repoName}`);
        addLog(`📁 ${data.filesUploaded || files.length} files uploaded`);
        addLiveLog(`[${new Date().toLocaleTimeString()}] ✅ Repository created: ${data.repoName}`);
        toast.success(`Repository created: ${data.repoName}`);
      } else {
        throw new Error(data?.error || 'Failed to create repository');
      }
    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      const errorMessage = error.message || 'Failed to create GitHub repository';
      addLog(`❌ ${errorMessage}`);
      addLiveLog(`[${new Date().toLocaleTimeString()}] ❌ ${errorMessage}`);
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
    setDeploymentStatus({
      status: 'deploying',
      progress: 25,
      logs: ['Starting deployment to Render...'],
      lastUpdate: new Date().toISOString()
    });
    addLog('Deploying to Render...');
    addLiveLog(`[${new Date().toLocaleTimeString()}] Starting deployment to Render...`);

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
        setRenderServiceId(data.serviceId);
        setDeploymentStatus({
          status: 'building',
          progress: 75,
          logs: ['Deployment created successfully', 'Building application...'],
          lastUpdate: new Date().toISOString()
        });
        addLog(`🚀 Deployed successfully: ${data.serviceUrl}`);
        addLiveLog(`[${new Date().toLocaleTimeString()}] 🚀 Deployed successfully: ${data.serviceUrl}`);
        toast.success('Deployment successful!');
      } else {
        throw new Error(data?.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error.message || 'Deployment failed';
      setDeploymentStatus({
        status: 'error',
        progress: 0,
        logs: [errorMessage],
        lastUpdate: new Date().toISOString()
      });
      addLog(`❌ ${errorMessage}`);
      addLiveLog(`[${new Date().toLocaleTimeString()}] ❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleGeneratingStart = () => {
    console.log('Generation started - setting isGenerating to true');
    setIsGenerating(true);
    addLiveLog(`[${new Date().toLocaleTimeString()}] AI code generation started...`);
  };

  const handleGeneratingEnd = () => {
    console.log('Generation ended - setting isGenerating to false');
    setIsGenerating(false);
    
    setTimeout(() => {
      console.log('Setting isGenerating to false after file processing');
      setIsGenerating(false);
      addLiveLog(`[${new Date().toLocaleTimeString()}] AI code generation completed`);
    }, 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'building':
      case 'deploying':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(githubRepoUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  View Repo
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={isSyncing || files.length === 0}
                  className="flex items-center gap-2"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </>
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

            <Badge 
              variant="outline" 
              className={`${
                autoSyncEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <Activity className="h-3 w-3 mr-1" />
              Auto-sync {autoSyncEnabled ? 'ON' : 'OFF'}
            </Badge>

            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              <Activity className="h-3 w-3 mr-1" />
              {liveLogs.length} Live Logs
            </Badge>
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

        {/* Deployment Status Bar */}
        {deploymentStatus.status !== 'idle' && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(deploymentStatus.status)}
                <span className="font-medium capitalize">{deploymentStatus.status}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {deploymentStatus.progress}%
              </span>
            </div>
            <Progress value={deploymentStatus.progress} className="mb-2" />
            {deploymentStatus.lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(deploymentStatus.lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
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
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Live Logs
                {liveLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">
                    {liveLogs.length}
                  </Badge>
                )}
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
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Project Files</h3>
                    {isSyncing && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Syncing...
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        className="rounded"
                      />
                      Auto-sync to GitHub
                    </label>
                  </div>
                </div>
                
                <CloudRunnerFileTree
                  files={files}
                  logs={logs}
                  isGenerating={isGenerating}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="runner" className="h-full m-0">
              <div className="h-full p-4">
                <PythonRunner onLogsUpdate={handlePythonLogsUpdate} />
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="h-full m-0">
              <div className="h-full p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-green-600" />
                      <span>Live System Logs</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {liveLogs.length} entries
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLiveLogs([])}
                        className="ml-auto"
                      >
                        Clear Logs
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full">
                    <ScrollArea className="h-96 border rounded-lg p-4 bg-slate-900">
                      {liveLogs.length > 0 ? (
                        <div className="space-y-1">
                          {liveLogs.map((log, index) => (
                            <div key={index} className="text-green-400 font-mono text-sm">
                              {log}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 py-8">
                          <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No live logs available</p>
                          <p className="text-sm">System logs will appear here in real-time</p>
                        </div>
                      )}
                    </ScrollArea>

                    {/* Deployment Logs */}
                    {deploymentStatus.logs.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-blue-600" />
                          Deployment Logs
                        </h4>
                        <ScrollArea className="h-48 border rounded-lg p-4 bg-slate-900">
                          <div className="space-y-1">
                            {deploymentStatus.logs.map((log, index) => (
                              <div key={index} className="text-blue-400 font-mono text-sm">
                                {log}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
