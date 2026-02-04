import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";  
import { Label } from "@/components/ui/label"; 
import { X, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";
import { AiFillApple } from "react-icons/ai";
import { validateForgotPasswordForm, submitForgotPasswordRequest } from './ForgotPassword';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Xác thực dữ liệu
    const validation = validateForgotPasswordForm(email);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API gửi yêu cầu đặt lại mật khẩu
      const response = await submitForgotPasswordRequest(email);
      setSuccessMessage(response.message);
      setEmail('');
      setErrors({});
      
      // Chuyển hướng sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa thông báo lỗi khi người dùng sửa email
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors({});
    }
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
            {/* Back to Login Button */}
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-8 hover:text-black transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Back to login
            </button>

            <div className="mb-10">
              <h1 className="text-4xl font-semibold text-[#313131] mb-4">Forgot your password?</h1>
              <p className="text-gray-500 leading-relaxed">
                Don't worry, happens to all of us. Enter your email below to recover your password
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Success Message */}
              {successMessage && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="grid w-full items-center gap-1.5 relative">
                <Label htmlFor="email" className={errors.email ? 'text-red-600' : ''}>Email</Label>
                <Input 
                  type="email" 
                  id="email" 
                  placeholder="john.doe@gmail.com" 
                  className={`h-14 border-[#79747E] ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-600">{errors.email}</p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : 'Submit'}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">Or login with</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  <FcGoogle className="w-6 h-6" />
                </Button>
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  <AiFillApple className="w-6 h-6 text-[#313131]" />
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
              alt="Forgot Password illustration" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0"></div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;