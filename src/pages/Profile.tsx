
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
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400';
      case 'custom':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400';
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
            <div className="h-10 bg-muted rounded-lg w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded-xl"></div>
              <div className="h-64 bg-muted rounded-xl"></div>
            </div>
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <Card className="bg-card border-border shadow-sm">
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
                className="flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                <div className="p-3 bg-muted rounded-xl">
                  <User className="w-6 h-6 text-primary" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-2 border-border">
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
                    className="bg-muted/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    placeholder="Enter your email"
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan & Credits */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                <div className="p-3 bg-muted rounded-xl">
                  <CreditCard className="w-6 h-6 text-primary" />
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
                  <Badge variant="outline" className="bg-card border-primary/30 text-primary px-3 py-1 text-sm font-medium">
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
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 font-medium"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Your Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
              <div className="p-3 bg-muted rounded-xl">
                <Settings className="w-6 h-6 text-primary" />
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
      </div>
    </div>
  );
};

export default Profile;
