
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import ThemeToggle from './ThemeToggle';
import N8nConfigToggle from './N8nConfigToggle';
import Navigation from './Navigation';
import CloudRunner from '@/pages/CloudRunner';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        <Navigation />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-card-foreground">
                  Casel AI
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <N8nConfigToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {user?.email?.split('@')[0] || 'User'}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/cloud-runner" element={<CloudRunner />} />
              <Route path="*" element={<Navigate to="/cloud-runner" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
