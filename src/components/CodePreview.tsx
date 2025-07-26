
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, FileJson, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CodePreviewProps {
  workflow?: any;
  generatedCode?: string;
  liveFiles?: Array<{ fileName: string; content: string; }>;
  jsonAnimation?: { 
    content: any; 
    isVisible: boolean; 
  };
  onRegenerateWorkflow?: () => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ 
  workflow, 
  generatedCode, 
  liveFiles = [],
  jsonAnimation,
  onRegenerateWorkflow
}) => {
  const [hasEmptyFiles, setHasEmptyFiles] = useState(false);

  useEffect(() => {
    // Check if we have empty or invalid files
    const isEmpty = liveFiles.length === 0 || liveFiles.every(file => 
      !file.content || 
      file.content.trim() === '' || 
      file.content.trim() === '{}' ||
      file.content.trim() === 'null'
    );
    setHasEmptyFiles(isEmpty);
  }, [liveFiles]);

  const formatJsonWithLines = (content: string | any): { number: number; content: string; }[] => {
    if (!content) return [];
    
    try {
      // If it's already a string (from file), validate it's proper JSON
      let jsonString: string;
      if (typeof content === 'string') {
        // Validate that it's proper JSON
        JSON.parse(content);
        jsonString = content;
      } else {
        jsonString = JSON.stringify(content, null, 2);
      }
      
      const lines = jsonString.split('\n');
      return lines.map((line, index) => ({
        number: index + 1,
        content: line
      }));
    } catch (error) {
      console.error('Invalid JSON content:', error);
      return [{
        number: 1,
        content: 'Invalid JSON content'
      }];
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const downloadJson = (data: any, filename: string) => {
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      // Validate JSON before download
      JSON.parse(jsonString);
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error('Failed to download: Invalid JSON');
    }
  };

  const handleRegenerateWorkflow = () => {
    if (onRegenerateWorkflow) {
      onRegenerateWorkflow();
      toast.info('Regenerating workflow...');
    } else {
      toast.error('No regeneration function available');
    }
  };

  // Show JSON animation during generation (but never raw JSON in chat)
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-muted-foreground">
                Creating workflow JSON file...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          <span>Generated Files</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
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
          
          {hasEmptyFiles && onRegenerateWorkflow && (
            <Button
              onClick={handleRegenerateWorkflow}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-96 rounded-md border">
          <div className="p-4">
            {liveFiles.length > 0 && !hasEmptyFiles ? (
              <div className="space-y-4">
                {liveFiles.map((file, index) => {
                  const lines = formatJsonWithLines(file.content);
                  const isValidJson = lines.length > 0 && lines[0].content !== 'Invalid JSON content';
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{file.fileName}</h4>
                          {!isValidJson && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(file.content)}
                            className="text-xs"
                            disabled={!isValidJson}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadJson(file.content, file.fileName)}
                            className="text-xs"
                            disabled={!isValidJson}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      
                      {isValidJson ? (
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                          {lines.map((line: any, lineIndex: number) => (
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
                      ) : (
                        <div className="text-center text-red-500 py-4">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Invalid JSON content</p>
                          {onRegenerateWorkflow && (
                            <Button
                              onClick={handleRegenerateWorkflow}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Regenerate Workflow
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {hasEmptyFiles ? (
                  <div className="space-y-3">
                    <p className="font-medium">No workflow data found</p>
                    <p className="text-sm">The generated files appear to be empty or invalid</p>
                    {onRegenerateWorkflow && (
                      <Button
                        onClick={handleRegenerateWorkflow}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate Workflow
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>No generated files available</p>
                    <p className="text-sm">Files will appear here when generated by the AI</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CodePreview;
