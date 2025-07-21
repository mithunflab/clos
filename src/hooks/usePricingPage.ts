
import { useState } from 'react';

export const usePricingPage = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openPricingPage = () => setIsOpen(true);
  const closePricingPage = () => setIsOpen(false);

  return {
    isOpen,
    openPricingPage,
    closePricingPage
  };
};
