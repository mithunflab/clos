
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Workflow, Cloud, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchases } from '@/hooks/usePurchases';
import { useUserPlan } from '@/hooks/useUserPlan';
import PromoCodePopup from '@/components/PromoCodePopup';
import PurchaseSuccessPopup from '@/components/PurchaseSuccessPopup';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose }) => {
  const [creditQuantity, setCreditQuantity] = useState(10);
  const [workflowQuantity, setWorkflowQuantity] = useState(5);
  const [showPromoCodePopup, setShowPromoCodePopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPurchaseType, setSuccessPurchaseType] = useState<'credits' | 'workflows' | 'n8n_instance'>('credits');
  const [successQuantity, setSuccessQuantity] = useState(0);
  
  const { purchaseCredits, purchaseWorkflows, purchaseN8nInstance, loading } = usePurchases();
  const { plan } = useUserPlan();

  const handlePurchaseCredits = async () => {
    const success = await purchaseCredits(creditQuantity);
    if (success) {
      setSuccessPurchaseType('credits');
      setSuccessQuantity(creditQuantity);
      setShowSuccessPopup(true);
      onClose();
      setTimeout(() => {
        setShowPromoCodePopup(true);
      }, 3500);
    } else {
      toast.error('Failed to purchase credits');
    }
  };

  const handlePurchaseWorkflows = async () => {
    const success = await purchaseWorkflows(workflowQuantity);
    if (success) {
      setSuccessPurchaseType('workflows');
      setSuccessQuantity(workflowQuantity);
      setShowSuccessPopup(true);
      onClose();
      setTimeout(() => {
        setShowPromoCodePopup(true);
      }, 3500);
    } else {
      toast.error('Failed to purchase workflows');
    }
  };

  const handlePurchaseN8n = async () => {
    const success = await purchaseN8nInstance();
    if (success) {
      setSuccessPurchaseType('n8n_instance');
      setSuccessQuantity(1);
      setShowSuccessPopup(true);
      onClose();
      setTimeout(() => {
        setShowPromoCodePopup(true);
      }, 3500);
    } else {
      toast.error('Failed to purchase N8N instance');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Purchase Credits & Features
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
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

            <Separator />

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

            <Separator />

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

      <PurchaseSuccessPopup 
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        purchaseType={successPurchaseType}
        quantity={successQuantity}
      />

      <PromoCodePopup 
        isOpen={showPromoCodePopup}
        onClose={() => setShowPromoCodePopup(false)}
      />
    </>
  );
};

export default PurchaseModal;
