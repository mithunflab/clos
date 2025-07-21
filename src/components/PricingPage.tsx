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
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const {
    plan,
    credits,
    refetch
  } = useUserPlan();
  const plans = [{
    name: 'Free',
    type: 'free',
    price: '$0',
    period: 'forever',
    features: ['5 AI workflows', '10 initial credits', '5 credits daily', 'Basic support', 'Community access'],
    popular: false,
    description: 'Perfect for getting started'
  }, {
    name: 'Pro',
    type: 'pro',
    price: '$29',
    period: 'month',
    features: ['20 AI workflows', '50 initial credits', '5 credits daily', 'Priority support', 'Advanced features', 'API access'],
    popular: true,
    description: 'Best for professionals'
  }, {
    name: 'Custom',
    type: 'custom',
    price: 'Custom',
    period: 'pricing',
    features: ['Unlimited workflows', '100 initial credits', 'No daily limits', 'Dedicated support', 'Custom integrations', 'Enterprise features'],
    popular: false,
    description: 'Tailored for enterprises'
  }];
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
      const {
        data,
        error
      } = await supabase.rpc('apply_promo_code', {
        p_user_id: user.id,
        p_promo_code: promoCode.trim().toUpperCase()
      });
      if (error) throw error;
      const result = data as unknown as PromoCodeResponse;
      if (result.success) {
        setShowCongratulations(true);
        setTimeout(() => {
          setShowCongratulations(false);
          setShowPromoInput(false);
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
      setShowPromoInput(true);
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
  const CongratulationsAnimation = () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center animate-scale-in shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
            <Star className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-bounce" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-100 mb-2">Congratulations!</h2>
        <p className="text-gray-400 text-lg">Your promo code has been successfully applied!</p>
        <div className="mt-4">
          <div className="animate-bounce">🎉</div>
        </div>
      </div>
    </div>;
  return <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-gray-900 border-gray-700 shadow-2xl">
          <DialogHeader className="text-center pb-8">
            <DialogTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Choose Your Perfect Plan
            </DialogTitle>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mx-auto max-w-md border border-gray-700/50">
              <p className="text-lg font-semibold text-gray-200">
                Current Credits: <span className="text-blue-400">{credits?.current_credits || 0}</span>
              </p>
              <p className="text-sm text-gray-400">
                Current Plan: <span className="uppercase font-medium text-purple-400">{getCurrentPlanType()}</span>
              </p>
            </div>
          </DialogHeader>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {plans.map(planItem => <Card key={planItem.type} className={`relative transform transition-all duration-300 hover:scale-105 ${planItem.popular ? 'border-2 border-blue-500 shadow-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20' : 'border border-gray-700 shadow-lg bg-gray-800/50 hover:shadow-xl'}`}>
                {planItem.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 text-sm font-semibold">
                      ⭐ Most Popular
                    </Badge>
                  </div>}
                
                <CardHeader className="text-center pb-4 bg-black">
                  <CardTitle className="flex items-center justify-center text-2xl font-bold text-gray-100">
                    {planItem.name}
                    {getPlanBadge(planItem.type)}
                  </CardTitle>
                  <p className="text-gray-400 text-sm">{planItem.description}</p>
                  <div className="text-4xl font-extrabold text-gray-100 mt-4">
                    {planItem.price}
                    {planItem.type !== 'custom' && <span className="text-lg font-normal text-gray-400">
                        /{planItem.period}
                      </span>}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 bg-black">
                  <ul className="space-y-3 mb-8">
                    {planItem.features.map((feature, index) => <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>)}
                  </ul>
                  
                  <Button className={`w-full py-3 text-lg font-semibold transition-all duration-300 ${planItem.popular ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl" : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"}`} disabled={isCurrentPlan(planItem.type)} onClick={() => handleUpgradeClick(planItem.type)}>
                    {isCurrentPlan(planItem.type) ? '✓ Current Plan' : planItem.type === 'custom' ? '📞 Contact Us' : '⚡ Upgrade Now'}
                  </Button>
                </CardContent>
              </Card>)}
          </div>

          {/* Promo Code Input Section */}
          {showPromoInput && <Card className="mb-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-2 border-green-500/30 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Gift className="w-5 h-5" />
                  Enter Your Promo Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input placeholder="Enter your promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="flex-1 border-2 border-green-500/30 focus:border-green-400 bg-gray-800/50 text-gray-100 placeholder-gray-500" />
                  <Button onClick={handleApplyPromoCode} disabled={isApplyingPromo || !promoCode.trim()} className="bg-green-600 hover:bg-green-700 text-white px-6">
                    {isApplyingPromo ? 'Applying...' : 'Apply Code'}
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setShowPromoInput(false)} className="mt-3 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50">
                  Cancel
                </Button>
              </CardContent>
            </Card>}

          {/* QR Code Dialog */}
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogContent className="max-w-md bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-center text-xl font-bold text-gray-100">
                  <QrCode className="w-6 h-6 text-blue-400" />
                  Contact Us for Custom Plan
                </DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-6 p-4">
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 p-8 rounded-xl border border-gray-600">
                  <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                </div>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed">
                    Get in touch with our team for custom enterprise pricing and solutions tailored to your needs.
                  </p>
                  <div className="bg-blue-900/20 p-4 rounded-lg space-y-2 border border-blue-500/30">
                    <p className="font-semibold text-gray-200">Contact Information:</p>
                    <p className="text-blue-400 font-medium">📧 zenmithun@outlook.com</p>
                    <p className="text-gray-300">📞 +1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Congratulations Animation */}
      {showCongratulations && <CongratulationsAnimation />}
    </>;
};
export default PricingPage;