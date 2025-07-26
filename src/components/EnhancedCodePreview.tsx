
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Download, 
  FileCode, 
  Monitor, 
  Code2, 
  Play,
  Terminal,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import PlaygroundCanvas from './PlaygroundCanvas';
import PlaygroundWrapper from './PlaygroundWrapper';

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
}

interface EnhancedCodePreviewProps {
  files: ProjectFile[];
  logs: string[];
  liveLogs: string[];
  isGenerating: boolean;
}

const EnhancedCodePreview: React.FC<EnhancedCodePreviewProps> = ({
  files,
  logs,
  liveLogs,
  isGenerating
}) => {
  const [previewMode, setPreviewMode] = useState<'playground' | 'standard'>('playground');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showLiveLogs, setShowLiveLogs] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const downloadFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${file.fileName}`);
  };

  const renderStandardView = () => (
    <Card className="h-full flex flex-col bg-background">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            Project Files
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {files.length} files
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={previewMode === 'playground'}
              onCheckedChange={(checked) => setPreviewMode(checked ? 'playground' : 'standard')}
            />
            <span className="text-sm text-muted-foreground">Playground Mode</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {files.length > 0 ? (
          <Tabs value={activeFileIndex.toString()} onValueChange={(value) => setActiveFileIndex(parseInt(value))}>
            <div className="border-b p-2">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(files.length, 4)}, 1fr)` }}>
                {files.slice(0, 4).map((file, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="text-xs">
                    {file.fileName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {files.map((file, index) => (
              <TabsContent key={index} value={index.toString()} className="m-0 h-full">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{file.fileName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {file.language || 'text'}
                      </Badge>
                    </div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-96 rounded-md border bg-muted/50">
                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                      {file.content}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <FileCode className="h-12 w-12 mx-auto opacity-50" />
              <p>No files generated yet</p>
              <p className="text-sm">Files will appear here when created by the AI</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPlaygroundView = () => (
    <PlaygroundWrapper>
      <PlaygroundCanvas className="h-full">
        <div className="h-full flex flex-col bg-black text-white">
          {/* Header */}
          <div className="border-b border-white/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Code2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Code Preview</h2>
                  <p className="text-sm text-white/60">
                    {files.length} files • Playground Mode
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiveLogs(!showLiveLogs)}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  {showLiveLogs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Switch
                  checked={previewMode === 'playground'}
                  onCheckedChange={(checked) => setPreviewMode(checked ? 'playground' : 'standard')}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Files Panel */}
            <div className="flex-1 border-r border-white/20">
              {files.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* File Tabs */}
                  <div className="border-b border-white/20 p-2">
                    <div className="flex gap-1 overflow-x-auto">
                      {files.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveFileIndex(index)}
                          className={`px-3 py-2 text-xs rounded-t-lg whitespace-nowrap transition-colors ${
                            activeFileIndex === index
                              ? 'bg-white/10 text-white border-b-2 border-white/40'
                              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                          }`}
                        >
                          {file.fileName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Content */}
                  <div className="flex-1 overflow-hidden">
                    {files[activeFileIndex] && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-3 border-b border-white/20">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-white/60" />
                            <span className="text-sm text-white/80">
                              {files[activeFileIndex].fileName}
                            </span>
                            <Badge variant="outline" className="text-xs bg-white/10 text-white/80 border-white/20">
                              {files[activeFileIndex].language || 'text'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(files[activeFileIndex].content)}
                              className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(files[activeFileIndex])}
                              className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <pre className="p-4 text-sm font-mono text-white/90 whitespace-pre-wrap break-words">
                            {files[activeFileIndex].content}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <FileCode className="h-12 w-12 mx-auto text-white/30" />
                    <div className="space-y-1">
                      <p className="text-white/60">No files generated yet</p>
                      <p className="text-sm text-white/40">Files will appear here when created by the AI</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Logs Panel */}
            {showLiveLogs && (
              <div className="w-80 flex flex-col">
                <div className="p-3 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-white/60" />
                    <span className="text-sm text-white/80">Live Logs</span>
                    <Badge variant="outline" className="text-xs bg-white/10 text-white/80 border-white/20">
                      {liveLogs.length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  {liveLogs.length > 0 ? (
                    <div className="space-y-1">
                      {liveLogs.slice(-50).map((log, index) => (
                        <div key={index} className={`text-xs font-mono ${
                          log.includes('[RENDER]') ? 'text-blue-400' :
                          log.includes('✅') ? 'text-green-400' :
                          log.includes('❌') ? 'text-red-400' :
                          log.includes('🔄') ? 'text-yellow-400' :
                          'text-white/70'
                        }`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-white/40 py-8">
                      <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No logs yet</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="border-t border-white/20 p-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center gap-4">
                <span>Files: {files.length}</span>
                <span>Logs: {liveLogs.length}</span>
                {isGenerating && (
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3 animate-spin" />
                    <span>Generating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                <span>Playground Mode</span>
              </div>
            </div>
          </div>
        </div>
      </PlaygroundCanvas>
    </PlaygroundWrapper>
  );

  return previewMode === 'playground' ? renderPlaygroundView() : renderStandardView();
};

export default EnhancedCodePreview;
