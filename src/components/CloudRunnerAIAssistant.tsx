
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Upload, AlertTriangle, Paperclip, X, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: Array<{ fileName: string; content: string; language: string; }>;
  modelUsed?: string;
}

interface CloudRunnerAIAssistantProps {
  onFilesGenerated?: (files: Array<{ fileName: string; content: string; language: string; }>) => void;
  onSessionFileRequest?: () => void;
  sessionFile?: File | null;
  currentFiles?: Array<{ fileName: string; content: string; language: string; }>;
  onSessionFileUpload?: (file: File) => void;
  onGeneratingStart?: () => void;
  onGeneratingEnd?: () => void;
}

const CloudRunnerAIAssistant: React.FC<CloudRunnerAIAssistantProps> = ({
  onFilesGenerated,
  onSessionFileRequest,
  sessionFile,
  currentFiles = [],
  onSessionFileUpload,
  onGeneratingStart,
  onGeneratingEnd
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Ready to build Python automation! Choose your preferred AI model and describe what you want to create.',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini');
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
        // Handle other file types - read content and add to file tree
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const language = getLanguageFromFileName(file.name);
          
          // Add file to file tree immediately
          onFilesGenerated?.([{
            fileName: file.name,
            content: content,
            language: language
          }]);
        };
        reader.readAsText(file);
        toast.success(`File ${file.name} added to file tree`);
      }
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'txt': return 'text';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'text';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeUserMessage = (message: string): string => {
    // Check if user mentions specific AI models in their request
    let modelInstruction = '';
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('use gemini') || lowerMessage.includes('with gemini')) {
      modelInstruction = '\n\nIMPORTANT: Use Gemini API (google-generativeai library) in the generated code.';
    } else if (lowerMessage.includes('use groq') || lowerMessage.includes('with groq')) {
      modelInstruction = '\n\nIMPORTANT: Use Groq API (groq-python library) in the generated code.';
    } else if (lowerMessage.includes('use openai') || lowerMessage.includes('with openai')) {
      modelInstruction = '\n\nIMPORTANT: Use OpenAI API (openai library) in the generated code.';
    } else {
      // Use the selected model from dropdown
      if (selectedModel === 'gemini') {
        modelInstruction = '\n\nIMPORTANT: Use Gemini API (google-generativeai library) in the generated code.';
      } else if (selectedModel === 'groq') {
        modelInstruction = '\n\nIMPORTANT: Use Groq API (groq-python library) in the generated code.';
      } else if (selectedModel === 'openai') {
        modelInstruction = '\n\nIMPORTANT: Use OpenAI API (openai library) in the generated code.';
      }
    }
    
    // Check if user mentions files or asks for analysis
    const fileNames = currentFiles.map(f => f.fileName);
    const mentionedFiles = fileNames.filter(fileName => 
      message.toLowerCase().includes(fileName.toLowerCase())
    );
    
    if (mentionedFiles.length > 0) {
      const fileContext = mentionedFiles.map(fileName => {
        const file = currentFiles.find(f => f.fileName === fileName);
        return `File: ${fileName}\nContent:\n${file?.content?.substring(0, 500)}...`;
      }).join('\n\n');
      
      return `${message}\n\nCurrent files context:\n${fileContext}${modelInstruction}`;
    }
    
    return `${message}${modelInstruction}`;
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) {
      console.log('Cannot send message:', { empty: !currentMessage.trim(), loading: isLoading });
      return;
    }

    const analyzedMessage = analyzeUserMessage(currentMessage);
    const newMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    console.log('Sending message with model:', selectedModel);
    
    // Update messages and clear input immediately
    setMessages(prev => [...prev, newMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setIsLoading(true);
    
    // Signal generation start
    console.log('Starting AI generation...');
    onGeneratingStart?.();

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-assistant', {
        body: {
          messages: [...messages, { ...newMessage, content: analyzedMessage }],
          sessionFileUploaded: !!sessionFile,
          currentFiles: currentFiles,
          preferredModel: selectedModel
        }
      });

      if (error) {
        console.error('Error calling cloud-runner-assistant:', error);
        throw error;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || 'I encountered an error processing your request.',
        timestamp: new Date(),
        files: data.files || [],
        modelUsed: data.modelUsed
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle file generation with improved state management
      if (data.files && data.files.length > 0) {
        console.log('Files generated successfully:', data.files.length);
        console.log('File details:', data.files.map(f => ({ name: f.fileName, lines: f.content.split('\n').length })));
        
        // Ensure unique filenames before passing to parent
        const uniqueFiles = data.files.filter((file, index, self) => 
          index === self.findIndex(f => f.fileName === file.fileName)
        );
        
        onFilesGenerated?.(uniqueFiles);
      }

      // Check if AI is requesting session file
      if (data.response && data.response.toLowerCase().includes('session') && 
          data.response.toLowerCase().includes('upload') && 
          !sessionFile) {
        onSessionFileRequest?.();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '❌ Failed to process request. Please check that API keys are configured properly.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message - check API configuration');
    } finally {
      setIsLoading(false);
      // Always signal generation end
      console.log('AI generation completed');
      onGeneratingEnd?.();
    }
  }, [currentMessage, isLoading, messages, sessionFile, currentFiles, selectedModel, onFilesGenerated, onSessionFileRequest, onGeneratingStart, onGeneratingEnd]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
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
                        {message.files.length} files generated {message.modelUsed ? `with ${message.modelUsed}` : ''}
                      </Badge>
                      {message.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="text-xs text-muted-foreground">
                          📄 {file.fileName} ({file.content.split('\n').length} lines)
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    {message.modelUsed && (
                      <Badge variant="secondary" className="text-xs">
                        {message.modelUsed}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg mr-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-sm">Creating files with {selectedModel.toUpperCase()}...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
      </div>
      
      <div className="border-t p-4 bg-card">
        {/* AI Model Selection */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">AI Model</span>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">🧠 Gemini (Google)</SelectItem>
              <SelectItem value="groq">⚡ Groq (Fast)</SelectItem>
              <SelectItem value="openai">🤖 OpenAI (GPT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessionFile && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm flex-1">Session: {sessionFile.name}</span>
            <Badge variant="secondary" className="text-xs">Ready</Badge>
          </div>
        )}

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
            placeholder={`Describe your automation project using ${selectedModel.toUpperCase()}...`}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".session,.py,.js,.ts,.json,.md,.txt,.html,.css"
            onChange={handleFileAttachment}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach file"
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
    </div>
  );
};

export default CloudRunnerAIAssistant;
