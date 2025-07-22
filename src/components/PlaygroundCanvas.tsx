
import React from 'react';

interface PlaygroundCanvasProps {
  children: React.ReactNode;
  className?: string;
}

const PlaygroundCanvas = ({ children, className = '' }: PlaygroundCanvasProps) => {
  return (
    <div className={`min-h-screen bg-white ${className}`}>
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
