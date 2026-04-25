import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';

function NotFoundPage() {
  const { isDarkMode } = useDarkMode();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 py-12 transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-white text-[#313131]'
    }`}>
      <img
        src={isDarkMode ? LogoDark : LogoLight}
        alt="QuizMate AI"
        className="h-20 w-auto object-contain mb-8"
      />

      <div className="text-center max-w-xl space-y-4">
        <p className={`text-[128px] leading-none font-black tracking-tight ${
          isDarkMode ? 'text-blue-400' : 'text-[#2563EB]'
        }`}>
          404
        </p>
        <h1 className={`text-2xl md:text-3xl font-bold ${
          isDarkMode ? 'text-white' : 'text-[#12141D]'
        }`}>
          Không tìm thấy trang
        </h1>
        <p className={`text-base ${
          isDarkMode ? 'text-slate-400' : 'text-gray-500'
        }`}>
          Trang bạn đang tìm có thể đã bị xoá, đổi tên hoặc tạm thời không khả dụng.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
