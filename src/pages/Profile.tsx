
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
import { CreditCard, User, Settings, Crown } from 'lucide-react';

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
        return 'bg-blue-100 text-blue-800';
      case 'custom':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{profile?.full_name || 'Anonymous User'}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile?.full_name || ''}
                placeholder="Enter your full name"
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                placeholder="Enter your email"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan & Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plan & Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge className={`${getPlanColor(plan?.plan_type || 'free')} flex items-center gap-1`}>
                {getPlanIcon(plan?.plan_type || 'free')}
                {(plan?.plan_type || 'free').toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Available Credits</span>
              <Badge variant="outline">
                {credits?.current_credits || 0} credits
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Credits Used</span>
              <span className="text-sm text-muted-foreground">
                {credits?.total_credits_used || 0} credits
              </span>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                onClick={openPricingPage}
                className="w-full"
                variant="default"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Account Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Last Updated</h4>
                  <p className="text-sm text-muted-foreground">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Page Modal */}
      <PricingPage isOpen={isOpen} onClose={closePricingPage} />
    </div>
  );
};

export default Profile;
