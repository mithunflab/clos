
"use client";
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Bot, Zap, Shield, Cpu, Sparkles, Menu, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Utility function
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Aurora Background Component
interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
  showRadialGradient?: boolean;
}

const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col h-[100vh] items-center justify-center text-foreground transition-bg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </main>
  );
};

// Background Pattern Component
type BGVariantType = 'dots' | 'grid';
type BGMaskType = 'fade-center' | 'fade-edges' | 'none';

interface BGPatternProps extends React.ComponentProps<'div'> {
  variant?: BGVariantType;
  mask?: BGMaskType;
  size?: number;
  fill?: string;
}

const maskClasses: Record<BGMaskType, string> = {
  'fade-edges': '[mask-image:radial-gradient(ellipse_at_center,var(--background),transparent)]',
  'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,var(--background))]',
  'none': '',
};

function getBgImage(variant: BGVariantType, fill: string, size: number) {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`;
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    default:
      return undefined;
  }
}

const BGPattern = ({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = '#252525',
  className,
  style,
  ...props
}: BGPatternProps) => {
  const bgSize = `${size}px ${size}px`;
  const backgroundImage = getBgImage(variant, fill, size);
  
  return (
    <div
      className={cn('absolute inset-0 z-[-10] size-full', maskClasses[mask], className)}
      style={{
        backgroundImage,
        backgroundSize: bgSize,
        ...style,
      }}
      {...props}
    />
  );
};

// Navigation Component
const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-between w-[calc(100%-2rem)] max-w-4xl px-6 py-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-full">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-black" />
        </div>
        <span className="text-white font-bold text-xl">casel</span>
      </div>
      
      <div className="hidden md:flex items-center space-x-8">
        <a href="#features" className="text-white/80 hover:text-white transition-colors text-sm">Features</a>
        <a href="#about" className="text-white/80 hover:text-white transition-colors text-sm">About</a>
        <a href="#pricing" className="text-white/80 hover:text-white transition-colors text-sm">Pricing</a>
      </div>
      
      <div className="hidden md:flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white border-white/20 hover:bg-white/10"
          onClick={() => navigate('/auth')}
        >
          Sign In
        </Button>
        <Button 
          size="sm" 
          className="bg-white text-black hover:bg-white/90"
          onClick={() => navigate('/dashboard')}
        >
          Get Started
        </Button>
      </div>
      
      <button
        className="md:hidden text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:hidden">
          <div className="flex flex-col space-y-4">
            <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
            <a href="#about" className="text-white/80 hover:text-white transition-colors">About</a>
            <a href="#pricing" className="text-white/80 hover:text-white transition-colors">Pricing</a>
            <div className="flex flex-col space-y-2 pt-4 border-t border-white/10">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white border-white/20 hover:bg-white/10 w-full"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button 
                size="sm" 
                className="bg-white text-black hover:bg-white/90 w-full"
                onClick={() => navigate('/dashboard')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const lightSize = 100;
  const lightX = useTransform(x, (value) => value - lightSize / 2);
  const lightY = useTransform(y, (value) => value - lightSize / 2);
  
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BGPattern variant="dots" mask="fade-edges" size={20} fill="#ffffff10" />
      
      {isHovered && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: lightSize,
            height: lightSize,
            background: 'rgba(255, 255, 255, 0.1)',
            filter: 'blur(40px)',
            x: lightX,
            y: lightY,
          }}
        />
      )}
      
      <div className="relative z-10">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/70 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

// Main Landing Page Component
const CaselLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Global Moving Background */}
      <div className="fixed inset-0 z-0">
        <div
          className={cn(
            `
          [--white-gradient:repeating-linear-gradient(165deg,var(--white)_0%,var(--white)_2%,var(--transparent)_4%,var(--transparent)_6%,var(--white)_8%)]
          [--dark-gradient:repeating-linear-gradient(165deg,var(--black)_0%,var(--black)_2%,var(--dark-gray)_4%,var(--dark-gray)_6%,var(--black)_8%)]
          [--aurora:repeating-linear-gradient(165deg,var(--dark-blue)_3%,var(--dark-gray)_6%,var(--charcoal)_9%,var(--dark-slate)_12%,var(--black)_15%)]
          [background-image:var(--dark-gradient),var(--aurora)]
          [background-size:100%_200%,100%_160%]
          [background-position:0%_0%,0%_0%]
          filter blur-[6px] invert-0
          animate-aurora
          pointer-events-none
          absolute inset-0 opacity-70 will-change-transform`
          )}
        ></div>
        <div
          className={cn(
            `
          [--aurora-alt:repeating-linear-gradient(170deg,var(--charcoal)_0%,var(--dark-slate)_5%,var(--dark-gray)_10%,var(--black)_15%,var(--charcoal)_20%)]
          [--dark-alt:repeating-linear-gradient(170deg,var(--black)_0%,var(--black)_3%,var(--dark-gray)_6%,var(--dark-gray)_9%,var(--black)_12%)]
          [background-image:var(--dark-alt),var(--aurora-alt)]
          [background-size:100%_180%,100%_140%]
          [background-position:0%_0%,0%_50%]
          filter blur-[8px] invert-0
          animate-aurora-secondary
          pointer-events-none
          absolute inset-0 opacity-50 will-change-transform mix-blend-multiply`
          )}
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

      <Navigation />

      {/* Hero Section */}
      <AuroraBackground>
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm">
              <Sparkles className="w-4 h-4 text-white" />
              <span>Introducing Autonomous AI</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                casel
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              The autonomous AI that automates every task. Experience the future of productivity with intelligent automation that thinks, learns, and executes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-8">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-white/90 px-8 py-4 text-lg font-medium"
                onClick={() => navigate('/auth')}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Automating
              </Button>
              <Button variant="ghost" size="lg" className="text-white border-white/20 hover:bg-white/10 px-8 py-4 text-lg">
                Watch Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </AuroraBackground>

      {/* Features Section */}
      <section className="relative py-32 px-6 z-10">        
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Autonomous Intelligence
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              casel doesn't just follow commands—it understands context, makes decisions, and executes complex workflows autonomously.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="w-6 h-6 text-white" />}
              title="Autonomous Decision Making"
              description="Advanced AI that analyzes situations, weighs options, and makes intelligent decisions without human intervention."
              delay={0.1}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-white" />}
              title="Instant Task Execution"
              description="From simple commands to complex workflows, casel executes tasks with lightning speed and precision."
              delay={0.2}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-white" />}
              title="Secure & Private"
              description="Enterprise-grade security ensures your data and processes remain protected while AI works autonomously."
              delay={0.3}
            />
            <FeatureCard
              icon={<Cpu className="w-6 h-6 text-white" />}
              title="Adaptive Learning"
              description="Continuously learns from your patterns and preferences to become more efficient over time."
              delay={0.4}
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-white" />}
              title="Intelligent Automation"
              description="Goes beyond simple automation to provide intelligent solutions for complex business challenges."
              delay={0.5}
            />
            <FeatureCard
              icon={<ArrowRight className="w-6 h-6 text-white" />}
              title="Seamless Integration"
              description="Integrates with your existing tools and workflows without disrupting your current processes."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Experience
              <br />
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                True Automation?
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Join thousands of professionals who have already transformed their workflow with casel's autonomous AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-white/90 px-8 py-4 text-lg font-medium"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
              </Button>
              <Button variant="ghost" size="lg" className="text-white border-white/20 hover:bg-white/10 px-8 py-4 text-lg">
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <span className="text-white font-bold text-xl">casel</span>
            </div>
            <div className="flex items-center space-x-8 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/40">
            © 2024 casel. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CaselLandingPage;
