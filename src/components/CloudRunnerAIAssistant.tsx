
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Upload, AlertTriangle, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: Array<{ fileName: string; content: string; language: string; }>;
}

interface CloudRunnerAIAssistantProps {
  onFilesGenerated?: (files: Array<{ fileName: string; content: string; language: string; }>) => void;
  onSessionFileRequest?: () => void;
  sessionFile?: File | null;
  currentFiles?: Array<{ fileName: string; content: string; language: string; }>;
  onSessionFileUpload?: (file: File) => void;
}

const CloudRunnerAIAssistant: React.FC<CloudRunnerAIAssistantProps> = ({
  onFilesGenerated,
  onSessionFileRequest,
  sessionFile,
  currentFiles = [],
  onSessionFileUpload
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Ready to build Python automation! Describe what you want to create and I\'ll generate the code.',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.session')) {
        setAttachedFile(file);
        onSessionFileUpload?.(file);
        toast.success('Session file attached successfully');
      } else {
        toast.error('Please attach a valid .session file');
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-assistant', {
        body: {
          messages: [...messages, newMessage],
          sessionFileUploaded: !!sessionFile,
          currentFiles: currentFiles
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        files: data.files
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle file generation
      if (data.files && data.files.length > 0) {
        onFilesGenerated?.(data.files);
      }

      // Check if AI is requesting session file
      if (data.response.toLowerCase().includes('session') && 
          data.response.toLowerCase().includes('upload') && 
          !sessionFile) {
        onSessionFileRequest?.();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '❌ Failed to process request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, messages, sessionFile, currentFiles, onFilesGenerated, onSessionFileRequest]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span>AI Assistant</span>
          {sessionFile && (
            <Badge variant="secondary" className="text-xs">
              Session Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
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
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <Badge variant="outline" className="text-xs">
                        {message.files.length} files generated
                      </Badge>
                      {message.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="text-xs text-muted-foreground">
                          📄 {file.fileName}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs opacity-70 mt-2">
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
                    <span className="text-sm">Creating files...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          {attachedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
              <Paperclip className="w-4 h-4" />
              <span className="text-sm flex-1">{attachedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveAttachment}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Describe your automation project..."
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".session"
              onChange={handleFileAttachment}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach session file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !currentMessage.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CloudRunnerAIAssistant;
