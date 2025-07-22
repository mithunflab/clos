
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface PlaygroundCanvasProps {
  children: React.ReactNode;
  className?: string;
}

const PlaygroundCanvas = ({ children, className = '' }: PlaygroundCanvasProps) => {
  const { theme } = useTheme();
  
  return (
    <div className={`
      w-full h-full 
      ${theme === 'light' ? 'bg-white' : 'bg-black'} 
      border border-border 
      rounded-xl 
      overflow-hidden
      ${className}
    `}>
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
