
import React from 'react';
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
import { CreditCard, User, Settings, Crown, LogOut, Sparkles } from 'lucide-react';

const Profile = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { plan, credits, loading: planLoading } = useUserPlan();
  const { signOut } = useAuth();
  const { isOpen, openPricingPage, closePricingPage } = usePricingPage();

  const handleSignOut = async () => {
    await signOut();
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'pro':
        return 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary border-primary/30';
      case 'custom':
        return 'bg-gradient-to-r from-secondary/10 to-accent/10 text-secondary border-secondary/30';
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
            <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded-lg w-1/4 animate-shimmer"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gradient-to-br from-muted to-muted/50 rounded-xl animate-shimmer"></div>
              <div className="h-64 bg-gradient-to-br from-muted to-muted/50 rounded-xl animate-shimmer"></div>
            </div>
            <div className="h-32 bg-gradient-to-r from-muted to-muted/50 rounded-xl animate-shimmer"></div>
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
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
                <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl border border-primary/20">
                  <User className="w-6 h-6 text-primary" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-2 border-primary/30 ring-2 ring-primary/10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl font-bold">
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
                    className="bg-muted/50 border-primary/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    placeholder="Enter your email"
                    readOnly
                    className="bg-muted/50 border-primary/20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan & Credits */}
          <Card glowVariant="secondary" className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                <div className="p-3 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-xl border border-secondary/20">
                  <CreditCard className="w-6 h-6 text-secondary" />
                </div>
                Plan & Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-muted/30 to-card rounded-xl p-6 space-y-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Current Plan</span>
                  <Badge className={`${getPlanColor(plan?.plan_type || 'free')} flex items-center gap-2 px-3 py-1 border text-sm font-medium`}>
                    {getPlanIcon(plan?.plan_type || 'free')}
                    {(plan?.plan_type || 'free').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Available Credits</span>
                  <Badge variant="outline" className="bg-gradient-to-r from-card to-muted border-primary/30 text-primary px-3 py-1 text-sm font-medium">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {credits?.current_credits || 0} credits
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total Credits Used</span>
                  <span className="text-muted-foreground font-medium">
                    {credits?.total_credits_used || 0} credits
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={openPricingPage}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Your Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card glowVariant="accent" className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
              <div className="p-3 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl border border-accent/20">
                <Settings className="w-6 h-6 text-accent" />
              </div>
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-muted/30 to-card rounded-xl p-4 border border-border/50">
                <h4 className="font-medium text-foreground mb-2">Account Created</h4>
                <p className="text-muted-foreground">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-muted/30 to-card rounded-xl p-4 border border-border/50">
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
      </div>
    </div>
  );
};

export default Profile;
