import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Eye, EyeOff, FileJson, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useParams } from 'react-router-dom';

interface CodePreviewProps {
  workflow?: any;
  generatedCode?: string;
  liveFiles?: Array<{ fileName: string; content: string; }>;
  jsonAnimation?: { 
    content: any; 
    isVisible: boolean; 
  };
}

export const CodePreview: React.FC<CodePreviewProps> = ({ 
  workflow, 
  generatedCode, 
  liveFiles = [],
  jsonAnimation 
}) => {
  const [activeTab, setActiveTab] = useState('workflow');
  const [showRawJson, setShowRawJson] = useState(false);
  const [workflowFileContent, setWorkflowFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { getWorkflowFileContent } = useWorkflowStorageV2();
  const { workflowId } = useParams();

  // Load actual workflow file content from storage
  const loadWorkflowFile = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const content = await getWorkflowFileContent(workflowId);
      setWorkflowFileContent(content);
    } catch (error) {
      console.error('Error loading workflow file:', error);
      toast.error('Failed to load workflow file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      loadWorkflowFile();
    }
  }, [workflowId]);

  const formatJsonWithLines = (content: string | any): { number: number; content: string; }[] => {
    if (!content) return [];
    
    // If it's already a string (from file), use it directly
    const jsonString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const lines = jsonString.split('\n');
    
    return lines.map((line, index) => ({
      number: index + 1,
      content: line
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const downloadJson = (data: any, filename: string) => {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (jsonAnimation?.isVisible && jsonAnimation?.content) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-500" />
            Generating Workflow...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {JSON.stringify(jsonAnimation.content, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          <span>Code Files</span>
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Workflow File
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat History
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Generated Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Stored File
                </Badge>
                {workflowFileContent && (
                  <Badge variant="secondary" className="text-xs">
                    {workflowFileContent.split('\n').length} lines
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={loadWorkflowFile}
                  disabled={loading}
                  className="text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-xs"
                >
                  {showRawJson ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showRawJson ? 'Hide Raw' : 'Show Raw'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(workflowFileContent || '')}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => downloadJson(workflowFileContent ? JSON.parse(workflowFileContent) : {}, `${workflowId || 'workflow'}.json`)}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-96 rounded-md border">
              {showRawJson ? (
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {workflowFileContent || 'No workflow file available'}
                </pre>
              ) : (
                <div className="p-4">
                  {workflowFileContent ? (
                    <div className="space-y-1">
                      {formatJsonWithLines(workflowFileContent).map((line: any, index: number) => (
                        <div key={index} className="flex">
                          <span className="text-muted-foreground text-xs w-12 flex-shrink-0 text-right mr-4 select-none">
                            {line.number}
                          </span>
                          <span className="text-sm font-mono text-foreground flex-1">
                            {line.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No workflow file available</p>
                      <p className="text-sm mt-2">Generate and save a workflow to see the file content</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Chat Log
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="h-96 rounded-md border">
              <div className="p-4">
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chat history will appear here</p>
                  <p className="text-sm mt-2">Conversation with AI assistant</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Generated Code
                </Badge>
                {liveFiles.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {liveFiles.length} files
                  </Badge>
                )}
              </div>
            </div>
            
            <ScrollArea className="h-96 rounded-md border">
              <div className="p-4">
                {liveFiles.length > 0 ? (
                  <div className="space-y-4">
                    {liveFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{file.fileName}</h4>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(file.content)}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {formatJsonWithLines(file.content).map((line: any, lineIndex: number) => (
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No generated files available</p>
                    <p className="text-sm mt-2">Files will appear here when generated by the AI</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CodePreview;