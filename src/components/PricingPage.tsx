
import React, { useState } from 'react';
import { X, Check, Gift, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';

interface PricingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PromoCodeResponse {
  success: boolean;
  credits_added?: number;
  plan_type?: string;
  error?: string;
}

const PricingPage: React.FC<PricingPageProps> = ({ isOpen, onClose }) => {
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, credits, refetch } = useUserPlan();

  const plans = [
    {
      name: 'Free',
      type: 'free',
      price: '$0',
      period: 'forever',
      features: [
        '5 AI workflows',
        '10 initial credits',
        '5 credits daily',
        'Basic support',
        'Community access'
      ],
      popular: false
    },
    {
      name: 'Pro',
      type: 'pro',
      price: '$29',
      period: 'month',
      features: [
        '20 AI workflows',
        '50 initial credits',
        '5 credits daily',
        'Priority support',
        'Advanced features',
        'API access'
      ],
      popular: true
    },
    {
      name: 'Custom',
      type: 'custom',
      price: 'Custom',
      period: 'pricing',
      features: [
        'Unlimited workflows',
        '100 initial credits',
        'No daily limits',
        'Dedicated support',
        'Custom integrations',
        'Enterprise features'
      ],
      popular: false
    }
  ];

  const handleApplyPromoCode = async () => {
    if (!user || !promoCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a promo code",
        variant: "destructive"
      });
      return;
    }

    setIsApplyingPromo(true);
    try {
      const { data, error } = await supabase.rpc('apply_promo_code', {
        p_user_id: user.id,
        p_promo_code: promoCode.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as PromoCodeResponse;

      if (result.success) {
        toast({
          title: "Success!",
          description: `Promo code applied! You received ${result.credits_added} credits and upgraded to ${result.plan_type} plan.`,
        });
        setPromoCode('');
        refetch(); // Refresh user plan data
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast({
        title: "Error",
        description: "Failed to apply promo code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleShowQRCode = () => {
    setShowQRCode(true);
  };

  const getCurrentPlanType = () => {
    return plan?.plan_type || 'free';
  };

  const isCurrentPlan = (planType: string) => {
    return getCurrentPlanType() === planType;
  };

  const getPlanBadge = (planType: string) => {
    if (isCurrentPlan(planType)) {
      return <Badge variant="secondary" className="ml-2">Current</Badge>;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            Choose Your Plan
          </DialogTitle>
          <p className="text-center text-muted-foreground mb-6">
            Current Credits: {credits?.current_credits || 0} | Current Plan: {getCurrentPlanType().toUpperCase()}
          </p>
        </DialogHeader>

        {/* Promo Code Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Have a Promo Code?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code (e.g., CASELGRID50)"
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
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {plans.map((planItem) => (
            <Card 
              key={planItem.type} 
              className={`relative ${planItem.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {planItem.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {planItem.name}
                  {getPlanBadge(planItem.type)}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {planItem.price}
                  {planItem.type !== 'custom' && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{planItem.period}
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {planItem.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={planItem.popular ? "default" : "outline"}
                  disabled={isCurrentPlan(planItem.type)}
                  onClick={() => {
                    if (planItem.type === 'custom') {
                      handleShowQRCode();
                    } else {
                      toast({
                        title: "Coming Soon",
                        description: `${planItem.name} plan upgrade will be available soon!`,
                      });
                    }
                  }}
                >
                  {isCurrentPlan(planItem.type) ? 'Current Plan' : 
                   planItem.type === 'custom' ? 'Contact Us' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Contact Us for Custom Plan
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <div className="bg-gray-100 p-8 rounded-lg">
                <QrCode className="w-32 h-32 mx-auto text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR code or contact us directly for custom enterprise pricing
              </p>
              <div className="space-y-2">
                <p className="font-medium">Contact Information:</p>
                <p className="text-sm">Email: enterprise@caselgrid.com</p>
                <p className="text-sm">Phone: +1 (555) 123-4567</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default PricingPage;
