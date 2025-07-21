
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, Shield, Cpu, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
          password
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

  const features = [
    {
      icon: <Bot className="w-6 h-6 text-white" />,
      title: "Autonomous Decision Making",
      description: "Advanced AI that analyzes situations and makes intelligent decisions without human intervention."
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: "Instant Task Execution",
      description: "From simple commands to complex workflows, casel executes tasks with lightning speed."
    },
    {
      icon: <Shield className="w-6 h-6 text-white" />,
      title: "Secure & Private",
      description: "Enterprise-grade security ensures your data and processes remain protected."
    },
    {
      icon: <Cpu className="w-6 h-6 text-white" />,
      title: "Adaptive Learning",
      description: "Continuously learns from your patterns to become more efficient over time."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex relative overflow-hidden">
      {/* Global Moving Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="
          [--white-gradient:repeating-linear-gradient(165deg,var(--white)_0%,var(--white)_2%,var(--transparent)_4%,var(--transparent)_6%,var(--white)_8%)]
          [--dark-gradient:repeating-linear-gradient(165deg,var(--black)_0%,var(--black)_2%,var(--dark-gray)_4%,var(--dark-gray)_6%,var(--black)_8%)]
          [--aurora:repeating-linear-gradient(165deg,var(--dark-blue)_3%,var(--dark-gray)_6%,var(--charcoal)_9%,var(--dark-slate)_12%,var(--black)_15%)]
          [background-image:var(--dark-gradient),var(--aurora)]
          [background-size:100%_200%,100%_160%]
          [background-position:0%_0%,0%_0%]
          filter blur-[6px] invert-0
          animate-aurora
          pointer-events-none
          absolute inset-0 opacity-70 will-change-transform
          "
        ></div>
        <div
          className="
          [--aurora-alt:repeating-linear-gradient(170deg,var(--charcoal)_0%,var(--dark-slate)_5%,var(--dark-gray)_10%,var(--black)_15%,var(--charcoal)_20%)]
          [--dark-alt:repeating-linear-gradient(170deg,var(--black)_0%,var(--black)_3%,var(--dark-gray)_6%,var(--dark-gray)_9%,var(--black)_12%)]
          [background-image:var(--dark-alt),var(--aurora-alt)]
          [background-size:100%_180%,100%_140%]
          [background-position:0%_0%,0%_50%]
          filter blur-[8px] invert-0
          animate-aurora-secondary
          pointer-events-none
          absolute inset-0 opacity-50 will-change-transform mix-blend-multiply
          "
        ></div>
      </div>

      <style>{`
        @keyframes aurora {
          0% {
            background-position: 0% 0%, 0% 0%;
            transform: translateX(-20px) translateY(0px);
          }
          25% {
            background-position: 25% 15%, 15% 25%;
            transform: translateX(-10px) translateY(25px);
          }
          50% {
            background-position: 50% 30%, 30% 50%;
            transform: translateX(0px) translateY(50px);
          }
          75% {
            background-position: 75% 45%, 45% 75%;
            transform: translateX(10px) translateY(75px);
          }
          100% {
            background-position: 100% 60%, 60% 100%;
            transform: translateX(20px) translateY(100px);
          }
        }
        
        @keyframes aurora-secondary {
          0% {
            background-position: 100% 0%, 0% 50%;
            transform: translateX(-15px) translateY(0px) scale(1);
          }
          33% {
            background-position: 67% 33%, 33% 83%;
            transform: translateX(-5px) translateY(35px) scale(1.01);
          }
          66% {
            background-position: 33% 66%, 66% 116%;
            transform: translateX(5px) translateY(70px) scale(0.99);
          }
          100% {
            background-position: 0% 100%, 100% 150%;
            transform: translateX(15px) translateY(105px) scale(1);
          }
        }
        
        .animate-aurora {
          animation: aurora 35s ease-in-out infinite;
        }
        
        .animate-aurora-secondary {
          animation: aurora-secondary 28s ease-in-out infinite reverse;
        }
        
        :root {
          --white: #ffffff;
          --black: #000000;
          --transparent: transparent;
          --dark-blue: #0f172a;
          --dark-gray: #1e293b;
          --charcoal: #334155;
          --dark-slate: #475569;
          --background: #000000;
        }
      `}</style>

      {/* Left Side - Auth Form (40% width) */}
      <div className="w-2/5 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <span className="text-white font-bold text-xl">casel</span>
              </div>
              <h1 className="text-xl font-bold mb-2">
                {isLogin ? 'Welcome back' : 'Get started'}
              </h1>
              <p className="text-white/60 text-sm">
                {isLogin 
                  ? 'Sign in to your autonomous AI workspace' 
                  : 'Create your account and start automating'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 pr-10"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Brand & Features (60% width) */}
      <div className="w-3/5 relative overflow-hidden flex items-center">
        <div className="relative z-10 flex flex-col justify-center p-8 w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Experience True
                <br />
                <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Automation
                </span>
              </h2>
              <p className="text-xl text-white/70 leading-relaxed">
                Join thousands of professionals who have transformed their workflow with casel's autonomous AI.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="pt-6"
            >
              <div className="flex items-center space-x-2 text-white/40 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Trusted by 10,000+ professionals worldwide</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
