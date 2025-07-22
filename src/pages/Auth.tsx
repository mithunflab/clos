import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-colors focus-within:border-red-500/50 focus-within:bg-red-500/5">
    {children}
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showBlur, setShowBlur] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate('/dashboard');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    // Preload the image with immediate blur removal
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      // Remove blur immediately when image loads
      setTimeout(() => {
        setShowBlur(false);
      }, 50);
    };
    img.onerror = () => {
      // If image fails to load, still remove blur
      setImageLoaded(true);
      setShowBlur(false);
    };
    img.src = '/lovable-uploads/f64f8323-0f7f-46cf-8e49-f083f09ef9ff.png';

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        if (password !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success!",
            description: "Check your email to confirm your account",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw] bg-black text-white auth-bg">
      {/* Left column: sign-in form - 1/3 of the width */}
      <motion.section 
        className="flex-1 md:flex-[1] flex items-center justify-center p-8 bg-black"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="text-5xl md:text-6xl font-light leading-tight text-white mb-8">
                Welcome to<br />CASEL
              </h1>
              <p className="text-gray-400 text-lg">
                {isLogin 
                  ? 'Access your account and continue your journey with us' 
                  : 'Create your account and start automating'
                }
              </p>
            </motion.div>

            <motion.form 
              className="space-y-5" 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Email Address</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-white placeholder-gray-500" 
                    required
                  />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password" 
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-white placeholder-gray-500" 
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400 hover:text-white transition-colors" /> : <Eye className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Confirm Password</label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input 
                        name="confirmPassword" 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password" 
                        className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-white placeholder-gray-500" 
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400 hover:text-white transition-colors" /> : <Eye className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="rounded border-gray-700 bg-gray-900" />
                    <span className="text-gray-300">Keep me signed in</span>
                  </label>
                  <a href="#" className="hover:underline text-red-400 transition-colors">Reset password</a>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-2xl bg-red-600 py-4 font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </motion.form>

            <motion.div 
              className="relative flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <span className="w-full border-t border-gray-800"></span>
              <span className="px-4 text-sm text-gray-400 bg-black absolute">Or continue with</span>
            </motion.div>

            <motion.button 
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-gray-800 rounded-2xl py-4 hover:bg-gray-900 transition-colors text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <GoogleIcon />
              Continue with Google
            </motion.button>

            <motion.p 
              className="text-center text-sm text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              {isLogin 
                ? "New to our platform? " 
                : "Already have an account? "
              }
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }} 
                className="text-red-400 hover:underline transition-colors"
              >
                {isLogin ? 'Create Account' : 'Sign In'}
              </a>
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Right column: hero image - 2/3 of the width */}
      <motion.section 
        className="hidden md:block md:flex-[2] relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div 
          className={`absolute inset-0 bg-cover bg-center rounded-l-3xl transition-all duration-300 ${
            showBlur ? 'auth-image-loading' : 'auth-image-loaded'
          }`}
          style={{ backgroundImage: `url(/lovable-uploads/f64f8323-0f7f-46cf-8e49-f083f09ef9ff.png)` }}
        ></div>
      </motion.section>
    </div>
  );
};

export default Auth;
