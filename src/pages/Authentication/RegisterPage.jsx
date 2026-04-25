import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; 
import { FloatingInput, FloatingPasswordInput } from "@/components/ui/floating-input";
import { ChevronLeft } from 'lucide-react';
import AuthIllustration from '@/components/ui/AuthIllustration';

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
                  {t('agreeToTerms')} <span className="text-[#FF8682]">{t('terms')}</span> {t('and')} <span className="text-[#FF8682]">{t('privacyPolicies')}</span>
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
                <button 
                  type="button"
                  onClick={() => {
                    navigate('/login');
                  }}
                  className="text-[#FF8682] hover:underline cursor-pointer"
                >
                  {t('login')}
                </button>
              </p>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-200" />
                <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('orRegisterWith')}</span>
                <div className="flex-grow border-t border-gray-200" />
              </div>

              {/* Social Login Buttons */}
              <div className="grid gap-4">
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  {/* Google icon */}
                  <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[550px] h-[750px] bg-gray-100 rounded-[30px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500">
            <AuthIllustration alt="" imgClassName="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0" />
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
