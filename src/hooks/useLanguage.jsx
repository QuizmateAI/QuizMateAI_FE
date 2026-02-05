import React, { createContext, useContext, useState, useEffect } from 'react';

// Tạo Context để quản lý ngôn ngữ toàn cục
const LanguageContext = createContext();

// Translations cho toàn bộ ứng dụng
export const translations = {
  en: {
    // Sidebar
    dashboard: 'Dashboard',
    users: 'Users',
    moderation: 'Moderation',
    aiSettings: 'AI Settings',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',

    // Dashboard
    systemOverview: 'System Overview',
    welcomeBack: 'Welcome back, here is what is happening today.',
    totalUsers: 'Total Users',
    monthlyRevenue: 'Monthly Revenue',
    aiTokensUsed: 'AI Tokens Used',
    violationReports: 'Violation Reports',
    comparedToLastMonth: '+12% compared to last month',
    userGrowthChart: '[User Growth Chart - Shadcn Chart]',
    newUsersList: '[Newly Registered Users List]',

    // Header
    systemTitle: 'QuizMate AI System',
    version: 'Version 2026.1.0',

    // Authentication - Login
    login: 'Login',
    loginSubtitle: 'Login to access your QuizMate account',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password',
    loginButton: 'Login',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    orLoginWith: 'Or login with',
    backToHome: 'Back to Home',

    // Authentication - Register
    signUpTitle: 'Sign up',
    signUpSubtitle: "Let's get you all set up so you can access your personal account.",
    firstName: 'First Name',
    lastName: 'Last Name',
    confirmPassword: 'Confirm Password',
    agreeToTerms: 'I agree to all the',
    terms: 'Terms',
    and: 'and',
    privacyPolicies: 'Privacy Policies',
    createAccount: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    orRegisterWith: 'Or register with',
    cancel: 'Cancel',

    // Authentication - Forgot Password
    forgotPasswordTitle: 'Forgot your password?',
    forgotPasswordSubtitle: "Don't worry, happens to all of us. Enter your email below to recover your password",
    backToLogin: 'Back to login',
    submit: 'Submit',
    processing: 'Processing...',

    // Landing Page
    landingPage: {
      nav: {
        features: 'Features',
        solutions: 'Solutions',
        pricing: 'Pricing',
        login: 'Login',
        signup: 'Sign up free'
      },
      hero: {
        badge: '✨ AI-Powered Learning Innovation',
        titlePart1: 'Master Any Subject with',
        titlePart2: 'QuizMate AI',
        subtitle: 'Upload your study materials (PDFs, Videos, or URLs) and let our AI build personalized roadmaps and interactive quizzes.',
        startLearning: 'Start Learning Now',
        watchDemo: 'Watch Demo',
        activeStudents: 'Active Students'
      },
      features: {
        title: 'Revolutionize Your Learning Journey',
        roadmapTitle: 'AI Roadmap',
        roadmapDesc: 'Our AI analyzes your materials and generates a step-by-step learning path from basics to advanced.',
        quizTitle: 'Smart Quizzes',
        quizDesc: 'Generate multiple-choice or essay questions instantly from any PDF, YouTube video, or website link.',
        companionTitle: 'AI Companion',
        companionDesc: 'Interact with your AI tutor via voice to clear doubts and explain complex concepts in real-time.'
      },
      pricing: {
        titlePart1: 'Choose',
        titlePart2: 'Your Plan',
        subtitle: 'Flexible pricing for every learner',
        free: 'Free',
        pro: 'Professional',
        elite: 'Elite',
        billedMonthly: 'Billed Monthly',
        mostPopular: 'MOST POPULAR',
        getStarted: 'Get Started',
        selectPro: 'Select Pro Plan',
        features: {
           fiveRoadmaps: '5 AI Roadmaps / month',
           basicQuizzes: 'Basic AI Quizzes',
           voiceTutor: 'Voice AI Tutor',
           unlimitedRoadmaps: 'Unlimited AI Roadmaps',
           advancedVoice: 'Advanced Voice Companion',
           urlVideo: 'URL & Video Processing',
           everythingPro: 'Everything in Pro',
           studyGroup: 'Study Group (5 Users)',
           apiAccess: 'API Access for Devs'
        }
      },
      testimonials: {
        title: 'What our students are saying 😍',
        student1Quote: '"QuizMate AI completely changed how I prepare for my exams. Generating quizzes from lecture videos is a game changer!"',
        student1Role: 'Medical Student',
        student2Quote: '"The AI Roadmap is incredible. It broke down my 200-page textbook into 10 logical learning phases. Highly recommend!"',
        student2Role: 'Computer Science Major'
      },
      footer: {
        brandDesc: 'Empowering students worldwide with AI-driven study tools for a smarter future.',
        product: 'Product',
        productLinks: {
          roadmap: 'AI Roadmap',
          quizzes: 'Smart Quizzes',
          groups: 'Study Groups'
        },
        company: 'Company',
        companyLinks: {
          about: 'About Our AI',
          privacy: 'Privacy Policy',
          terms: 'Terms of Service'
        },
        connect: 'Connect',
        copyright: '© 2026 QuizMate AI. Built with intelligence for learners.'
      }
    },
  },
  vi: {
    // Sidebar
    dashboard: 'Dashboard',
    users: 'Người dùng',
    moderation: 'Kiểm duyệt',
    aiSettings: 'Cấu hình AI',
    billing: 'Doanh thu',
    settings: 'Cài đặt',
    logout: 'Đăng xuất',

    // Dashboard
    systemOverview: 'Tổng quan hệ thống',
    welcomeBack: 'Chào mừng trở lại, đây là những gì đang diễn ra hôm nay.',
    totalUsers: 'Tổng người dùng',
    monthlyRevenue: 'Doanh thu tháng',
    aiTokensUsed: 'AI Tokens đã dùng',
    violationReports: 'Báo cáo vi phạm',
    comparedToLastMonth: '+12% so với tháng trước',
    userGrowthChart: '[Biểu đồ tăng trưởng người dùng - Shadcn Chart]',
    newUsersList: '[Danh sách người dùng mới đăng ký]',

    // Header
    systemTitle: 'Hệ thống QuizMate AI',
    version: 'Phiên bản 2026.1.0',

    // Authentication - Login
    login: 'Đăng nhập',
    loginSubtitle: 'Đăng nhập để truy cập tài khoản QuizMate của bạn',
    email: 'Email',
    password: 'Mật khẩu',
    rememberMe: 'Ghi nhớ đăng nhập',
    forgotPassword: 'Quên mật khẩu',
    loginButton: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',
    orLoginWith: 'Hoặc đăng nhập với',
    backToHome: 'Về trang chủ',

    // Authentication - Register
    signUpTitle: 'Đăng ký',
    signUpSubtitle: 'Hãy thiết lập để bạn có thể truy cập tài khoản cá nhân của mình.',
    firstName: 'Tên',
    lastName: 'Họ',
    confirmPassword: 'Xác nhận mật khẩu',
    agreeToTerms: 'Tôi đồng ý với tất cả',
    terms: 'Điều khoản',
    and: 'và',
    privacyPolicies: 'Chính sách bảo mật',
    createAccount: 'Tạo tài khoản',
    alreadyHaveAccount: 'Đã có tài khoản?',
    orRegisterWith: 'Hoặc đăng ký với',
    cancel: 'Hủy',

    // Authentication - Forgot Password
    forgotPasswordTitle: 'Quên mật khẩu?',
    forgotPasswordSubtitle: 'Đừng lo, ai cũng có lúc quên. Nhập email của bạn để khôi phục mật khẩu',
    backToLogin: 'Quay lại đăng nhập',
    submit: 'Gửi',
    processing: 'Đang xử lý...',

    // Landing Page
    landingPage: {
      nav: {
        features: 'Tính năng',
        solutions: 'Giải pháp',
        pricing: 'Bảng giá',
        login: 'Đăng nhập',
        signup: 'Đăng ký'
      },
      hero: {
        badge: '✨ Đột phá học tập cùng AI',
        titlePart1: 'Chinh phục mọi kiến thức cùng',
        titlePart2: 'QuizMate AI',
        subtitle: 'Tải lên tài liệu học tập (PDF, Video, hoặc URL) và để AI xây dựng lộ trình cá nhân hóa cùng bộ câu hỏi tương tác.',
        startLearning: 'Bắt đầu học ngay',
        watchDemo: 'Xem Demo',
        activeStudents: 'Học viên tích cực'
      },
      features: {
        title: 'Cách mạng hóa hành trình học tập',
        roadmapTitle: 'Lộ trình AI',
        roadmapDesc: 'AI phân tích tài liệu và tạo lộ trình học tập từng bước từ cơ bản đến nâng cao.',
        quizTitle: 'Trắc nghiệm thông minh',
        quizDesc: 'Tạo câu hỏi trắc nghiệm hoặc tự luận tức thì từ bất kỳ file PDF, video YouTube hay đường link website nào.',
        companionTitle: 'Trợ lý AI',
        companionDesc: 'Tương tác với gia sư AI qua giọng nói để giải đáp thắc mắc và giải thích các khái niệm phức tạp theo thời gian thực.'
      },
      pricing: {
        titlePart1: 'Chọn',
        titlePart2: 'Gói của bạn',
        subtitle: 'Chi phí linh hoạt cho mọi người học',
        free: 'Miễn phí',
        pro: 'Chuyên nghiệp',
        elite: 'Cao cấp',
        billedMonthly: 'Thanh toán hàng tháng',
        mostPopular: 'PHỔ BIẾN NHẤT',
        getStarted: 'Bắt đầu ngay',
        selectPro: 'Chọn gói Pro',
        features: {
           fiveRoadmaps: '5 Lộ trình AI / tháng',
           basicQuizzes: 'Trắc nghiệm AI cơ bản',
           voiceTutor: 'Gia sư AI giọng nói',
           unlimitedRoadmaps: 'Lộ trình AI không giới hạn',
           advancedVoice: 'Trợ lý giọng nói nâng cao',
           urlVideo: 'Xử lý URL & Video',
           everythingPro: 'Bao gồm tất cả của Pro',
           studyGroup: 'Nhóm học tập (5 người)',
           apiAccess: 'Quyền truy cập API cho Dev'
        }
      },
      testimonials: {
        title: 'Học viên nói gì về chúng tôi 😍',
        student1Quote: '"QuizMate AI đã thay đổi hoàn toàn cách tôi ôn thi. Việc tạo câu hỏi từ video bài giảng đúng là thay đổi cuộc chơi!"',
        student1Role: 'Sinh viên Y khoa',
        student2Quote: '"Lộ trình AI thật sự đáng kinh ngạc. Nó chia nhỏ cuốn giáo trình 200 trang của tôi thành 10 giai đoạn học logic. Cực kỳ đề xuất!"',
        student2Role: 'Sinh viên Khoa học máy tính'
      },
      footer: {
        brandDesc: 'Trao quyền cho học sinh toàn cầu với các công cụ học tập AI cho một tương lai thông minh hơn.',
        product: 'Sản phẩm',
        productLinks: {
          roadmap: 'Lộ trình AI',
          quizzes: 'Trắc nghiệm thông minh',
          groups: 'Nhóm học tập'
        },
        company: 'Công ty',
        companyLinks: {
          about: 'Về AI của chúng tôi',
          privacy: 'Chính sách bảo mật',
          terms: 'Điều khoản dịch vụ'
        },
        connect: 'Kết nối',
        copyright: '© 2026 QuizMate AI. Xây dựng bằng trí tuệ dành cho người học.'
      }
    }
  }
};

export function LanguageProvider({ children }) {
  // Lấy ngôn ngữ từ localStorage hoặc mặc định là tiếng Việt
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'vi';
  });

  // Lưu ngôn ngữ vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // Hàm chuyển đổi ngôn ngữ
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'vi' ? 'en' : 'vi');
  };

  // Hàm lấy text theo key
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value) value = value[k];
    }
    return value || key;
  };

  // Class font dựa trên ngôn ngữ (Poppins cho EN, sans cho VI)
  const fontClass = language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, fontClass }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook để sử dụng Language Context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
