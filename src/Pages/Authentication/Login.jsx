import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";  
import { Label } from "@/components/ui/label"; 
import { Checkbox } from "@/components/ui/checkbox"; 
import { EyeOff, X, ChevronLeft } from 'lucide-react';
import { FaFacebook } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { AiFillApple } from "react-icons/ai";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  // State để chuyển đổi giữa 'login' và 'forgot-password'
  const [view, setView] = useState('login'); 

  return (
    <div className="min-h-screen bg-white font-['Poppins'] flex flex-col">
      {/* Header: Logo & Cancel Button */}
      <header className="flex justify-between items-center px-12 py-8">
        <div className="flex items-center gap-2">
          {/* Logo - Sửa lại đường dẫn public chuẩn cho Vite */}
          <div className="w-20 h-20 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <img src="/LightMode_Logo.png" alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <Button variant="ghost" className="flex items-center gap-2 text-black hover:bg-gray-100" onClick={() => navigate('/')}>
          <X className="w-5 h-5 text-[#DF0D0C]" />
          <span>Cancel</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto grid md:grid-cols-2 gap-12 items-center px-8 pb-12">
        
        {/* Left Side: Form Container */}
        <div className="max-w-md w-full mx-auto md:mx-0">
          
          {/* --- VIEW: LOGIN --- */}
          {view === 'login' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="mb-10">
                <h1 className="text-4xl font-semibold text-[#313131] mb-4">Login</h1>
                <p className="text-gray-500">Login to access your QuizMate account</p>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid w-full items-center gap-1.5 relative">
                  <Label htmlFor="email">Email</Label>
                  <Input type="email" id="email" placeholder="john.doe@gmail.com" className="h-14 border-[#79747E]" />
                </div>

                <div className="grid w-full items-center gap-1.5 relative">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      placeholder="••••••••••••••••" 
                      className="h-14 border-[#79747E] pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      <EyeOff className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label htmlFor="remember" className="text-sm font-medium text-[#313131] cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  {/* Chuyển sang View Quên mật khẩu */}
                  <a 
                    href="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('forgot-password');
                    }}
                    className="text-sm font-medium text-[#FF8682] hover:underline"
                  >
                    Forgot Password
                  </a>
                </div>

                <Button className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all">
                  Login
                </Button>

                <p className="text-center text-sm text-[#313131] font-medium">
                  Don't have an account? <a href="/register" className="text-[#FF8682] hover:underline">Sign up</a>
                </p>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">Or login with</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-14 border-[#515DEF]">
                    <FcGoogle className="w-6 h-6" />
                  </Button>
                  <Button variant="outline" className="h-14 border-[#515DEF]">
                    <AiFillApple className="w-6 h-6 text-[#313131]" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* --- VIEW: FORGOT PASSWORD --- */}
          {view === 'forgot-password' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-8 hover:text-black"
              >
                <ChevronLeft className="w-4 h-4" /> Back to login
              </button>

              <div className="mb-10">
                <h1 className="text-4xl font-semibold text-[#313131] mb-4">Forgot your password?</h1>
                <p className="text-gray-500 leading-relaxed">
                  Don't worry, happens to all of us. Enter your email below to recover your password
                </p>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid w-full items-center gap-1.5 relative">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input type="email" id="forgot-email" placeholder="john.doe@gmail.com" className="h-14 border-[#79747E]" />
                </div>

                <Button className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all">
                  Submit
                </Button>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">Or login with</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-14 border-[#515DEF]">
                    <FcGoogle className="w-6 h-6" />
                  </Button>
                  <Button variant="outline" className="h-14 border-[#515DEF]">
                    <AiFillApple className="w-6 h-6 text-[#313131]" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[550px] h-[750px] bg-gray-100 rounded-[30px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500">
             <img 
               src="/path-to-your-phone-hand-image.png" 
               alt="Login illustration" 
               className="w-full h-full object-cover"
             />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0"></div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
