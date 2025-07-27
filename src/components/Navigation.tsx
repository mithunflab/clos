
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  Workflow, 
  Cloud, 
  Terminal, 
  Play, 
  User, 
  LogOut,
  CreditCard
} from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Casel</span>
            </Link>
            
            {user && (
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard">
                  <Button 
                    variant={isActive('/dashboard') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                
                <Link to="/workflows">
                  <Button 
                    variant={isActive('/workflows') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Workflow className="w-4 h-4" />
                    <span>Workflows</span>
                  </Button>
                </Link>
                
                <Link to="/playground">
                  <Button 
                    variant={isActive('/playground') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Playground</span>
                  </Button>
                </Link>
                
                <Link to="/cloud-n8n">
                  <Button 
                    variant={isActive('/cloud-n8n') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Cloud N8N</span>
                  </Button>
                </Link>
                
                <Link to="/cloud-runner">
                  <Button 
                    variant={isActive('/cloud-runner') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Cloud Runner</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center space-x-2">
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                
                <Link to="/auth">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
