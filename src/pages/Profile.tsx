
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
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'custom':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-800 rounded-lg w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-800 rounded-xl"></div>
              <div className="h-64 bg-gray-800 rounded-xl"></div>
            </div>
            <div className="h-32 bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700/50">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Your Profile
            </h1>
            <p className="text-gray-400 mt-2">Manage your account and subscription</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="flex items-center gap-2 border-red-600/30 text-red-400 hover:bg-red-900/20 hover:border-red-500 bg-gray-800/50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-t-lg border-b border-gray-700/50">
              <CardTitle className="flex items-center gap-3 text-xl text-gray-100">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-4 border-blue-500/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-bold">
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-gray-100">
                    {profile?.full_name || 'Anonymous User'}
                  </h3>
                  <p className="text-gray-400">{profile?.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-gray-300">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ''}
                    placeholder="Enter your full name"
                    readOnly
                    className="bg-gray-700/50 border-gray-600 text-gray-100 placeholder-gray-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-300">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    placeholder="Enter your email"
                    readOnly
                    className="bg-gray-700/50 border-gray-600 text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan & Credits */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-t-lg border-b border-gray-700/50">
              <CardTitle className="flex items-center gap-3 text-xl text-gray-100">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-400" />
                </div>
                Plan & Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 space-y-4 border border-gray-700/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Current Plan</span>
                  <Badge className={`${getPlanColor(plan?.plan_type || 'free')} flex items-center gap-2 px-3 py-1 border`}>
                    {getPlanIcon(plan?.plan_type || 'free')}
                    {(plan?.plan_type || 'free').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Available Credits</span>
                  <Badge variant="outline" className="bg-gray-800/50 border-blue-500/30 text-blue-400 px-3 py-1">
                    <Sparkles className="w-4 h-4 mr-1" />
                    {credits?.current_credits || 0} credits
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Total Credits Used</span>
                  <span className="text-gray-400 font-medium">
                    {credits?.total_credits_used || 0} credits
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={openPricingPage}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade Your Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-t-lg border-b border-gray-700/50">
            <CardTitle className="flex items-center gap-3 text-xl text-gray-100">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <h4 className="font-semibold text-gray-200 mb-2">Account Created</h4>
                <p className="text-gray-400">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
              
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <h4 className="font-semibold text-gray-200 mb-2">Last Updated</h4>
                <p className="text-gray-400">
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
