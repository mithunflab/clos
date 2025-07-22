
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
        ${theme === 'light' ? 'playground-canvas' : 'canvas-background'} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
