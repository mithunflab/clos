
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Gift, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useUserPlan } from '@/hooks/useUserPlan';

interface PricingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PromoCodeResponse {
  success: boolean;
  error?: string;
  credits_added?: number;
  workflows_added?: number;
  plan_type?: string;
}

const PricingPage: React.FC<PricingPageProps> = ({ isOpen, onClose }) => {
  const [promoCode, setPromoCode] = useState('');
  const [showCongratulations, setShowCongratulations] = useState(false);
  const { toast } = useToast();
  const { applyPromoCode, loading: isApplyingPromo } = usePromoCode();
  const { plan } = useUserPlan();

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a promo code",
        variant: "destructive"
      });
      return;
    }

    const result = await applyPromoCode(promoCode.trim());

    if (result.success) {
      setShowCongratulations(true);
      setTimeout(() => {
        setShowCongratulations(false);
        setPromoCode('');
      }, 3000);

      toast({
        title: "Success!",
        description: `Promo code applied! You received ${result.credits_added} credits and ${result.workflows_added} workflow slots.`
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "5 workflows",
        "10 AI credits",
        "Basic support",
        "Community access"
      ],
      highlighted: false,
      buttonText: "Current Plan",
      disabled: plan?.plan_type === 'free'
    },
    {
      name: "Pro",
      price: "$19",
      period: "month",
      description: "For power users and small teams",
      features: [
        "20 workflows",
        "50 AI credits",
        "1 Cloud N8N instance",
        "Priority support",
        "Advanced features"
      ],
      highlighted: true,
      buttonText: "Upgrade to Pro",
      disabled: plan?.plan_type === 'pro'
    },
    {
      name: "Custom",
      price: "Custom",
      period: "pricing",
      description: "For enterprises and large teams",
      features: [
        "Unlimited workflows",
        "Unlimited AI credits",
        "Multiple N8N instances",
        "24/7 support",
        "Custom integrations"
      ],
      highlighted: false,
      buttonText: "Contact Sales",
      disabled: plan?.plan_type === 'custom'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-bold">
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>

        {/* Promo Code Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Have a Promo Code?
            </CardTitle>
            <CardDescription>
              Enter your promo code to unlock special benefits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code (e.g., CASELCLOUD)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || !promoCode.trim()}
                className="whitespace-nowrap"
              >
                {isApplyingPromo ? 'Applying...' : 'Apply Code'}
              </Button>
            </div>
            {showCongratulations && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Congratulations!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Your promo code has been applied successfully!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.highlighted
                  ? 'border-2 border-primary shadow-lg scale-105'
                  : 'border border-border'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                  {plan.name === 'Pro' && <Crown className="h-6 w-6" />}
                  {plan.name}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  {plan.period !== 'pricing' && (
                    <span className="text-sm text-muted-foreground font-normal">
                      /{plan.period}
                    </span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${plan.highlighted ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  disabled={plan.disabled}
                >
                  {plan.disabled ? 'Current Plan' : plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <Card>
          <CardHeader>
            <CardTitle>All Plans Include</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Secure cloud hosting</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Regular backups</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">SSL encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">99.9% uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">API access</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Mobile responsive</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default PricingPage;
