import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; 
import { FloatingInput, FloatingPasswordInput } from "@/components/ui/floating-input";
import { ChevronLeft } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your registration logic here
    console.log('Registration data:', formData);
  };

  return (
    <div className={`min-h-screen bg-white flex flex-col ${fontClass}`}>
      {/* Main Content */}
      <main className="flex-1 container mx-auto grid md:grid-cols-2 gap-12 items-center px-8 py-8">
        
        {/* Left Side: Form Container */}
        <div className="max-w-md w-full mx-auto md:mx-0">
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Nút quay về Login */}
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-6 hover:text-[#0455BF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {t('backToLogin')}
            </button>

            <div className="mb-10">
              <h1 className="text-4xl font-semibold text-[#313131] mb-4">{t('signUpTitle')}</h1>
              <p className="text-gray-500">{t('signUpSubtitle')}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <FloatingInput
                  id="firstName"
                  type="text"
                  label={t('firstName')}
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                />
                <FloatingInput
                  id="lastName"
                  type="text"
                  label={t('lastName')}
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                />
              </div>

              {/* Email */}
              <FloatingInput
                id="email"
                type="email"
                label={t('email')}
                value={formData.email}
                onChange={handleChange('email')}
              />

              {/* Password */}
              <FloatingPasswordInput
                id="password"
                label={t('password')}
                value={formData.password}
                onChange={handleChange('password')}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              {/* Confirm Password */}
              <FloatingPasswordInput
                id="confirmPassword"
                label={t('confirmPassword')}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agreeToTerms" 
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                  required
                />
                <label htmlFor="agreeToTerms" className="text-sm text-[#313131] cursor-pointer leading-relaxed">
                  {t('agreeToTerms')} <a href="#" className="text-[#FF8682] hover:underline">{t('terms')}</a> {t('and')} <a href="#" className="text-[#FF8682] hover:underline">{t('privacyPolicies')}</a>
                </label>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all"
              >
                {t('createAccount')}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-[#313131] font-medium">
                {t('alreadyHaveAccount')} {' '}
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/login');
                  }}
                  className="text-[#FF8682] hover:underline cursor-pointer"
                >
                  {t('login')}
                </a>
              </p>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('orRegisterWith')}</span>
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