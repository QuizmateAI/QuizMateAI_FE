import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"; // Cần cài đặt Shadcn UI Button
import { Badge } from "@/components/ui/badge";   // Cần cài đặt Shadcn UI Badge
import { PlayCircle } from 'lucide-react';       // Icon, thường đi kèm Shadcn

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    // Container chính cho cả trang, dùng font-sans mặc định
    <div className="min-h-screen bg-white font-sans">

      {/* ================= HEADER / NAVBAR ================= */}
      {/* Sử dụng flexbox để căn chỉnh các phần tử trong header */}
      <header className="container mx-auto flex items-center justify-between py-6 px-4 md:px-8">
        
        {/* Phần bên trái: Logo và Menu điều hướng */}
        <div className="flex items-center gap-x-12">
          {/* Logo dự án */}
          <a href="#" className="text-xl font-bold text-gray-900">
            QuizMate AI
          </a>

          {/* Menu điều hướng - Ẩn trên mobile (hidden), hiện trên tablet trở lên (md:flex) */}
          <nav className="hidden md:flex items-center gap-x-8 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </nav>
        </div>

        {/* Phần bên phải: Các nút hành động (CTA) */}
        <div className="flex items-center gap-x-4">
          {/* Nút Log in - Ẩn trên mobile */}
          <Button variant="ghost" className="hidden md:inline-flex font-medium" onClick={() => navigate('/login')}>Log in</Button>
          
          {/* Nút Get started - Nút chính, màu tím */}
          <Button className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6">
            Get started
          </Button>
        </div>
      </header>


      {/* ================= MAIN HERO CONTENT ================= */}
      {/* flex-col-reverse: trên mobile ảnh lên trên, chữ xuống dưới. md:flex-row: trên desktop xếp ngang */}
      <main className="container mx-auto flex flex-col-reverse md:flex-row items-center py-16 px-4 md:px-8 gap-12">

        {/* ----- CỘT TRÁI: NỘI DUNG VĂN BẢN ----- */}
        {/* flex-1 để chiếm không gian, space-y-6 tạo khoảng cách đều giữa các phần tử con */}
        <div className="flex-1 flex flex-col items-start space-y-6 text-center md:text-left">
          
          {/* Tagline Badge - Sử dụng component Badge của Shadcn */}
          <Badge variant="secondary" className="rounded-full bg-gray-100 text-gray-600 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
            AI-Powered Learning Assistant
          </Badge>

          {/* Tiêu đề chính (H1) - Chữ lớn, đậm. Dùng span để tô màu tím cho phần nhấn mạnh */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Master Any Subject with{' '}
            <span className="text-purple-600 block md:inline">Personalized AI Quizzes</span>
          </h1>

          {/* Đoạn văn mô tả */}
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed mx-auto md:mx-0">
            Upload your study materials and let our advanced AI generate tailored quizzes to boost your learning efficiency and retention.
          </p>

          {/* Các nút CTA bên dưới text */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4 justify-center md:justify-start">
            {/* Nút chính */}
            <Button className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-8 text-base font-semibold">
              Try for free
            </Button>
            
            {/* Nút phụ có icon - variant="outline" để có viền */}
            <Button variant="outline" className="h-12 px-8 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-x-2">
              <PlayCircle className="w-5 h-5" /> {/* Icon Play từ Lucide */}
              Watch demo
            </Button>
          </div>
        </div>


        {/* ----- CỘT PHẢI: HÌNH ẢNH MINH HỌA ----- */}
        <div className="flex-1 relative w-full flex justify-center md:justify-end">
          
          {/* Hiệu ứng nền gradient mờ (Blur effect) phía sau ảnh */}
          {/* absolute để tách khỏi luồng chính, -z-10 để nằm dưới ảnh, blur-3xl để làm mờ */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-purple-200 to-pink-200 opacity-50 blur-3xl rounded-full -z-10"></div>

          {/* Hình ảnh Mockup */}
          {/* Em cần thay đổi đường dẫn 'src' tới file ảnh thực tế trong dự án của em */}
          <img
            src="/assets/hero-mockup-image.png"  // <-- THAY ĐƯỜNG DẪN ẢNH CỦA EM VÀO ĐÂY
            alt="QuizMate AI App Interface Mockup"
            // object-contain để ảnh không bị méo, drop-shadow để tạo chiều sâu
            className="relative z-10 w-full max-w-lg h-auto object-contain drop-shadow-2xl rounded-3xl"
          />
        </div>
      </main>
    </div>
    
  );
};

export default HeroSection;