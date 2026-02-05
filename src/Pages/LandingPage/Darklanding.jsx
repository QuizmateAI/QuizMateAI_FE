import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, Map, BrainCircuit, Mic, Globe, PlayCircle, 
  Check, CheckCircle2, Sparkles, Menu, X 
} from 'lucide-react';

/* =========================================
   1. MOCK UI COMPONENTS (Thay thế Shadcn UI)
   Giúp file hoạt động độc lập không cần cài thêm lib
   ========================================= */

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20",
    outline: "border-2 border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100",
    ghost: "hover:bg-slate-800 text-slate-300 hover:text-white",
  };
  return (
    <button className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
    {children}
  </span>
);

const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

/* =========================================
   2. SUB-COMPONENTS (Converted to Dark Mode)
   ========================================= */

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 z-[100] w-full transition-all duration-300 border-b ${
      isScrolled 
        ? 'bg-slate-950/80 backdrop-blur-md border-slate-800 py-4' 
        : 'bg-transparent border-transparent py-6'
    }`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-x-12">
          <div className="flex items-center gap-2 cursor-pointer font-black text-2xl tracking-tighter text-white">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            QuizMate
          </div>
          
          <div className="hidden lg:flex items-center gap-x-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-blue-400 transition-colors">Stories</a>
          </div>
        </div>

        {/* Action Area */}
        <div className="flex items-center gap-x-4">
          <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-sm font-medium text-slate-400">
            <Globe className="w-4 h-4" />
            <span>EN</span>
          </button>
          <Button variant="ghost" className="font-bold hidden md:inline-flex">
            Login
          </Button>
          <Button className="font-bold px-6 py-2.5 text-sm">
            Sign Up
          </Button>
        </div>
      </div>
    </nav>
  );
};

const HeroSection = () => {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-left animate-in slide-in-from-left-10 duration-700">
          <Badge className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-4 py-1.5 uppercase tracking-widest">
            New Version 2.0
          </Badge>
          
          <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] text-white tracking-tight">
            Master Any <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Language Faster
            </span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-medium">
            AI-powered roadmaps, personalized quizzes, and a speaking companion that helps you fluent in record time.
          </p>
          
          <div className="flex flex-wrap gap-5 pt-4">
            <Button className="h-14 px-8 text-base font-bold rounded-2xl">
              Start Learning Now
            </Button>
            <Button variant="outline" className="h-14 px-8 text-base font-bold rounded-2xl gap-2 group">
              <PlayCircle className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" /> 
              Watch Demo
            </Button>
          </div>
          
          <div className="flex items-center gap-6 pt-6 opacity-80">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <p className="text-white font-bold text-base">15,000+</p>
              <p className="text-slate-500 font-bold uppercase tracking-tighter">Active Students</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex justify-center lg:justify-end animate-in zoom-in duration-1000 delay-300">
           {/* Decorative Elements for Dark Mode */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] bg-yellow-500/10 rounded-full -z-10 blur-3xl"></div>
           
           <div className="relative z-10 bg-slate-900/50 backdrop-blur-xl p-4 rounded-[40px] border border-slate-700/50 shadow-2xl">
             <div className="bg-slate-950 w-full md:w-[450px] h-[500px] rounded-[30px] flex items-center justify-center overflow-hidden border border-slate-800 relative group">
                {/* Placeholder UI for Dashboard */}
                <div className="absolute inset-0 flex flex-col p-6 space-y-4">
                   <div className="h-8 w-1/3 bg-slate-800 rounded-lg animate-pulse"/>
                   <div className="flex gap-4">
                      <div className="h-32 w-1/2 bg-blue-900/20 border border-blue-900/50 rounded-2xl p-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full mb-2 flex items-center justify-center"><BrainCircuit className="w-5 h-5 text-white"/></div>
                        <div className="h-3 w-20 bg-blue-900/50 rounded mb-2"/>
                        <div className="h-2 w-12 bg-blue-900/30 rounded"/>
                      </div>
                      <div className="h-32 w-1/2 bg-slate-800 rounded-2xl"/>
                   </div>
                   <div className="flex-1 bg-slate-800/50 rounded-2xl p-4 space-y-3">
                      <div className="h-4 w-full bg-slate-800 rounded"/>
                      <div className="h-4 w-3/4 bg-slate-800 rounded"/>
                      <div className="h-4 w-5/6 bg-slate-800 rounded"/>
                   </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 bg-slate-900">
      <div className="container mx-auto px-6 text-center max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-black mb-24 tracking-tight text-white">
          Why choose <span className="text-blue-500">QuizMate?</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-16 lg:gap-24">
          {[
            { 
              icon: Map, 
              color: 'rose', 
              title: "Smart Roadmap", 
              desc: "Personalized learning paths generated by AI based on your current level and goals." 
            },
            { 
              icon: BrainCircuit, 
              color: 'blue', 
              title: "AI Generation", 
              desc: "Instantly create quizzes from any text, PDF, or YouTube video URL." 
            },
            { 
              icon: Mic, 
              color: 'emerald', 
              title: "Voice Companion", 
              desc: "Practice pronunciation with our real-time AI tutor that corrects your accent." 
            }
          ].map((feature, idx) => (
            <div key={idx} className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
              {/* Dynamic Color Classes for Dark Mode */}
              <div className={`w-20 h-20 rounded-[25px] flex items-center justify-center shadow-inner transition-all duration-300 group-hover:rotate-6
                ${feature.color === 'rose' ? 'bg-rose-950/30 text-rose-400 group-hover:bg-rose-900/50' : ''}
                ${feature.color === 'blue' ? 'bg-blue-950/30 text-blue-400 group-hover:bg-blue-900/50' : ''}
                ${feature.color === 'emerald' ? 'bg-emerald-950/30 text-emerald-400 group-hover:bg-emerald-900/50' : ''}
              `}>
                <feature.icon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">{feature.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  return (
    <section id="pricing" className="py-32 bg-slate-950">
      <div className="container mx-auto px-6 text-center space-y-6 mb-24">
        <h2 className="text-4xl font-black tracking-tight text-white">
          Simple, Transparent <span className="text-blue-500">Pricing</span>
        </h2>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Invest in your knowledge</p>
      </div>

      <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8 max-w-7xl items-center pb-12">
        {/* Free Plan */}
        <Card className="bg-slate-900 border-slate-800 p-10 space-y-8 rounded-[32px] hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <h4 className="font-black text-slate-500 uppercase tracking-widest text-sm">Starter</h4>
            <div className="text-5xl font-black text-white">$0</div>
          </div>
          <ul className="space-y-4 text-sm font-bold text-slate-400">
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /> 5 AI Roadmaps</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Basic Quizzes</li>
            <li className="flex items-center gap-3 text-slate-600 line-through"><CheckCircle2 className="w-5 h-5 opacity-20" /> Voice Tutor</li>
          </ul>
          <Button variant="outline" className="w-full h-12 rounded-xl text-sm">Get Started</Button>
        </Card>

        {/* Pro Plan */}
        <Card className="bg-blue-600 text-white border-none p-12 space-y-8 rounded-[40px] relative z-20 shadow-2xl shadow-blue-900/50 transform md:scale-110">
          <div className="absolute top-6 right-6 bg-blue-400/20 text-blue-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Popular</div>
          <div className="space-y-3">
            <h4 className="font-black opacity-70 uppercase tracking-widest text-sm">Pro Learner</h4>
            <div className="text-6xl font-black">$12</div>
            <p className="opacity-50 text-xs font-bold uppercase tracking-widest">/ Month</p>
          </div>
          <ul className="space-y-5 text-sm font-bold">
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-white" /> Unlimited Roadmaps</li>
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-white" /> Advanced Voice Mode</li>
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-white" /> YouTube to Quiz</li>
          </ul>
          <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 h-14 rounded-xl text-base font-black border-none">
            Upgrade Now
          </Button>
        </Card>

        {/* Elite Plan */}
        <Card className="bg-slate-900 border-slate-800 p-10 space-y-8 rounded-[32px] hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <h4 className="font-black text-slate-500 uppercase tracking-widest text-sm">Elite</h4>
            <div className="text-5xl font-black text-white">$49</div>
          </div>
          <ul className="space-y-4 text-sm font-bold text-slate-400">
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Everything in Pro</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Priority Support</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /> API Access</li>
          </ul>
          <Button variant="outline" className="w-full h-12 rounded-xl text-sm">Contact Sales</Button>
        </Card>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="bg-blue-900/40 border-y border-slate-800 py-32 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950 -z-20"></div>
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10"></div>
      
      <div className="container mx-auto px-6 text-center space-y-16 relative z-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight">Loved by 15,000+ Students</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[1, 2].map((item) => (
            <div key={item} className="text-left space-y-6 bg-slate-800/50 p-8 rounded-[30px] border border-slate-700/50 backdrop-blur-sm">
              <div className="flex gap-1 text-yellow-400">
                {[1,2,3,4,5].map(star => <Sparkles key={star} className="w-4 h-4 fill-current"/>)}
              </div>
              <p className="text-lg text-slate-200 italic leading-relaxed font-medium">
                "This platform completely changed how I study for IELTS. The AI speaking partner is insanely realistic!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?img=${item + 20}`} alt="student" />
                </div>
                <div>
                  <p className="font-bold text-white">Sarah Johnson</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">University Student</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-12 border-t border-slate-800 bg-slate-950 text-slate-400">
      <div className="container mx-auto px-6 grid md:grid-cols-4 gap-12 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-black text-xl text-white">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            QuizMate
          </div>
          <p className="text-sm leading-relaxed max-w-xs">
            Empowering students worldwide with AI-driven learning tools.
          </p>
        </div>

        {[
          { title: "Product", links: ["Roadmap", "Quizzes", "Groups"] },
          { title: "Company", links: ["About Us", "Privacy Policy", "Terms of Service"] },
          { title: "Connect", links: ["Twitter", "Discord", "Facebook"] }
        ].map((col, idx) => (
          <div key={idx} className="space-y-6">
            <h5 className="font-bold uppercase text-xs tracking-[0.2em] text-white">{col.title}</h5>
            <ul className="space-y-3 text-sm font-semibold">
              {col.links.map(link => (
                <li key={link}><a href="#" className="hover:text-blue-400 transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container mx-auto px-6 border-t border-slate-900 pt-8 text-center md:text-right text-xs font-bold uppercase tracking-widest text-slate-600">
        © 2024 QuizMate Inc. All rights reserved.
      </div>
    </footer>
  );
};

/* =========================================
   3. MAIN LANDING PAGE COMPONENT
   ========================================= */

const Dark = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    // MASTER CONTAINER: DARK MODE ENABLED (SLATE THEME)
    <div className="min-h-screen bg-slate-950 text-slate-50 font-poppins selection:bg-blue-500/30 selection:text-blue-200">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <Footer />
      
      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-all z-50 ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Dark;