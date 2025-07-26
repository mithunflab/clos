
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Send, Play, Github, ExternalLink, Bot, FileCode, GitBranch, Link, Terminal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import SessionFileUpload from '@/components/SessionFileUpload';
import CloudFileTree from '@/components/CloudFileTree';
import PlaygroundCanvas from '@/components/PlaygroundCanvas';

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
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('draft');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      loadExistingProject();
    } else {
      setProjectName(`cloud-bot-${Date.now()}`);
      setChatMessages([{
        role: 'assistant',
        content: 'Hi! I can create Python automation scripts. Tell me what you need and I\'ll build it for you.',
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
        if (data.files.length > 0) {
          setSelectedFile(data.files[0].name);
          setSelectedFileContent(data.files[0].content);
        }
      }
    } catch (error) {
      console.error('Error loading code from GitHub:', error);
    }
  };

  const handleSessionFileUpload = (file: File) => {
    if (file && file.name.endsWith('.session')) {
      setSessionFile(file);
      toast({
        title: "Success",
        description: "Session file uploaded",
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
    toast({
      title: "Success",
      description: "Session file removed",
    });
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

      if (data.files && data.files.length > 0) {
        setProjectFiles(data.files);
        if (data.files.length > 0) {
          setSelectedFile(data.files[0].name);
          setSelectedFileContent(data.files[0].content);
        }
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

  const handleFileSelect = (fileName: string, content: string) => {
    setSelectedFile(fileName);
    setSelectedFileContent(content);
  };

  const handleFileCreate = (fileName: string, content: string) => {
    const newFile = { name: fileName, content, language: 'python' };
    setProjectFiles(prev => [...prev, newFile]);
    setSelectedFile(fileName);
    setSelectedFileContent(content);
    toast({
      title: "Success",
      description: `Created ${fileName}`,
    });
  };

  const handleFileUpdate = (fileName: string, content: string) => {
    setProjectFiles(prev => 
      prev.map(file => 
        file.name === fileName ? { ...file, content } : file
      )
    );
    setSelectedFileContent(content);
    toast({
      title: "Success",
      description: `Updated ${fileName}`,
    });
  };

  const handleFileDelete = (fileName: string) => {
    setProjectFiles(prev => prev.filter(file => file.name !== fileName));
    if (selectedFile === fileName) {
      const remaining = projectFiles.filter(file => file.name !== fileName);
      if (remaining.length > 0) {
        setSelectedFile(remaining[0].name);
        setSelectedFileContent(remaining[0].content);
      } else {
        setSelectedFile('');
        setSelectedFileContent('');
      }
    }
    toast({
      title: "Success",
      description: `Deleted ${fileName}`,
    });
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
        description: "GitHub repo created!",
      });

    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      toast({
        title: "Error",
        description: "Failed to create repo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!user || !githubRepoUrl) return;

    setIsDeploying(true);
    setRenderLogs(['🚀 Starting deployment...']);

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
      setRenderLogs(prev => [...prev, '✅ Deployment successful!', `🌐 Service URL: ${data.serviceUrl}`]);

      toast({
        title: "Success",
        description: "Deployed to Render!",
      });

    } catch (error) {
      console.error('Error deploying:', error);
      setDeploymentStatus('error');
      setRenderLogs(prev => [...prev, `❌ Deployment failed: ${error.message}`]);
      toast({
        title: "Error",
        description: "Deployment failed",
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
    <PlaygroundCanvas className="h-screen">
      <div className="h-full flex flex-col p-6 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Cloud Runner</h1>
              <div className="flex items-center gap-3">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 w-64"
                  placeholder="Project name"
                />
                <Badge className={getStatusColor(deploymentStatus)}>
                  {deploymentStatus}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {githubRepoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(githubRepoUrl, '_blank')}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Github className="w-4 h-4 mr-2" />
                View Repo
              </Button>
            )}
            <Button
              onClick={handleCreateGitHubRepo}
              disabled={isLoading || projectFiles.length === 0}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <Github className="w-4 h-4 mr-2" />
              Create Repo
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !githubRepoUrl}
              className="bg-blue-600 text-white hover:bg-blue-700"
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

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Chat Section */}
          <Card className="flex flex-col bg-white/5 border-white/20">
            <CardHeader className="border-b border-white/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <Bot className="w-5 h-5" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
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
                            ? 'bg-blue-600 text-white ml-4'
                            : 'bg-white/10 text-white mr-4'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 text-white p-3 rounded-lg mr-4">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span className="text-sm">AI thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-white/20 p-4">
                <div className="flex gap-2">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Tell me what to build..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Preview Section */}
          <Card className="flex flex-col bg-white/5 border-white/20">
            <CardHeader className="border-b border-white/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileCode className="w-5 h-5" />
                Code Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <div className="h-full flex">
                {/* File Tree */}
                <div className="w-64 border-r border-white/20">
                  <CloudFileTree
                    files={projectFiles}
                    onFileSelect={handleFileSelect}
                    onFileCreate={handleFileCreate}
                    onFileUpdate={handleFileUpdate}
                    onFileDelete={handleFileDelete}
                    selectedFile={selectedFile}
                  />
                </div>

                {/* File Content & Logs */}
                <div className="flex-1 flex flex-col">
                  <Tabs value={showLogs ? "logs" : "code"} className="flex-1 flex flex-col">
                    <TabsList className="mx-4 mt-4 bg-white/10">
                      <TabsTrigger 
                        value="code" 
                        onClick={() => setShowLogs(false)}
                        className="data-[state=active]:bg-white/20"
                      >
                        Code
                      </TabsTrigger>
                      <TabsTrigger 
                        value="logs" 
                        onClick={() => setShowLogs(true)}
                        className="data-[state=active]:bg-white/20"
                      >
                        <Terminal className="w-4 h-4 mr-2" />
                        Live Logs
                      </TabsTrigger>
                      <TabsTrigger value="session">
                        Session File
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 p-4">
                      <TabsContent value="code" className="h-full">
                        {selectedFile && selectedFileContent ? (
                          <ScrollArea className="h-full bg-white/5 rounded-lg p-4 border border-white/20">
                            <pre className="text-sm text-white">
                              <code>{selectedFileContent}</code>
                            </pre>
                          </ScrollArea>
                        ) : (
                          <div className="h-full flex items-center justify-center text-white/60">
                            <div className="text-center">
                              <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p>Select a file to view its content</p>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="logs" className="h-full">
                        <ScrollArea className="h-full bg-black rounded-lg p-4">
                          <div className="text-green-400 font-mono text-sm">
                            {renderLogs.length > 0 ? (
                              renderLogs.map((log, index) => (
                                <div key={index} className="mb-1">
                                  {log}
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500">No logs available</div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="session" className="h-full">
                        <div className="p-4">
                          <h3 className="text-lg font-semibold mb-4 text-white">Session File</h3>
                          <SessionFileUpload
                            onFileUpload={handleSessionFileUpload}
                            currentFile={sessionFile}
                            onRemoveFile={handleRemoveSessionFile}
                          />
                          <p className="text-sm text-white/60 mt-3">
                            Upload your Telegram session file for bot authentication.
                          </p>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlaygroundCanvas>
  );
};

export default CloudRunner;
