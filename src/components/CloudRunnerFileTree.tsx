
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Copy, 
  FileCode, 
  Terminal,
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

interface CloudRunnerFileTreeProps {
  files: ProjectFile[];
  onFileUpdate?: (fileName: string, content: string) => void;
  onFileCreate?: (fileName: string, content: string, language: string) => void;
  onFileDelete?: (fileName: string) => void;
  logs?: string[];
  isGenerating?: boolean;
}

const CloudRunnerFileTree: React.FC<CloudRunnerFileTreeProps> = ({
  files,
  onFileUpdate,
  onFileCreate,
  onFileDelete,
  logs = [],
  isGenerating = false
}) => {
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name || '');
  const [activeTab, setActiveTab] = useState<'files' | 'logs'>('files');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const downloadFile = (fileName: string, content: string) => {
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const formatCode = (content: string): { number: number; content: string; }[] => {
    if (!content) return [];
    const lines = content.split('\n');
    return lines.map((line, index) => ({
      number: index + 1,
      content: line
    }));
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.py')) return '🐍';
    if (fileName.endsWith('.txt')) return '📄';
    if (fileName.endsWith('.json')) return '📋';
    if (fileName.endsWith('.md')) return '📝';
    if (fileName.endsWith('.session')) return '🔐';
    return '📄';
  };

  const activeFileContent = files.find(f => f.name === activeFile);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            <span>Project Files</span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'files' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('files')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Files
            </Button>
            <Button
              variant={activeTab === 'logs' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('logs')}
              className="flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              Live Logs
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {activeTab === 'files' ? (
          <div className="h-full flex flex-col">
            {files.length > 0 ? (
              <Tabs value={activeFile} onValueChange={setActiveFile} className="h-full flex flex-col">
                <div className="border-b">
                  <TabsList className="mx-4 mt-4 mb-2">
                    {files.map((file, index) => (
                      <TabsTrigger key={index} value={file.name} className="flex items-center gap-2">
                        <span>{getFileIcon(file.name)}</span>
                        {file.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {files.map((file, index) => (
                    <TabsContent key={index} value={file.name} className="h-full m-0">
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {file.language}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {file.content.split('\n').length} lines
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(file.content)}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadFile(file.name, file.content)}
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        <ScrollArea className="flex-1 bg-muted/10">
                          <div className="p-4">
                            <div className="space-y-1">
                              {formatCode(file.content).map((line, lineIndex) => (
                                <div key={lineIndex} className="flex">
                                  <span className="text-muted-foreground text-xs w-12 flex-shrink-0 text-right mr-4 select-none">
                                    {line.number}
                                  </span>
                                  <span className="text-sm font-mono text-foreground flex-1">
                                    {line.content}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground">AI is generating files...</p>
                    </>
                  ) : (
                    <>
                      <FileCode className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <p className="font-medium">No files generated yet</p>
                        <p className="text-sm text-muted-foreground">
                          Chat with AI to create Python automation scripts
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-medium">Live Logs</span>
                <Badge variant="outline" className="text-xs">
                  {logs.length} entries
                </Badge>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            <ScrollArea className="flex-1 bg-black">
              <div className="p-4">
                {logs.length > 0 ? (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-green-400 font-mono text-sm">
                        <span className="text-gray-500 mr-2">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-green-400 py-8">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No logs available yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Logs will appear here during deployment
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CloudRunnerFileTree;
