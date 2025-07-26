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
  Zap,
  Terminal,
  Monitor,
  Settings
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
  files_created?: string[];
  logs?: string[];
}

interface PythonRunnerProps {
  onLogsUpdate?: (logs: string[]) => void;
}

const PythonRunner: React.FC<PythonRunnerProps> = ({ onLogsUpdate }) => {
  const [code, setCode] = useState(`# Real-time Python Runner
# All major libraries are pre-installed!

import requests
import pandas as pd
import numpy as np
from datetime import datetime
import os

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

# Example: File operations
with open('output.txt', 'w') as f:
    f.write("Hello from Python Runner!")
    
print("\\nFile created: output.txt")
`);
  
  const [isRunning, setIsRunning] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<(ExecutionResult & { timestamp: Date; code: string })[]>([]);
  const [availableLibraries, setAvailableLibraries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('runner');
  const [runnerMode, setRunnerMode] = useState<'interactive' | 'file' | 'terminal'>('interactive');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAvailableLibraries();
    // Start live log monitoring
    const interval = setInterval(() => {
      // This would connect to real-time logs in production
      // For now, we'll update from execution history
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executionHistory, liveLogs]);

  useEffect(() => {
    if (onLogsUpdate && liveLogs.length > 0) {
      onLogsUpdate(liveLogs);
    }
  }, [liveLogs, onLogsUpdate]);

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
    const startTime = Date.now();
    
    try {
      console.log('Running Python code in real-time...');
      
      // Add to live logs
      const logEntry = `[${new Date().toLocaleTimeString()}] Starting execution...`;
      setLiveLogs(prev => [...prev, logEntry]);
      
      const { data, error } = await supabase.functions.invoke('python-runner', {
        body: { 
          action: 'execute',
          code: code,
          mode: runnerMode
        }
      });

      if (error) {
        throw error;
      }

      const result: ExecutionResult = data;
      const endTime = Date.now();
      
      // Update live logs with execution results
      const executionLog = `[${new Date().toLocaleTimeString()}] Execution completed in ${result.execution_time}ms`;
      setLiveLogs(prev => [...prev, executionLog]);
      
      if (result.files_created) {
        result.files_created.forEach(file => {
          const fileLog = `[${new Date().toLocaleTimeString()}] File created: ${file}`;
          setLiveLogs(prev => [...prev, fileLog]);
        });
      }

      setExecutionHistory(prev => [...prev, {
        ...result,
        timestamp: new Date(),
        code: code
      }]);

      if (result.success) {
        toast.success(`Code executed successfully in ${result.execution_time}ms`);
      } else {
        toast.error('Code execution failed');
      }

    } catch (error) {
      console.error('Error running Python code:', error);
      
      const errorLog = `[${new Date().toLocaleTimeString()}] Error: ${error.message}`;
      setLiveLogs(prev => [...prev, errorLog]);
      
      const errorResult: ExecutionResult = {
        success: false,
        output: `Error: ${error.message}`,
        error: error.message,
        execution_time: Date.now() - startTime
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
    setLiveLogs([]);
    toast.success('History and logs cleared');
  };

  const insertSampleCode = (sample: string) => {
    setCode(sample);
    setActiveTab('runner');
    toast.success('Sample code inserted');
  };

  const sampleCodes = {
    'Data Analysis': 'import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# Create sample data\ndata = pd.DataFrame({\n    \'product\': [\'A\', \'B\', \'C\', \'D\'],\n    \'sales\': [100, 150, 80, 200],\n    \'profit\': [20, 30, 15, 40]\n})\n\nprint("Sales Data Analysis")\nprint("=" * 20)\nprint(data)\nprint(f"Total Sales: ${data[\'sales\'].sum()}")\nprint(f"Average Profit: ${data[\'profit\'].mean():.2f}")\nprint(f"Best Product: {data.loc[data[\'sales\'].idxmax(), \'product\']}")\n\n# Save results to file\ndata.to_csv(\'sales_analysis.csv\', index=False)\nprint("Results saved to sales_analysis.csv")',

    'File Operations': 'import os\nimport json\nfrom datetime import datetime\n\n# Create directory structure\nos.makedirs(\'project/data\', exist_ok=True)\nos.makedirs(\'project/logs\', exist_ok=True)\n\n# Write configuration file\nconfig = {\n    "app_name": "Python Runner",\n    "version": "1.0.0",\n    "timestamp": datetime.now().isoformat()\n}\n\nwith open(\'project/config.json\', \'w\') as f:\n    json.dump(config, f, indent=2)\n\n# Create log file\nlog_entry = f"{datetime.now()}: Application started"\nwith open(\'project/logs/app.log\', \'w\') as f:\n    f.write(log_entry)\n\n# List created files\nfor root, dirs, files in os.walk(\'project\'):\n    for file in files:\n        filepath = os.path.join(root, file)\n        print(f"Created: {filepath}")',

    'Web Scraping': 'import requests\nfrom bs4 import BeautifulSoup\nimport json\n\nprint("🌐 Web Scraping Example")\nprint("=" * 25)\n\n# Example API call\ntry:\n    response = requests.get("https://jsonplaceholder.typicode.com/posts/1")\n    data = response.json()\n    \n    print(f"Status Code: {response.status_code}")\n    print(f"Post Title: {data[\'title\']}")\n    \n    # Save response to file\n    with open(\'api_response.json\', \'w\') as f:\n        json.dump(data, f, indent=2)\n    \n    print("Response saved to api_response.json")\n    \nexcept Exception as e:\n    print(f"Request failed: {e}")',

    'Machine Learning': 'import numpy as np\nimport pandas as pd\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import mean_squared_error\nimport pickle\n\nprint("🤖 Machine Learning Example")\nprint("=" * 30)\n\n# Generate sample data\nnp.random.seed(42)\nX = np.random.rand(100, 1) * 10\ny = 2 * X.ravel() + 1 + np.random.rand(100) * 2\n\n# Create DataFrame\ndf = pd.DataFrame({\'feature\': X.ravel(), \'target\': y})\n\n# Train model\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\n\n# Make predictions\ny_pred = model.predict(X_test)\nmse = mean_squared_error(y_test, y_pred)\n\nprint(f"Model R² Score: {model.score(X_test, y_test):.4f}")\nprint(f"Mean Squared Error: {mse:.4f}")\n\n# Save model\nwith open(\'model.pkl\', \'wb\') as f:\n    pickle.dump(model, f)\n\nprint("Model saved to model.pkl")'
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-green-600" />
              <span>Real-time Python Runner</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                Live Execution
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant={runnerMode === 'interactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRunnerMode('interactive')}
              >
                <Monitor className="h-3 w-3 mr-1" />
                Interactive
              </Button>
              <Button
                variant={runnerMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRunnerMode('file')}
              >
                <Code className="h-3 w-3 mr-1" />
                File Mode
              </Button>
              <Button
                variant={runnerMode === 'terminal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRunnerMode('terminal')}
              >
                <Terminal className="h-3 w-3 mr-1" />
                Terminal
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="runner">Python Runner</TabsTrigger>
              <TabsTrigger value="output">Live Output</TabsTrigger>
              <TabsTrigger value="libraries">Libraries</TabsTrigger>
              <TabsTrigger value="samples">Code Samples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="runner" className="flex-1 flex flex-col space-y-4">
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
                  disabled={executionHistory.length === 0 && liveLogs.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear All
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
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-medium">Live Execution Output</h3>
                  <Badge variant="outline">
                    {executionHistory.length} runs
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {liveLogs.length} logs
                  </Badge>
                </div>
                
                <ScrollArea className="h-96 border rounded-lg p-4 bg-slate-900 text-green-400" ref={outputRef}>
                  {executionHistory.length === 0 && liveLogs.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No code executed yet</p>
                      <p className="text-sm">Run Python code to see live output</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Live Logs */}
                      {liveLogs.map((log, index) => (
                        <div key={`log-${index}`} className="text-yellow-400 text-sm font-mono">
                          {log}
                        </div>
                      ))}
                      
                      {/* Execution Results */}
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
                          
                          {result.files_created && result.files_created.length > 0 && (
                            <div className="mt-2 text-xs text-blue-400">
                              Files created: {result.files_created.join(', ')}
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
                <h3 className="font-medium">Code Sample Templates</h3>
                
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
