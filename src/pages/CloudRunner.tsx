
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Send, Play, Github, ExternalLink, Bot, FileCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('draft');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) {
      loadExistingProject();
    } else {
      // Initialize with sample project name
      setProjectName(`cloud-bot-${Date.now()}`);
      // Add initial system message
      setChatMessages([{
        role: 'assistant',
        content: 'Hello! I can help you create Python automation scripts, especially Telegram bots using Telethon. Upload a session.session file and tell me what you want to build!',
        timestamp: new Date()
      }]);
    }
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

        // Load code from GitHub if repo exists
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

  const handleSessionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.session')) {
      setSessionFile(file);
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

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-assistant', {
        body: {
          messages: [...chatMessages, newMessage],
          sessionFileUploaded: !!sessionFile,
          currentFiles: projectFiles
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // Update project files if AI generated code
      if (data.files && data.files.length > 0) {
        setProjectFiles(data.files);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGitHubRepo = async () => {
    if (!user || projectFiles.length === 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-github-repo',
          projectName: projectName,
          files: projectFiles,
          sessionFile: sessionFile
        }
      });

      if (error) {
        throw error;
      }

      setGithubRepoUrl(data.repoUrl);
      
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
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!user || !githubRepoUrl) return;

    setIsDeploying(true);
    setRenderLogs(['Starting deployment...']);

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'deploy-to-render',
          projectName: projectName,
          githubRepoUrl: githubRepoUrl,
          projectId: projectId
        }
      });

      if (error) {
        throw error;
      }

      setDeploymentStatus('deployed');
      setRenderLogs(prev => [...prev, 'Deployment successful!', `Service URL: ${data.serviceUrl}`]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <Card className="shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <Bot className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      Cloud Runner
                    </h1>
                    <div className="flex items-center gap-4">
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="max-w-xs"
                        placeholder="Project name"
                      />
                      <Badge className={getStatusColor(deploymentStatus)}>
                        {deploymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".session"
                    onChange={handleSessionFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {sessionFile ? 'Session Uploaded' : 'Upload Session'}
                  </Button>
                  <Button onClick={() => navigate('/workflows')} variant="outline">
                    Back to Workflows
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
            {/* Chat Section */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground ml-4'
                              : 'bg-muted mr-4'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg mr-4">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span>AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Describe the automation you want to build..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isLoading}
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Code Preview Section */}
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Code Preview
                  </CardTitle>
                  <div className="flex gap-2">
                    {githubRepoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(githubRepoUrl, '_blank')}
                      >
                        <Github className="w-4 h-4 mr-2" />
                        View Repo
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateGitHubRepo}
                      disabled={isLoading || projectFiles.length === 0}
                    >
                      <Github className="w-4 h-4 mr-2" />
                      Create Repo
                    </Button>
                    <Button
                      onClick={handleDeploy}
                      disabled={isDeploying || !githubRepoUrl}
                      className="bg-primary text-primary-foreground"
                    >
                      {isDeploying ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Deploy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {projectFiles.length > 0 ? (
                  <Tabs defaultValue={projectFiles[0]?.name} className="h-full flex flex-col">
                    <TabsList className="mx-4 mt-4">
                      {projectFiles.map((file, index) => (
                        <TabsTrigger key={index} value={file.name}>
                          {file.name}
                        </TabsTrigger>
                      ))}
                      {renderLogs.length > 0 && (
                        <TabsTrigger value="logs">
                          Logs
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <div className="flex-1 p-4">
                      {projectFiles.map((file, index) => (
                        <TabsContent key={index} value={file.name} className="h-full">
                          <ScrollArea className="h-full bg-muted/10 rounded-lg p-4">
                            <pre className="text-sm">
                              <code>{file.content}</code>
                            </pre>
                          </ScrollArea>
                        </TabsContent>
                      ))}
                      {renderLogs.length > 0 && (
                        <TabsContent value="logs" className="h-full">
                          <ScrollArea className="h-full bg-black rounded-lg p-4">
                            <div className="text-green-400 font-mono text-sm">
                              {renderLogs.map((log, index) => (
                                <div key={index} className="mb-1">
                                  {log}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      )}
                    </div>
                  </Tabs>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                      <FileCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No code generated yet</p>
                      <p className="text-sm text-muted-foreground">
                        Start chatting with the AI to generate Python automation scripts
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CloudRunner;
