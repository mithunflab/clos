
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
        ${theme === 'light' ? 'bg-white' : 'canvas-background'} 
        ${className}
      `}
      style={theme === 'light' ? {
        backgroundColor: 'white',
        backgroundImage: 'none'
      } : undefined}
    >
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
