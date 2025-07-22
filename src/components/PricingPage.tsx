
import React, { useState } from 'react';
import { X, Check, Gift, QrCode, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { GlowingEffect } from '@/components/ui/glowing-effect';

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

const PricingPage: React.FC<PricingPageProps> = ({
  isOpen,
  onClose
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, credits, refetch } = useUserPlan();

  const plans = [
    {
      name: 'Free',
      type: 'free',
      price: '$0',
      period: 'forever',
      features: ['5 AI workflows', '10 initial credits', '5 credits daily', 'Basic support', 'Community access'],
      popular: false,
      description: 'Perfect for getting started'
    },
    {
      name: 'Pro',
      type: 'pro',
      price: '$29',
      period: 'month',
      features: ['20 AI workflows', '50 initial credits', '5 credits daily', 'Priority support', 'Advanced features', 'API access'],
      popular: true,
      description: 'Best for professionals'
    },
    {
      name: 'Custom',
      type: 'custom',
      price: 'Custom',
      period: 'pricing',
      features: ['Unlimited workflows', '100 initial credits', 'No daily limits', 'Dedicated support', 'Custom integrations', 'Enterprise features'],
      popular: false,
      description: 'Tailored for enterprises'
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

      const result = data as unknown as PromoCodeResponse;

      if (result.success) {
        setShowCongratulations(true);
        setTimeout(() => {
          setShowCongratulations(false);
          setShowPromoPopup(false);
          setPromoCode('');
          refetch();
        }, 3000);

        toast({
          title: "Success!",
          description: `Promo code applied! You received ${result.credits_added} credits and upgraded to ${result.plan_type} plan.`
        });
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

  const handleUpgradeClick = (planType: string) => {
    if (planType === 'custom') {
      handleShowQRCode();
    } else if (planType === 'pro') {
      setShowPromoPopup(true);
    }
  };

  const getCurrentPlanType = () => {
    return plan?.plan_type || 'free';
  };

  const isCurrentPlan = (planType: string) => {
    return getCurrentPlanType() === planType;
  };

  const getPlanBadge = (planType: string) => {
    if (isCurrentPlan(planType)) {
      return <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">Current</Badge>;
    }
    return null;
  };

  // Congratulations Animation Component
  const CongratulationsAnimation = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-8 text-center animate-scale-in shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
            <Star className="w-8 h-8 text-primary/80 absolute -top-2 -right-2 animate-bounce" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-card-foreground mb-2">Congratulations!</h2>
        <p className="text-muted-foreground text-lg">Your promo code has been successfully applied!</p>
        <div className="mt-4">
          <div className="animate-bounce">🎉</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-background border-border/50 shadow-2xl rounded-3xl">
          <DialogHeader className="text-center pb-8">
            <DialogTitle className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mb-6">
              Choose Your Perfect Plan
            </DialogTitle>
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 mx-auto max-w-md border border-border/50">
              <p className="text-xl font-semibold text-card-foreground mb-2">
                Current Credits: <span className="text-primary">{credits?.current_credits || 0}</span>
              </p>
              <p className="text-lg text-muted-foreground">
                Current Plan: <span className="uppercase font-medium text-primary">{getCurrentPlanType()}</span>
              </p>
            </div>
          </DialogHeader>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {plans.map((planItem) => (
              <div key={planItem.type} className="relative min-h-[28rem]">
                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <Card 
                    className={`relative h-full transform transition-all duration-500 hover:scale-105 overflow-hidden rounded-xl border-[0.75px] shadow-xl bg-card/60 ${
                      planItem.popular 
                        ? 'border-primary/50 shadow-2xl animate-pulse' 
                        : 'border-border/50 hover:shadow-2xl'
                    }`}
                    style={{
                      background: planItem.popular 
                        ? 'linear-gradient(135deg, rgba(var(--primary), 0.1) 0%, rgba(var(--primary), 0.05) 100%)'
                        : 'rgba(var(--card), 0.6)'
                    }}
                  >
                    {planItem.popular && (
                      <>
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-pulse"></div>
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 text-sm font-bold rounded-full border-2 border-primary/50 shadow-lg">
                            ⭐ Most Popular
                          </Badge>
                        </div>
                      </>
                    )}
                    
                    <CardHeader className="text-center pb-6 relative z-10">
                      <CardTitle className="flex items-center justify-center text-3xl font-bold text-card-foreground mb-2">
                        {planItem.name}
                        {getPlanBadge(planItem.type)}
                      </CardTitle>
                      <p className="text-muted-foreground text-lg">{planItem.description}</p>
                      <div className="text-5xl font-extrabold text-card-foreground mt-6">
                        {planItem.price}
                        {planItem.type !== 'custom' && (
                          <span className="text-xl font-normal text-muted-foreground">
                            /{planItem.period}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 relative z-10">
                      <ul className="space-y-4 mb-8">
                        {planItem.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
                            <span className="text-muted-foreground text-lg">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button 
                        className={`w-full py-4 text-xl font-bold transition-all duration-300 rounded-xl ${
                          planItem.popular 
                            ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-2xl hover:shadow-primary/25" 
                            : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border-2 border-border/50 hover:border-border"
                        }`}
                        disabled={isCurrentPlan(planItem.type)}
                        onClick={() => handleUpgradeClick(planItem.type)}
                      >
                        {isCurrentPlan(planItem.type) 
                          ? '✓ Current Plan' 
                          : planItem.type === 'custom' 
                            ? '📞 Contact Us' 
                            : '⚡ Upgrade Now'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code Popup */}
          <Dialog open={showPromoPopup} onOpenChange={setShowPromoPopup}>
            <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border-gray-800/50 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-400 text-2xl font-bold">
                  <Gift className="w-6 h-6" />
                  Enter Your Promo Code
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 p-2">
                <div className="space-y-4">
                  <Input 
                    placeholder="Enter your promo code" 
                    value={promoCode} 
                    onChange={(e) => setPromoCode(e.target.value)} 
                    className="h-12 border-2 border-green-500/30 focus:border-green-400 bg-gray-800/50 text-gray-100 placeholder-gray-500 rounded-xl text-lg"
                  />
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleApplyPromoCode} 
                      disabled={isApplyingPromo || !promoCode.trim()} 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-lg"
                    >
                      {isApplyingPromo ? 'Applying...' : 'Apply Code'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPromoPopup(false)} 
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800/50 py-3 rounded-xl font-semibold text-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* QR Code Dialog */}
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border-gray-800/50 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-center text-2xl font-bold text-gray-100">
                  <QrCode className="w-7 h-7 text-blue-400" />
                  Contact Us for Custom Plan
                </DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-6 p-4">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700/50">
                  <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                </div>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed text-lg">
                    Get in touch with our team for custom enterprise pricing and solutions tailored to your needs.
                  </p>
                  <div className="bg-blue-900/20 p-6 rounded-xl space-y-3 border border-blue-500/30">
                    <p className="font-semibold text-gray-200 text-lg">Contact Information:</p>
                    <p className="text-blue-400 font-medium text-lg">📧 zenmithun@outlook.com</p>
                    <p className="text-gray-300 text-lg">📞 +1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Congratulations Animation */}
      {showCongratulations && <CongratulationsAnimation />}
    </>
  );
};

export default PricingPage;
