
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Upload, AlertTriangle } from 'lucide-react';
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
  currentFiles?: Array<{ name: string; content: string; language: string; }>;
}

const CloudRunnerAIAssistant: React.FC<CloudRunnerAIAssistantProps> = ({
  onFilesGenerated,
  onSessionFileRequest,
  sessionFile,
  currentFiles = []
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            
            {!sessionFile && (
              <div className="flex justify-center">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center max-w-md">
                  <AlertTriangle className="w-4 h-4 inline text-amber-600 mr-2" />
                  <span className="text-sm text-amber-700">
                    Upload a session file for Telegram bots
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onSessionFileRequest}
                    className="ml-2 p-0 h-auto text-amber-700"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload Session
                  </Button>
                </div>
              </div>
            )}
            
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
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Describe your automation project..."
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
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
