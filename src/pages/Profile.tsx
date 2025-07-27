
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAuth } from '@/hooks/useAuth';
import { usePricingPage } from '@/hooks/usePricingPage';
import PricingPage from '@/components/PricingPage';
import PurchaseModal from '@/components/PurchaseModal';
import { CreditCard, User, Settings, Crown, LogOut, Sparkles, ShoppingCart, Workflow } from 'lucide-react';

const Profile = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { plan, credits, loading: planLoading } = useUserPlan();
  const { signOut } = useAuth();
  const { isOpen, openPricingPage, closePricingPage } = usePricingPage();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'pro':
      case 'custom':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
      case 'custom':
        return <Crown className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (profileLoading || planLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded-lg w-1/4 animate-shimmer"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded-xl animate-shimmer"></div>
              <div className="h-64 bg-muted rounded-xl animate-shimmer"></div>
            </div>
            <div className="h-32 bg-muted rounded-xl animate-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <Card glowVariant="premium" enableGlowEffect={true} className="shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Your Profile
                </h1>
                <p className="text-muted-foreground text-lg">Manage your account and subscription</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card glowVariant="primary" className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                <div className="p-3 bg-muted rounded-xl border border-border">
                  <User className="w-6 h-6 text-foreground" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-2 border-border ring-2 ring-border/50">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {profile?.full_name || 'Anonymous User'}
                  </h3>
                  <p className="text-muted-foreground">{profile?.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ''}
                    placeholder="Enter your full name"
                    readOnly
                    className="bg-muted/50 border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    placeholder="Enter your email"
                    readOnly
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan & Credits */}
          <Card glowVariant="secondary" className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                <div className="p-3 bg-muted rounded-xl border border-border">
                  <CreditCard className="w-6 h-6 text-foreground" />
                </div>
                Plan & Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-6 space-y-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Current Plan</span>
                  <Badge className={`${getPlanColor(plan?.plan_type || 'free')} flex items-center gap-2 px-3 py-1 border text-sm font-medium`}>
                    {getPlanIcon(plan?.plan_type || 'free')}
                    {(plan?.plan_type || 'free').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Available Credits</span>
                  <Badge variant="outline" className="bg-muted border-border text-foreground px-3 py-1 text-sm font-medium">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {credits?.current_credits || 0} credits
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Workflow Limit</span>
                  <Badge variant="outline" className="bg-muted border-border text-foreground px-3 py-1 text-sm font-medium">
                    <Workflow className="w-4 h-4 mr-2" />
                    {plan?.workflow_limit === -1 ? 'Unlimited' : `${plan?.workflow_limit || 5} workflows`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total Credits Used</span>
                  <span className="text-muted-foreground font-medium">
                    {credits?.total_credits_used || 0} credits
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={openPricingPage}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Your Plan
                </Button>
                
                <Button 
                  onClick={() => setIsPurchaseModalOpen(true)}
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10 py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Credits & Features
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card glowVariant="accent" className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
              <div className="p-3 bg-muted rounded-xl border border-border">
                <Settings className="w-6 h-6 text-foreground" />
              </div>
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <h4 className="font-medium text-foreground mb-2">Account Created</h4>
                <p className="text-muted-foreground">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <h4 className="font-medium text-foreground mb-2">Last Updated</h4>
                <p className="text-muted-foreground">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Page Modal */}
        <PricingPage isOpen={isOpen} onClose={closePricingPage} />
        
        {/* Purchase Modal */}
        <PurchaseModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} />
      </div>
    </div>
  );
};

export default Profile;
