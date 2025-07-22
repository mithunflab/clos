
import React, { useEffect } from 'react';

interface PlaygroundWrapperProps {
  children: React.ReactNode;
}

const PlaygroundWrapper = ({ children }: PlaygroundWrapperProps) => {
  useEffect(() => {
    // Force dark mode styles for playground
    document.body.classList.add('playground-dark-mode');
    
    return () => {
      // Clean up when leaving playground
      document.body.classList.remove('playground-dark-mode');
    };
  }, []);

  return (
    <div className="playground-dark-mode min-h-screen bg-black text-white">
      {children}
    </div>
  );
};

export default PlaygroundWrapper;
