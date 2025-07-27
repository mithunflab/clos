
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Workflow, Cloud, Gift, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchases } from '@/hooks/usePurchases';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useUserPlan } from '@/hooks/useUserPlan';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose }) => {
  const [creditQuantity, setCreditQuantity] = useState(10);
  const [workflowQuantity, setWorkflowQuantity] = useState(5);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  
  const { purchaseCredits, purchaseWorkflows, purchaseN8nInstance, loading } = usePurchases();
  const { applyPromoCode } = usePromoCode();
  const { plan } = useUserPlan();

  const handlePurchaseCredits = async () => {
    const success = await purchaseCredits(creditQuantity);
    if (success) {
      toast.success(`Successfully purchased ${creditQuantity} credits!`);
      onClose();
    } else {
      toast.error('Failed to purchase credits');
    }
  };

  const handlePurchaseWorkflows = async () => {
    const success = await purchaseWorkflows(workflowQuantity);
    if (success) {
      toast.success(`Successfully purchased ${workflowQuantity} workflow slots!`);
      onClose();
    } else {
      toast.error('Failed to purchase workflows');
    }
  };

  const handlePurchaseN8n = async () => {
    const success = await purchaseN8nInstance();
    if (success) {
      toast.success('Successfully purchased N8N instance!');
      onClose();
    } else {
      toast.error('Failed to purchase N8N instance');
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);
    const result = await applyPromoCode(promoCode);
    setIsApplyingPromo(false);

    if (result.success) {
      toast.success(
        `Promo code applied! You received ${result.credits_added} credits and ${result.workflows_added} workflow slots.`
      );
      setPromoCode('');
    } else {
      toast.error(result.error || 'Failed to apply promo code');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Credits & Features
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Promo Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5" />
                Promo Code
              </CardTitle>
              <CardDescription>
                Enter promo code "CASELCLOUD" to get 10 free credits and 5 workflow slots!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  variant="outline"
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              <Badge variant="secondary" className="w-fit">
                Try: CASELCLOUD
              </Badge>
            </CardContent>
          </Card>

          <Separator />

          {/* Credits Purchase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Purchase Credits
              </CardTitle>
              <CardDescription>
                Buy AI credits to generate workflows - $1 for 10 credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="credits">Number of Credits</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditQuantity(Math.max(10, creditQuantity - 10))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-medium">{creditQuantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditQuantity(creditQuantity + 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="font-medium">${(creditQuantity * 0.1).toFixed(2)}</span>
              </div>
              <Button
                onClick={handlePurchaseCredits}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : `Purchase ${creditQuantity} Credits`}
              </Button>
            </CardContent>
          </Card>

          {/* Workflows Purchase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Workflow className="h-5 w-5" />
                Purchase Workflow Slots
              </CardTitle>
              <CardDescription>
                Increase your workflow limit - $1 for 5 workflow slots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="workflows">Number of Workflow Slots</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkflowQuantity(Math.max(5, workflowQuantity - 5))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-medium">{workflowQuantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkflowQuantity(workflowQuantity + 5)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="font-medium">${(workflowQuantity * 0.2).toFixed(2)}</span>
              </div>
              <Button
                onClick={handlePurchaseWorkflows}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : `Purchase ${workflowQuantity} Workflow Slots`}
              </Button>
            </CardContent>
          </Card>

          {/* N8N Instance Purchase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cloud className="h-5 w-5" />
                Cloud N8N Instance
              </CardTitle>
              <CardDescription>
                {plan?.plan_type === 'pro' || plan?.plan_type === 'custom' 
                  ? 'Pro users get 1 free N8N instance. Purchase additional instances for $20/month.'
                  : 'Get your own cloud N8N instance for $20/month'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="font-medium">$20/month</span>
              </div>
              <Button
                onClick={handlePurchaseN8n}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Purchase N8N Instance'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseModal;
