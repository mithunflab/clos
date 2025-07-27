
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { useUserPlan } from '@/hooks/useUserPlan';

interface PricingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ isOpen, onClose }) => {
  const { plan } = useUserPlan();

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

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {plans.map((planItem) => (
            <Card
              key={planItem.name}
              className={`relative ${
                planItem.highlighted
                  ? 'border-2 border-primary shadow-lg scale-105'
                  : 'border border-border'
              }`}
            >
              {planItem.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                  {planItem.name === 'Pro' && <Crown className="h-6 w-6" />}
                  {planItem.name}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {planItem.price}
                  {planItem.period !== 'pricing' && (
                    <span className="text-sm text-muted-foreground font-normal">
                      /{planItem.period}
                    </span>
                  )}
                </div>
                <CardDescription>{planItem.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {planItem.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${planItem.highlighted ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={planItem.highlighted ? 'default' : 'outline'}
                  disabled={planItem.disabled}
                >
                  {planItem.disabled ? 'Current Plan' : planItem.buttonText}
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
