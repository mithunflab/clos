
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface PlaygroundCanvasProps {
  children: React.ReactNode;
  className?: string;
}

const PlaygroundCanvas = ({ children, className = '' }: PlaygroundCanvasProps) => {
  const { theme } = useTheme();

  return (
    <div 
      className={`
        ${theme === 'light' ? 'bg-background' : 'canvas-background'} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
