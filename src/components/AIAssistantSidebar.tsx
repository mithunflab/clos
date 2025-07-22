import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Code, MessageSquare, Loader2, Settings, CheckCircle, FileCode, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlan } from '@/hooks/useUserPlan';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isGenerating?: boolean;
  workflowData?: any;
}

interface AIAssistantSidebarProps {
  onToggleCodePreview?: () => void;
  showCodePreview?: boolean;
  onWorkflowGenerated?: (workflow: any, code: any) => void;
  onGenerationStart?: () => void;
  onFileGenerated?: (fileName: string, content: string) => void;
  currentWorkflow?: any;
  deploymentMessage?: string | null;
  onDeploymentMessageShown?: () => void;
  initialChatHistory?: any[];
}

const AIAssistantSidebar: React.FC<AIAssistantSidebarProps> = ({ 
  onToggleCodePreview, 
  showCodePreview = false,
  onWorkflowGenerated,
  onGenerationStart,
  onFileGenerated,
  currentWorkflow,
  deploymentMessage,
  onDeploymentMessageShown,
  initialChatHistory = []
}) => {
  const { plan, credits, loading: planLoading, deductCredit, refetch: refetchPlan } = useUserPlan();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m CaselAI, your automation architect! 🚀\n\n**What I can help you with:**\n\n🔧 **Create Workflows** - Describe your automation needs and I\'ll generate complete n8n workflows\n💬 **Natural Conversation** - Ask questions, discuss automation strategies, get expert advice\n🔍 **Analyze & Optimize** - Review existing workflows and suggest improvements\n🎯 **Problem Solving** - Help troubleshoot automation challenges\n\n**How it works:**\n- I generate workflow JSON files that automatically save to your account\n- Chat stays clean with explanations and guidance\n- Files are created with animated writing effects\n\nWhat would you like to automate today?',
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWritingFile, setIsWritingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load initial chat history if provided
  useEffect(() => {
    if (initialChatHistory && initialChatHistory.length > 0) {
      console.log('📝 Loading initial chat history:', initialChatHistory.length, 'messages');
      
      const historyMessages: Message[] = initialChatHistory.map((msg, index) => ({
        id: `history-${index}`,
        content: msg.content || msg.message || '',
        role: msg.role || 'user',
        timestamp: new Date(msg.timestamp || Date.now()),
      }));
      
      setMessages(prev => [...prev, ...historyMessages]);
    }
  }, [initialChatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (deploymentMessage && onDeploymentMessageShown) {
      const deploymentMsg: Message = {
        id: Date.now().toString(),
        content: deploymentMessage,
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, deploymentMsg]);
      onDeploymentMessageShown();
    }
  }, [deploymentMessage, onDeploymentMessageShown]);

  const animateFileWriting = async (fileName: string, content: string, assistantMessageId: string) => {
    if (!onFileGenerated) return;
    
    console.log('🎬 Starting animated file writing for:', fileName);
    setIsWritingFile(true);
    
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, content: msg.content + `\n\n📄 **Creating ${fileName}**\n🔄 **Initializing file structure...**` }
        : msg
    ));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lines = content.split('\n');
    let currentContent = '';
    
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, content: msg.content.replace('🔄 **Initializing file structure...**', '✨ **Writing JSON structure line by line...**') }
        : msg
    ));
    
    // Animate file writing line by line with smooth progress
    for (let i = 0; i < lines.length; i++) {
      currentContent += lines[i] + (i < lines.length - 1 ? '\n' : '');
      
      // Update file content progressively
      onFileGenerated(fileName, currentContent);
      
      // Update progress every 3 lines for smoother animation
      if (i % 3 === 0 || i === lines.length - 1) {
        const progress = Math.round(((i + 1) / lines.length) * 100);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: msg.content.replace(/✨ \*\*Writing JSON structure.*?\*\*/, `✨ **Writing JSON structure... ${progress}% complete**`) }
            : msg
        ));
        
        // Smoother timing for line-by-line animation
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }
    
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, content: msg.content.replace(/✨ \*\*Writing JSON structure.*?\*\*/, '✅ **File created and saved to Supabase!**\n\n💾 **Auto-saved to your account - check the code preview**') }
        : msg
    ));
    
    setIsWritingFile(false);
    console.log('🎬 Animated file writing completed for:', fileName);
  };

  // Helper function to animate text character by character
  const animateTextResponse = async (text: string, messageId: string, currentContent: string) => {
    const words = text.split(' ');
    let animatedContent = currentContent;
    
    for (let i = 0; i < words.length; i++) {
      animatedContent += (i > 0 ? ' ' : '') + words[i];
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: animatedContent }
          : msg
      ));
      
      // Animate word by word for smooth effect
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return animatedContent;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    // Check if user has credits before processing
    if (!credits || credits.current_credits <= 0) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ **Insufficient Credits** - You need credits to chat with the AI. Please upgrade your plan or wait for daily credit refresh.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Deduct credit before processing the message
    console.log('💳 Deducting credit for AI chat...');
    const creditDeducted = await deductCredit();
    
    if (!creditDeducted) {
      console.error('❌ Failed to deduct credit');
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ **Credit Deduction Failed** - Unable to process your message. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    console.log('✅ Credit deducted successfully');
    // Refresh the plan to update the UI
    await refetchPlan();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: 'Thinking and generating response...',
      role: 'assistant',
      timestamp: new Date(),
      isGenerating: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsGenerating(true);

    if (onGenerationStart) {
      onGenerationStart();
    }

    try {
      console.log('🚀 Sending message to AI assistant:', inputMessage);

      const response = await fetch(`https://drpyxrajehatarshvjtq.supabase.co/functions/v1/ai-workflow-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          chatHistory: messages.filter(m => !m.isGenerating).map(m => ({
            role: m.role,
            content: m.content
          })),
          currentWorkflow: currentWorkflow
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch error:', response.status, errorText);
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';
      let workflowData: any = null;
      let isCapturingJson = false;
      let jsonBuffer = '';

      setMessages(prev => prev.filter(msg => !msg.isGenerating));

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const checkForJsonStart = (text: string) => {
        // Look for JSON patterns that indicate workflow generation
        return text.includes('```json') || 
               text.includes('"nodes":') || 
               text.includes('"connections":') ||
               text.includes('"name":') ||
               (text.includes('{') && (text.includes('"active"') || text.includes('"position"')));
      };

      const checkForJsonEnd = (text: string) => {
        // Look for ending patterns
        const openBraces = (jsonBuffer.match(/{/g) || []).length;
        const closeBraces = (jsonBuffer.match(/}/g) || []).length;
        return text.includes('```') || 
               (openBraces > 0 && openBraces === closeBraces && jsonBuffer.length > 100);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Handle any remaining JSON at stream end
          if (isCapturingJson && jsonBuffer.length > 50) {
            console.log('🎯 Stream ended with JSON buffer, processing...');
            try {
              let cleanJson = jsonBuffer
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
              
              const workflow = JSON.parse(cleanJson);
              if (workflow && (workflow.nodes || workflow.name)) {
                workflowData = workflow;
                const fileName = `${workflowData.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'workflow'}_${Date.now()}.json`;
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantContent + '\n\n✅ **Workflow file created and saved to Supabase!**\n\n💾 **Auto-saved to your account - check the code preview**', workflowData }
                    : msg
                ));
                
                if (onFileGenerated) {
                  onFileGenerated(fileName, JSON.stringify(workflowData, null, 2));
                }
                
                if (onWorkflowGenerated) {
                  onWorkflowGenerated(workflowData, {
                    workflowJson: JSON.stringify(workflowData, null, 2),
                    fileName: fileName
                  });
                }
              }
            } catch (e) {
              console.error('❌ Failed to parse JSON at stream end:', e);
            }
          }
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📥 Received stream data:', data.type, data.content?.slice ? data.content.slice(0, 50) + '...' : 'no content');
              
              if (data.type === 'text') {
                const textContent = data.content;
                
                // Check if we're starting to capture JSON
                if (!isCapturingJson && checkForJsonStart(textContent)) {
                  console.log('🎯 JSON START DETECTED - Redirecting to file creation');
                  isCapturingJson = true;
                  jsonBuffer = textContent;
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent + '\n\n📄 **Creating workflow.json**\n🔄 **Writing JSON structure...**' }
                      : msg
                  ));
                  
                  setIsWritingFile(true);
                  continue;
                }
                
                // If we're capturing JSON, add to buffer instead of chat
                if (isCapturingJson) {
                  jsonBuffer += textContent;
                  
                  // Update progress in chat
                  const progress = Math.min(Math.round((jsonBuffer.length / 1000) * 100), 99);
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent + `\n\n📄 **Creating workflow.json**\n✨ **Writing JSON structure... ${progress}% complete**` }
                      : msg
                  ));
                  
                  // Check if JSON is complete
                  if (checkForJsonEnd(textContent)) {
                    console.log('🎯 JSON END DETECTED - Processing workflow');
                    
                    try {
                      let cleanJson = jsonBuffer
                        .replace(/```json/g, '')
                        .replace(/```/g, '')
                        .trim();
                      
                      const workflow = JSON.parse(cleanJson);
                      
                      if (workflow && (workflow.nodes || workflow.name)) {
                        workflowData = workflow;
                        console.log('🎯 Successfully parsed workflow from stream');
                        
                        const fileName = `${workflowData.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'workflow'}_${Date.now()}.json`;
                        const workflowJson = JSON.stringify(workflowData, null, 2);
                        
                        // Start animated file writing instead of immediate creation
                        setMessages(prev => prev.map(msg => 
                          msg.id === assistantMessage.id 
                            ? { ...msg, content: assistantContent, workflowData }
                            : msg
                        ));
                        
                        await animateFileWriting(fileName, workflowJson, assistantMessage.id);
                        
                        if (onWorkflowGenerated) {
                          onWorkflowGenerated(workflowData, {
                            workflowJson: JSON.stringify(workflowData, null, 2),
                            fileName: fileName
                          });
                        }
                      }
                    } catch (e) {
                      console.error('❌ Failed to parse JSON from stream:', e);
                    }
                    
                    isCapturingJson = false;
                    jsonBuffer = '';
                    setIsWritingFile(false);
                  }
                  continue;
                }
                
                // Normal text content (not JSON) - animate text response
                assistantContent = await animateTextResponse(textContent, assistantMessage.id, assistantContent);
              } else if (data.type === 'workflow') {
                workflowData = data.content;
                console.log('🎯 Received workflow data:', {
                  name: workflowData?.name,
                  nodesCount: workflowData?.nodes?.length,
                  hasConnections: !!workflowData?.connections,
                  fullData: workflowData
                });
                
                if (workflowData) {
                  const workflowJson = JSON.stringify(workflowData, null, 2);
                  const fileName = `${workflowData.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'workflow'}_${Date.now()}.json`;
                  
                  console.log('📄 STARTING ANIMATED FILE WRITING:', fileName);
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent, workflowData }
                      : msg
                  ));
                  
                  // Start the animated file writing
                  await animateFileWriting(fileName, workflowJson, assistantMessage.id);
                  
                  // After animation completes, call onWorkflowGenerated
                  if (onWorkflowGenerated) {
                    console.log('🎯 Calling onWorkflowGenerated after animated file save');
                    onWorkflowGenerated(workflowData, {
                      workflowJson: workflowJson,
                      fileName: fileName
                    });
                  }
                } else {
                  console.error('❌ Missing workflowData');
                }
              } else if (data.type === 'error') {
                console.error('❌ Stream error:', data.content);
                assistantContent += `\n\n❌ Error: ${data.content}`;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }

      console.log('✅ Stream complete');

    } catch (error) {
      console.error('❌ Error in AI assistant:', error);
      
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isGenerating);
        return [...withoutLoading, {
          id: (Date.now() + 2).toString(),
          content: `❌ **Error:** ${error.message}\n\nPlease try again or contact support if the issue persists.`,
          role: 'assistant',
          timestamp: new Date(),
        }];
      });
    } finally {
      setIsGenerating(false);
      setIsWritingFile(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-80 bg-black/40 backdrop-blur-sm border-r border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-white" />
            <h2 className="text-white font-semibold text-lg">CaselAI</h2>
          </div>
          
          {/* Credits Display */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-white/10 rounded-lg px-2 py-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">
                {planLoading ? '...' : `${credits?.current_credits || 0}`}
              </span>
            </div>
            
            {onToggleCodePreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCodePreview}
                className={`text-white hover:bg-white/10 ${
                  showCodePreview ? 'bg-white/10' : ''
                }`}
                title="Toggle Code Preview"
              >
                {showCodePreview ? <MessageSquare className="w-4 h-4" /> : <Code className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Enhanced scrolling */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="h-full overflow-y-auto p-4 space-y-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-white/10 text-white ml-4'
                    : 'bg-black/30 text-white/90 mr-4'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {(message.isGenerating || isWritingFile) && (
                    <Loader2 className="w-4 h-4 animate-spin mt-1 flex-shrink-0 text-blue-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.workflowData && (
                      <div className="mt-3 p-3 bg-green-500/20 rounded border border-green-500/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileCode className="w-4 h-4 text-green-300" />
                          <div className="text-sm font-medium text-green-300">
                            Workflow Generated & Saved
                          </div>
                        </div>
                        <div className="text-xs text-green-300/80 space-y-1">
                          <div>📋 Name: {message.workflowData.name}</div>
                          <div>🔧 Nodes: {message.workflowData.nodes?.length || 0}</div>
                          <div>💾 Status: Auto-saved to Supabase</div>
                          <div>🎯 Ready for canvas display</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Subtle scroll indicator dots */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1 opacity-30 hover:opacity-60 transition-opacity">
          <div className="w-1 h-1 bg-white rounded-full"></div>
          <div className="w-1 h-1 bg-white rounded-full"></div>
          <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your automation workflow..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            disabled={isGenerating || isWritingFile || !credits || credits.current_credits <= 0}
          />
          <Button
            onClick={sendMessage}
            size="sm"
            disabled={!inputMessage.trim() || isGenerating || isWritingFile || !credits || credits.current_credits <= 0}
            className="bg-white/10 hover:bg-white/20 text-white border-white/10"
          >
            {isGenerating || isWritingFile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-white/40 mt-2 text-center">
          {!credits || credits.current_credits <= 0 ? 'No credits remaining - upgrade or wait for daily refresh' :
            isWritingFile ? 'Creating workflow file...' : 
            currentWorkflow ? `Editing: ${currentWorkflow.name}` : 
            'Ready to create workflows'}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantSidebar;
