
import React from 'react';
import { motion } from 'framer-motion';
import { FileCode, CheckCircle } from 'lucide-react';

interface JsonWorkflowViewerProps {
  workflowJson: string;
  workflowName?: string;
}

const JsonWorkflowViewer: React.FC<JsonWorkflowViewerProps> = ({ 
  workflowJson, 
  workflowName = 'Generated Workflow' 
}) => {
  const formatJsonForDisplay = (jsonString: string): string[] => {
    try {
      // Parse and reformat with consistent indentation
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      return formatted.split('\n');
    } catch (error) {
      // If parsing fails, return raw lines
      return jsonString.split('\n');
    }
  };

  const jsonLines = formatJsonForDisplay(workflowJson);

  const getLineNumberWidth = (totalLines: number): string => {
    const digits = totalLines.toString().length;
    return `${Math.max(3, digits) * 0.6}rem`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col bg-black/20 backdrop-blur-sm rounded-lg border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <FileCode className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">workflow.json</span>
          <div className="flex items-center space-x-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
            <CheckCircle className="w-3 h-3" />
            <span>Generated</span>
          </div>
        </div>
        <div className="text-white/60 text-sm">
          {jsonLines.length} lines • {workflowName}
        </div>
      </div>

      {/* JSON Content with Line Numbers */}
      <div className="flex-1 overflow-auto">
        <div className="flex text-sm font-mono">
          {/* Line Numbers */}
          <div 
            className="bg-black/30 text-white/40 p-4 pr-2 select-none border-r border-white/10"
            style={{ minWidth: getLineNumberWidth(jsonLines.length) }}
          >
            {jsonLines.map((_, index) => (
              <div key={index + 1} className="leading-6 text-right">
                {index + 1}
              </div>
            ))}
          </div>

          {/* JSON Content */}
          <div className="flex-1 p-4 pl-4">
            <pre className="text-white/90 leading-6">
              {jsonLines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.01, duration: 0.2 }}
                  className="whitespace-pre"
                >
                  <code className="syntax-highlight">{line}</code>
                </motion.div>
              ))}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-white/10 bg-black/30">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>JSON • UTF-8 • LF</span>
          <span>{Math.round(workflowJson.length / 1024 * 100) / 100} KB</span>
        </div>
      </div>
    </motion.div>
  );
};

export default JsonWorkflowViewer;
