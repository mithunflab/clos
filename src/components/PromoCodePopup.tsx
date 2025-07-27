import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Sparkles, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePromoCode } from '@/hooks/usePromoCode';
import QRCode from 'qrcode';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseType: 'credits' | 'workflows' | 'n8n_instance' | 'pro_membership';
  quantity: number;
}

const PromoCodePopup: React.FC<PromoCodePopupProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  purchaseType, 
  quantity 
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [rewardDetails, setRewardDetails] = useState({ credits: 0, workflows: 0 });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [planUpgraded, setPlanUpgraded] = useState<string | null>(null);
  const { applyPromoCode, loading: isApplyingPromo } = usePromoCode();

  // Generate QR code for pro membership
  useEffect(() => {
    if (purchaseType === 'pro_membership' && showSuccess && planUpgraded) {
      const qrData = `WorkflowCraft Pro Membership Activated - Welcome to Premium Features!`;
      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [purchaseType, showSuccess, planUpgraded]);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    const result = await applyPromoCode(promoCode);

    if (result.success) {
      setRewardDetails({
        credits: result.credits_added || 0,
        workflows: result.workflows_added || 0
      });
      setPlanUpgraded(result.plan_upgraded || null);
      setShowSuccess(true);
      
      if (result.plan_upgraded) {
        toast.success('Pro Membership Activated! Welcome to premium features.');
      } else {
        toast.success(
          `Promo code applied! You received ${result.credits_added || 0} credits and ${result.workflows_added || 0} workflow slots.`
        );
      }
      
      setTimeout(() => {
        setShowSuccess(false);
        setPromoCode('');
        onSuccess();
        onClose();
      }, planUpgraded ? 5000 : 2000);
    } else {
      toast.error(result.error || 'Failed to apply promo code');
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    setPromoCode('');
    setPlanUpgraded(null);
    setQrCodeDataUrl('');
    onClose();
  };

  const getPurchaseTypeDisplay = () => {
    switch (purchaseType) {
      case 'credits':
        return `${quantity} Credits`;
      case 'workflows':
        return `${quantity} Workflow Slots`;
      case 'n8n_instance':
        return 'N8N Instance';
      case 'pro_membership':
        return 'Pro Membership';
      default:
        return 'Item';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Enter Promo Code
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 text-green-800 mb-4">
                <CheckCircle className="h-8 w-8" />
                <span className="text-lg font-semibold">Success!</span>
              </div>
              
              <div className="space-y-2 text-center">
                {planUpgraded ? (
                  <div className="space-y-4">
                    <p className="text-green-700 font-medium">
                      Pro Membership Activated!
                    </p>
                    {qrCodeDataUrl && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Your activation QR code:</p>
                        <img 
                          src={qrCodeDataUrl} 
                          alt="Pro Membership QR Code" 
                          className="mx-auto border rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm text-green-600">
                      Welcome to WorkflowCraft Pro! You now have access to premium features including 20 workflows and 50 AI credits.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-green-700 font-medium">
                      Promo code applied successfully!
                    </p>
                    <div className="space-y-1 text-sm text-green-600">
                      {rewardDetails.credits > 0 && (
                        <p>+ {rewardDetails.credits} AI credits added</p>
                      )}
                      {rewardDetails.workflows > 0 && (
                        <p>+ {rewardDetails.workflows} workflow slots added</p>
                      )}
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      Processing your purchase of {getPurchaseTypeDisplay()}...
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-green-600 mt-4">
                <Sparkles className="h-5 w-5" />
                <span className="font-medium">Almost ready!</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>
                Enter your promo code to purchase {getPurchaseTypeDisplay()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="text-center font-mono"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyPromoCode();
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleApplyPromoCode}
                  disabled={isApplyingPromo || !promoCode.trim()}
                  className="flex-1"
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply Code'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
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