
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Download, 
  Copy, 
  FileCode, 
  Terminal,
  RefreshCw,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Trash2,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFile {
  fileName: string;
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
  const [activeFile, setActiveFile] = useState<string>(files[0]?.fileName || '');
  const [activeTab, setActiveTab] = useState<'files' | 'logs' | 'runner'>('files');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [runnerOutput, setRunnerOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pythonInput, setPythonInput] = useState('');

  // Update active file when files change
  React.useEffect(() => {
    if (files.length > 0 && (!activeFile || !files.find(f => f.fileName === activeFile))) {
      setActiveFile(files[0].fileName);
    }
  }, [files, activeFile]);

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

  const deleteFile = (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      onFileDelete?.(fileName);
      toast.success(`File ${fileName} deleted`);
      
      // Switch to another file if the deleted file was active
      if (fileName === activeFile) {
        const remainingFiles = files.filter(f => f.fileName !== fileName);
        if (remainingFiles.length > 0) {
          setActiveFile(remainingFiles[0].fileName);
        }
      }
    }
  };

  const handleEditStart = (fileName: string, content: string) => {
    setEditingFile(fileName);
    setEditContent(content);
  };

  const handleEditSave = () => {
    if (editingFile && onFileUpdate) {
      onFileUpdate(editingFile, editContent);
      toast.success('File updated successfully');
    }
    setEditingFile(null);
    setEditContent('');
  };

  const handleEditCancel = () => {
    setEditingFile(null);
    setEditContent('');
  };

  const runPythonCode = () => {
    if (!pythonInput.trim()) return;
    
    setIsRunning(true);
    setRunnerOutput(prev => [...prev, `>>> ${pythonInput}`]);
    
    // Simulate Python execution (in real implementation, you'd send to backend)
    setTimeout(() => {
      try {
        // Simple Python-like evaluation for demo
        if (pythonInput.includes('print(')) {
          const match = pythonInput.match(/print\((.*)\)/);
          if (match) {
            const output = match[1].replace(/['"]/g, '');
            setRunnerOutput(prev => [...prev, output]);
          }
        } else {
          setRunnerOutput(prev => [...prev, 'Code executed successfully']);
        }
      } catch (error) {
        setRunnerOutput(prev => [...prev, `Error: ${error}`]);
      } finally {
        setIsRunning(false);
        setPythonInput('');
      }
    }, 1000);
  };

  const clearRunner = () => {
    setRunnerOutput([]);
  };

  const formatCodeLines = (content: string): { number: number; content: string; isEmpty: boolean }[] => {
    if (!content) return [];
    const lines = content.split('\n');
    return lines.map((line, index) => ({
      number: index + 1,
      content: line,
      isEmpty: line.trim().length === 0
    }));
  };

  const getLanguageColor = (language: string): string => {
    switch (language.toLowerCase()) {
      case 'python': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'javascript': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'typescript': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'json': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'markdown': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'html': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'css': return 'bg-pink-500/10 text-pink-600 border-pink-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  const getFileIcon = (fileName: string | undefined) => {
    if (!fileName || typeof fileName !== 'string') {
      return '📄';
    }
    
    if (fileName.endsWith('.py')) return '🐍';
    if (fileName.endsWith('.js')) return '📜';
    if (fileName.endsWith('.ts')) return '📘';
    if (fileName.endsWith('.json')) return '📋';
    if (fileName.endsWith('.md')) return '📝';
    if (fileName.endsWith('.html')) return '🌐';
    if (fileName.endsWith('.css')) return '🎨';
    if (fileName.endsWith('.txt')) return '📄';
    if (fileName.endsWith('.session')) return '🔐';
    return '📄';
  };

  const activeFileContent = files.find(f => f.fileName === activeFile);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            <span>Project Files</span>
            {files.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {files.length} files
              </Badge>
            )}
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
              <Badge variant="outline" className="text-xs ml-1">
                {logs.length}
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'runner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('runner')}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Python Runner
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
                  <ScrollArea className="w-full">
                    <TabsList className="mx-4 mt-2 mb-2 inline-flex">
                      {files.map((file, index) => (
                        <TabsTrigger 
                          key={index} 
                          value={file.fileName} 
                          className="flex items-center gap-2 max-w-32"
                        >
                          <span>{getFileIcon(file.fileName)}</span>
                          <span className="truncate">{file.fileName}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollArea>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {files.map((file, index) => (
                    <TabsContent key={index} value={file.fileName} className="h-full m-0">
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getFileIcon(file.fileName)}</span>
                            <div>
                              <h3 className="font-medium">{file.fileName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-xs ${getLanguageColor(file.language)}`}>
                                  {file.language}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatCodeLines(file.content).length} lines
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {editingFile === file.fileName ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={handleEditSave}
                                  className="text-xs text-green-600 hover:text-green-700"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={handleEditCancel}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditStart(file.fileName, file.content)}
                                  className="text-xs hover:bg-accent"
                                >
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => copyToClipboard(file.content)}
                                  className="text-xs hover:bg-accent"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadFile(file.fileName, file.content)}
                                  className="text-xs hover:bg-accent"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteFile(file.fileName)}
                                  className="text-xs hover:bg-red-100 text-red-600"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <ScrollArea className="flex-1">
                          <div className="p-0">
                            {editingFile === file.fileName ? (
                              <div className="p-4">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full h-96 font-mono text-sm resize-none border-0 focus:ring-0"
                                  placeholder="Edit your code here..."
                                />
                              </div>
                            ) : (
                              <div className="bg-slate-50 dark:bg-slate-900">
                                {formatCodeLines(file.content).map((line, lineIndex) => (
                                  <div 
                                    key={lineIndex} 
                                    className={`flex hover:bg-muted/50 transition-colors ${
                                      line.isEmpty ? 'min-h-[1.5rem]' : ''
                                    }`}
                                  >
                                    <div className="bg-muted/30 text-muted-foreground text-xs w-12 flex-shrink-0 text-right py-2 px-3 select-none border-r border-border/50">
                                      {line.number}
                                    </div>
                                    <div className="text-sm font-mono text-foreground flex-1 py-2 px-4 whitespace-pre-wrap break-all">
                                      {line.content || '\u00A0'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
                          Chat with AI to create Python automation scripts or attach files
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'logs' ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-black text-green-400">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-medium">Live Deployment Logs</span>
              </div>
              <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            <ScrollArea className="flex-1 bg-black">
              <div className="p-4">
                {logs.length > 0 ? (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-green-400 font-mono text-sm flex">
                        <span className="text-gray-500 mr-3 select-none">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        <span className="flex-1">{log}</span>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="text-yellow-400 font-mono text-sm flex items-center">
                        <span className="text-gray-500 mr-3 select-none">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        <span>Generating files...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-green-400 py-8">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No deployment logs available yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Logs will appear here during deployment and file generation
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">Real-Time Python Runner</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearRunner}
                className="text-white hover:text-gray-300"
              >
                <Square className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            
            <ScrollArea className="flex-1 bg-black text-white">
              <div className="p-4 font-mono text-sm">
                <div className="text-blue-400 mb-4">Python 3.x Interactive Shell</div>
                {runnerOutput.map((output, index) => (
                  <div key={index} className="mb-1">
                    {output.startsWith('>>>') ? (
                      <span className="text-green-400">{output}</span>
                    ) : (
                      <span className="text-white">{output}</span>
                    )}
                  </div>
                ))}
                {isRunning && (
                  <div className="text-yellow-400 flex items-center">
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    Running...
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-gray-900 flex gap-2">
              <input
                type="text"
                value={pythonInput}
                onChange={(e) => setPythonInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && runPythonCode()}
                placeholder=">>> Enter Python code here"
                className="flex-1 bg-black text-white border border-gray-600 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-400"
                disabled={isRunning}
              />
              <Button 
                onClick={runPythonCode}
                disabled={isRunning || !pythonInput.trim()}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CloudRunnerFileTree;
