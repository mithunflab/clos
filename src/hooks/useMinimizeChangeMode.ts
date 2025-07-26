
import { useState } from 'react';

export const useMinimizeChangeMode = () => {
  const [minimizeChangeMode, setMinimizeChangeMode] = useState(false);
  
  return {
    minimizeChangeMode,
    setMinimizeChangeMode,
    toggleMinimizeChangeMode: () => setMinimizeChangeMode(prev => !prev)
  };
};
