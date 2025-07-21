
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useProfile } from "@/hooks/useProfile";
import { Crown, CreditCard, Bell, Shield, User, Mail, Save, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user } = useAuth();
  const { plan, loading: planLoading } = useUserPlan();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const success = await updateProfile({ full_name: fullName });
    
    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'custom':
        return <Crown className="h-4 w-4 text-purple-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (profileLoading || planLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background overflow-auto">
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <span className="text-white font-bold text-2xl">Profile Settings</span>
          </div>
          <p className="text-white/60">Manage your account and preferences</p>
        </div>

        {/* Current Plan Card */}
        <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">Current Plan</CardTitle>
                {plan && (
                  <Badge className="bg-white/10 text-white border-white/20">
                    <div className="flex items-center gap-1">
                      {getPlanIcon(plan.plan_type)}
                      {plan.plan_type.toUpperCase()}
                    </div>
                  </Badge>
                )}
              </div>
              {plan?.plan_type === 'free' && (
                <Button size="sm" className="bg-white text-black hover:bg-white/90">
                  Upgrade Plan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Credits Remaining</p>
                <p className="text-2xl font-bold text-white">
                  {plan?.credits || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60">Total Credits</p>
                <p className="text-2xl font-bold text-white/60">
                  {plan?.max_credits || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-white/60" />
              <CardTitle className="text-lg text-white">Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || profile?.email || ''}
                    disabled
                    className="bg-white/5 border-white/20 text-white/60"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Full Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating || fullName === profile?.full_name}
                    size="sm"
                    className="bg-white text-black hover:bg-white/90"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId" className="text-white">User ID</Label>
                <Input
                  id="userId"
                  value={user?.id?.substring(0, 8) + '...' || ''}
                  disabled
                  className="bg-white/5 border-white/20 text-white/60 text-xs"
                />
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Notification Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-white/60" />
                <Label className="text-sm font-medium text-white">Notifications</Label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="text-sm text-white">
                    Email Notifications
                  </Label>
                  <p className="text-xs text-white/60">
                    Receive updates about your workflows and credits
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Security Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-white/60" />
                <Label className="text-sm font-medium text-white">Security</Label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactor" className="text-sm text-white">
                    Two-Factor Authentication
                  </Label>
                  <p className="text-xs text-white/60">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  id="twoFactor"
                  checked={twoFactor}
                  onCheckedChange={setTwoFactor}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Account Actions</CardTitle>
            <CardDescription className="text-white/60">
              Manage your account preferences and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-white/5 border-white/20 text-white hover:bg-white/10">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white/5 border-white/20 text-white hover:bg-white/10">
              Download My Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
