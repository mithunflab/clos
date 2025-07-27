
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Sparkles, CreditCard, Workflow, Cloud } from 'lucide-react';

interface PurchaseSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseType: 'credits' | 'workflows' | 'n8n_instance';
  quantity: number;
}

const PurchaseSuccessPopup: React.FC<PurchaseSuccessPopupProps> = ({ 
  isOpen, 
  onClose, 
  purchaseType, 
  quantity 
}) => {
  const getIcon = () => {
    switch (purchaseType) {
      case 'credits':
        return <CreditCard className="h-12 w-12 text-green-500" />;
      case 'workflows':
        return <Workflow className="h-12 w-12 text-blue-500" />;
      case 'n8n_instance':
        return <Cloud className="h-12 w-12 text-purple-500" />;
    }
  };

  const getMessage = () => {
    switch (purchaseType) {
      case 'credits':
        return `Successfully purchased ${quantity} credits!`;
      case 'workflows':
        return `Successfully purchased ${quantity} workflow slots!`;
      case 'n8n_instance':
        return 'Successfully purchased N8N instance!';
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-8 pb-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500 animate-scale-in" />
                <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-green-800">
                  Congratulations!
                </h3>
                <p className="text-green-700">
                  {getMessage()}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-green-600">
                {getIcon()}
                <span className="font-medium">Ready to use!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseSuccessPopup;
