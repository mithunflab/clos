
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, Bot } from 'lucide-react';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold text-xl">casel</span>
          </div>
          
          <div className="flex space-x-4">
            <Button
              variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
              onClick={() => navigate('/dashboard')}
              className="text-foreground dark:text-foreground"
            >
              Dashboard
            </Button>
            <Button
              variant={location.pathname.startsWith('/workflows') ? 'default' : 'ghost'}
              onClick={() => navigate('/workflows')}
              className="text-foreground dark:text-foreground"
            >
              Workflows
            </Button>
            <Button
              variant={location.pathname === '/playground' ? 'default' : 'ghost'}
              onClick={() => navigate('/playground')}
              className="text-foreground dark:text-foreground"
            >
              Playground
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="text-foreground dark:text-foreground"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-foreground hover:text-destructive dark:text-foreground dark:hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
