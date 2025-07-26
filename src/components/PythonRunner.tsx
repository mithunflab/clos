
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RotateCcw, 
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Code,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  execution_time: number;
  libraries_used?: string;
  variables?: string[];
  has_functions?: boolean;
  has_classes?: boolean;
  has_loops?: boolean;
}

const PythonRunner: React.FC = () => {
  const [code, setCode] = useState(`# Welcome to Real-time Python Runner
# All major libraries are pre-installed!

import requests
import pandas as pd
import numpy as np
from datetime import datetime

print("🐍 Python Runner is ready!")
print(f"Current time: {datetime.now()}")

# Example: Create a simple data analysis
data = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'city': ['NYC', 'LA', 'Chicago']
})

print("\\nSample DataFrame:")
print(data)

# Example: NumPy operations
numbers = np.array([1, 2, 3, 4, 5])
print(f"\\nSum of numbers: {np.sum(numbers)}")
print(f"Mean: {np.mean(numbers)}")
`);
  
  const [isRunning, setIsRunning] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<(ExecutionResult & { timestamp: Date; code: string })[]>([]);
  const [availableLibraries, setAvailableLibraries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAvailableLibraries();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executionHistory]);

  const loadAvailableLibraries = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('python-runner', {
        body: { action: 'get-libraries' }
      });

      if (error) throw error;
      if (data?.libraries) {
        setAvailableLibraries(data.libraries);
      }
    } catch (error) {
      console.error('Error loading libraries:', error);
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter some Python code to run');
      return;
    }

    setIsRunning(true);
    try {
      console.log('Running Python code...');
      
      const { data, error } = await supabase.functions.invoke('python-runner', {
        body: { 
          action: 'execute',
          code: code 
        }
      });

      if (error) {
        throw error;
      }

      const result: ExecutionResult = data;
      
      setExecutionHistory(prev => [...prev, {
        ...result,
        timestamp: new Date(),
        code: code
      }]);

      if (result.success) {
        toast.success(`Code executed in ${result.execution_time}ms`);
      } else {
        toast.error('Code execution failed');
      }

    } catch (error) {
      console.error('Error running Python code:', error);
      
      const errorResult: ExecutionResult = {
        success: false,
        output: `Error: ${error.message}`,
        error: error.message,
        execution_time: 0
      };
      
      setExecutionHistory(prev => [...prev, {
        ...errorResult,
        timestamp: new Date(),
        code: code
      }]);
      
      toast.error('Failed to execute Python code');
    } finally {
      setIsRunning(false);
    }
  };

  const clearHistory = () => {
    setExecutionHistory([]);
    toast.success('Execution history cleared');
  };

  const insertSampleCode = (sample: string) => {
    setCode(sample);
    setActiveTab('editor');
    toast.success('Sample code inserted');
  };

  const sampleCodes = {
    'Data Analysis': `import pandas as pd
import numpy as np

# Create sample data
data = pd.DataFrame({
    'product': ['A', 'B', 'C', 'D'],
    'sales': [100, 150, 80, 200],
    'profit': [20, 30, 15, 40]
})

print("Sales Data Analysis")
print("=" * 20)
print(data)
print(f"\\nTotal Sales: ${data['sales'].sum()}")
print(f"Average Profit: ${data['profit'].mean():.2f}")
print(f"Best Performing Product: {data.loc[data['sales'].idxmax(), 'product']}")`,

    'Web Scraping': `import requests
from bs4 import BeautifulSoup

# Example: Get webpage title
url = "https://httpbin.org/html"
try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print("Web scraping simulation successful!")
    print("Note: This is a simulation - actual requests would work in a real environment")
except Exception as e:
    print(f"Request simulation: {e}")`,

    'Telegram Bot': `from telethon import TelegramClient
import asyncio

# Telegram bot setup (simulation)
api_id = "your_api_id"
api_hash = "your_api_hash"

print("🤖 Telegram Bot Setup")
print("=" * 25)
print("1. Get API credentials from https://my.telegram.org")
print("2. Install: pip install telethon")
print("3. Create session file")
print("\\nBot initialization simulated!")

# Example bot functionality
def handle_message(message):
    print(f"Received: {message}")
    return f"Bot response to: {message}"

print(handle_message("Hello bot!"))`,

    'AI Integration': `import openai
from datetime import datetime

# AI integration example
print("🤖 AI Integration Example")
print("=" * 30)

# Simulate API call
def generate_ai_response(prompt):
    # This simulates an AI API call
    responses = [
        f"AI Response to '{prompt}': This is a simulated AI response.",
        f"Generated at: {datetime.now()}",
        "Note: Add your actual API key for real integration"
    ]
    return "\\n".join(responses)

prompt = "What is machine learning?"
result = generate_ai_response(prompt)
print(result)

print("\\n📚 Available AI Libraries:")
print("- openai, anthropic, groq")
print("- transformers, datasets")
print("- tensorflow, pytorch")`
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-green-600" />
            <span>Real-time Python Runner</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Zap className="h-3 w-3 mr-1" />
              All Libraries Pre-installed
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="editor">Code Editor</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="libraries">Libraries</TabsTrigger>
              <TabsTrigger value="samples">Samples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor" className="flex-1 flex flex-col space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={runCode} 
                  disabled={isRunning || !code.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRunning ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Code
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearHistory}
                  disabled={executionHistory.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear History
                </Button>
              </div>
              
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your Python code here..."
                className="flex-1 font-mono text-sm resize-none"
                style={{ minHeight: '300px' }}
              />
            </TabsContent>
            
            <TabsContent value="output" className="flex-1">
              <div className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-medium">Execution History</h3>
                  <Badge variant="outline">
                    {executionHistory.length} runs
                  </Badge>
                </div>
                
                <ScrollArea className="h-96 border rounded-lg p-4 bg-slate-900 text-green-400" ref={outputRef}>
                  {executionHistory.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No code has been executed yet</p>
                      <p className="text-sm">Run some Python code to see output here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {executionHistory.map((result, index) => (
                        <div key={index} className="border-b border-slate-700 last:border-b-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-2 mb-2 text-sm text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{result.timestamp.toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>{formatExecutionTime(result.execution_time)}</span>
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {result.output}
                          </pre>
                          
                          {result.error && (
                            <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                              Error: {result.error}
                            </div>
                          )}
                          
                          {result.variables && result.variables.length > 0 && (
                            <div className="mt-2 text-xs text-blue-400">
                              Variables: {result.variables.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="libraries" className="flex-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <h3 className="font-medium">Pre-installed Libraries</h3>
                  <Badge variant="secondary">{availableLibraries.length} available</Badge>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-3 gap-2">
                    {availableLibraries.map((lib, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="justify-center p-2 hover:bg-accent cursor-default"
                      >
                        {lib}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="samples" className="flex-1">
              <div className="space-y-4">
                <h3 className="font-medium">Sample Code Templates</h3>
                
                <div className="grid gap-4">
                  {Object.entries(sampleCodes).map(([title, code]) => (
                    <Card key={title} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{title}</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => insertSampleCode(code)}
                          >
                            Use Template
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <pre className="text-xs bg-slate-50 p-2 rounded overflow-x-auto">
                          {code.substring(0, 150)}...
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PythonRunner;
