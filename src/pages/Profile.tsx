
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
import { GlowingEffect } from '@/components/ui/glowing-effect';

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
        return 'bg-blue-500/10 text-blue-300 border-blue-400/50';
      case 'custom':
        return 'bg-purple-500/10 text-purple-300 border-purple-400/50';
      default:
        return 'bg-gray-500/10 text-gray-300 border-gray-400/50';
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
      <div className="min-h-screen canvas-background p-6">
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
    <div className="min-h-screen canvas-background">
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="relative min-h-[8rem]">
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative bg-card/80 backdrop-blur-xl rounded-xl p-8 border-[0.75px] border-border/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mb-2">
                    Your Profile
                  </h1>
                  <p className="text-muted-foreground text-lg">Manage your account and subscription</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive bg-card/50 backdrop-blur-sm transition-all duration-300"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="relative min-h-[24rem]">
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <Card className="relative h-full bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl overflow-hidden border-[0.75px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
                <CardHeader className="relative bg-gradient-to-r from-primary/10 to-transparent rounded-t-xl border-b border-border/50 p-8">
                  <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                    <div className="p-3 bg-primary/20 rounded-xl border border-primary/30">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative space-y-8 p-8">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24 border-4 border-blue-400/30 shadow-lg">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold">
                        {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-1">
                        {profile?.full_name || 'Anonymous User'}
                      </h3>
                      <p className="text-muted-foreground text-lg">{profile?.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profile?.full_name || ''}
                        placeholder="Enter your full name"
                        readOnly
                        className="bg-background/50 border-border text-foreground placeholder-muted-foreground h-12 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        placeholder="Enter your email"
                        readOnly
                        className="bg-background/50 border-border text-foreground placeholder-muted-foreground h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Plan & Credits */}
          <div className="relative min-h-[24rem]">
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <Card className="relative h-full bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl overflow-hidden border-[0.75px]">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 via-transparent to-blue-600/5"></div>
                <CardHeader className="relative bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-t-xl border-b border-border/50 p-8">
                  <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                    <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                      <CreditCard className="w-6 h-6 text-green-400" />
                    </div>
                    Plan & Credits
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative space-y-8 p-8">
                  <div className="bg-background/30 rounded-2xl p-6 space-y-6 border border-border/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-lg">Current Plan</span>
                      <Badge className={`${getPlanColor(plan?.plan_type || 'free')} flex items-center gap-2 px-4 py-2 border text-sm font-semibold rounded-lg`}>
                        {getPlanIcon(plan?.plan_type || 'free')}
                        {(plan?.plan_type || 'free').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-lg">Available Credits</span>
                      <Badge variant="outline" className="bg-background/50 border-blue-500/30 text-blue-400 px-4 py-2 text-sm font-semibold rounded-lg">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {credits?.current_credits || 0} credits
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-lg">Total Credits Used</span>
                      <span className="text-muted-foreground font-medium text-lg">
                        {credits?.total_credits_used || 0} credits
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={openPricingPage}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 rounded-xl"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade Your Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="relative min-h-[12rem]">
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <Card className="relative h-full bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl overflow-hidden border-[0.75px]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-blue-600/5"></div>
              <CardHeader className="relative bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-t-xl border-b border-border/50 p-8">
                <CardTitle className="flex items-center gap-3 text-2xl text-card-foreground">
                  <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <Settings className="w-6 h-6 text-purple-400" />
                  </div>
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="relative p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-background/30 rounded-xl p-6 border border-border/30 backdrop-blur-sm">
                    <h4 className="font-semibold text-foreground mb-3 text-lg">Account Created</h4>
                    <p className="text-muted-foreground text-lg">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="bg-background/30 rounded-xl p-6 border border-border/30 backdrop-blur-sm">
                    <h4 className="font-semibold text-foreground mb-3 text-lg">Last Updated</h4>
                    <p className="text-muted-foreground text-lg">
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
          </div>
        </div>

        {/* Pricing Page Modal */}
        <PricingPage isOpen={isOpen} onClose={closePricingPage} />
      </div>
    </div>
  );
};

export default Profile;
