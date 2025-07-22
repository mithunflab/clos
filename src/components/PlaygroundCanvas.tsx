
import React from 'react';

interface PlaygroundCanvasProps {
  children: React.ReactNode;
  className?: string;
}

const PlaygroundCanvas = ({ children, className = '' }: PlaygroundCanvasProps) => {
  return (
    <div className={`
      w-full h-full 
      bg-black
      border border-white/20
      rounded-xl 
      overflow-hidden
      shadow-2xl
      ${className}
    `}>
      {children}
    </div>
  );
};

export default PlaygroundCanvas;
