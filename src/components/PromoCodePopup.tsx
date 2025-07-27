
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePromoCode } from '@/hooks/usePromoCode';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromoCodePopup: React.FC<PromoCodePopupProps> = ({ isOpen, onClose }) => {
  const [promoCode, setPromoCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { applyPromoCode, loading: isApplyingPromo } = usePromoCode();

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    const result = await applyPromoCode(promoCode);

    if (result.success) {
      setShowSuccess(true);
      toast.success(
        `Promo code applied! You received ${result.credits_added} credits and ${result.workflows_added} workflow slots.`
      );
      
      setTimeout(() => {
        setShowSuccess(false);
        setPromoCode('');
        onClose();
      }, 3000);
    } else {
      toast.error(result.error || 'Failed to apply promo code');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Got a Promo Code?
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 text-green-800">
                <Sparkles className="h-6 w-6" />
                <span className="text-lg font-semibold">Success!</span>
              </div>
              <p className="text-center text-green-700 mt-2">
                Your promo code has been applied successfully!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>
                Enter your promo code to unlock special benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleApplyPromoCode}
                  disabled={isApplyingPromo || !promoCode.trim()}
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PromoCodePopup;
