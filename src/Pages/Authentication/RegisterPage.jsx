import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";  
import { Label } from "@/components/ui/label"; 
import { Checkbox } from "@/components/ui/checkbox"; 
import { EyeOff, Eye, X } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your registration logic here
    console.log('Registration data:', formData);
  };

  return (
    <div className="min-h-screen bg-white font-['Poppins'] flex flex-col">
      {/* Header: Logo & Cancel Button */}
      <header className="flex justify-between items-center px-12 py-8">
        <div className="flex items-center gap-2">
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
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-10">
              <h1 className="text-4xl font-semibold text-[#313131] mb-4">Sign up</h1>
              <p className="text-gray-500">Let's get you all set up so you can access your personal account.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    type="text" 
                    id="firstName" 
                    placeholder="John" 
                    className="h-14 border-[#79747E]"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    type="text" 
                    id="lastName" 
                    placeholder="Doe" 
                    className="h-14 border-[#79747E]"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input 
                  type="email" 
                  id="email" 
                  placeholder="john.doe@gmail.com" 
                  className="h-14 border-[#79747E]"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Password */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    placeholder="••••••••••••••••" 
                    className="h-14 border-[#79747E] pr-12"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    id="confirmPassword" 
                    placeholder="••••••••••••••••" 
                    className="h-14 border-[#79747E] pr-12"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agreeToTerms" 
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                  required
                />
                <label htmlFor="agreeToTerms" className="text-sm text-[#313131] cursor-pointer leading-relaxed">
                  I agree to all the <a href="#" className="text-[#FF8682] hover:underline">Terms</a> and <a href="#" className="text-[#FF8682] hover:underline">Privacy Policies</a>
                </label>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all"
              >
                Create account
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-[#313131] font-medium">
                Already have an account? {' '}
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/login');
                  }}
                  className="text-[#FF8682] hover:underline cursor-pointer"
                >
                  Login
                </a>
              </p>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">Or register with</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid gap-4">
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  <FcGoogle className="w-6 h-6" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[550px] h-[750px] bg-gray-100 rounded-[30px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500">
            <img 
              src="/Rectangle20.png" 
              alt="Register illustration" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0"></div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;