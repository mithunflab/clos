
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCode, Loader2 } from 'lucide-react';

interface JsonWritingAnimationProps {
  jsonContent: string;
  onComplete?: () => void;
  isActive: boolean;
}

export const JsonWritingAnimation: React.FC<JsonWritingAnimationProps> = ({
  jsonContent,
  onComplete,
  isActive
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentLine, setCurrentLine] = useState(1);
  const [isWriting, setIsWriting] = useState(false);

  useEffect(() => {
    if (!isActive || !jsonContent) return;

    setIsWriting(true);
    setDisplayedContent('');
    setCurrentLine(1);

    let index = 0;
    const totalLines = jsonContent.split('\n').length;

    const writeCharacter = () => {
      if (index < jsonContent.length) {
        const char = jsonContent[index];
        setDisplayedContent(prev => prev + char);
        
        if (char === '\n') {
          setCurrentLine(prev => prev + 1);
        }
        
        index++;
        setTimeout(writeCharacter, Math.random() * 20 + 10); // Realistic typing speed
      } else {
        setIsWriting(false);
        onComplete?.();
      }
    };

    writeCharacter();
  }, [jsonContent, isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-md">
      <div className="flex items-center space-x-2 mb-2">
        <FileCode className="w-4 h-4 text-blue-400" />
        <span className="text-white text-sm font-medium">Writing Workflow JSON</span>
        {isWriting && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
      </div>
      
      <div className="text-xs text-white/60 mb-2">
        Line {currentLine} of {jsonContent.split('\n').length}
      </div>
      
      <div className="w-full bg-white/10 rounded-full h-2 mb-2">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(displayedContent.length / jsonContent.length) * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      <div className="text-xs text-green-400">
        {Math.round((displayedContent.length / jsonContent.length) * 100)}% Complete
      </div>
    </div>
  );
};
