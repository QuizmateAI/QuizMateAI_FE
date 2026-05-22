import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Award,
  Download,
  Moon,
  Sun,
  LogIn,
  ChevronRight,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { unwrapApiData } from '@/utils/apiResponse';
import {
  getShowcasePreview,
  downloadShowcaseMaterial,
  startShowcaseQuizTrial
} from '@/api/GroupShowcaseAPI';

export default function GroupShowcasePreviewPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useToast();

  const [workspace, setWorkspace] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('QUIZ'); // 'QUIZ' or 'MATERIAL'
  const [downloadingId, setDownloadingId] = useState(null);
  const [startingQuizId, setStartingQuizId] = useState(null);

  // Theme support
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Load showcase public data
  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        const res = await getShowcasePreview(workspaceId);
        const data = unwrapApiData(res);
        if (data) {
          setWorkspace(data.workspace || null);
          const itemList = data.showcaseItems || data.items || [];
          setItems(itemList.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
        }
      } catch (err) {
        console.error(err);
        showError('Không thể tải thông tin Showcase. Liên kết có thể không hợp lệ hoặc không công khai.');
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) {
      loadPreview();
    }
  }, [workspaceId, showError]);

  // SEO updates
  useEffect(() => {
    if (workspace?.name) {
      document.title = `${workspace.name} - QuizMate AI Showcase`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', workspace.description || `Xem các tài liệu và bài thi trắc nghiệm học thử từ nhóm ${workspace.name}.`);
      }
    }
  }, [workspace]);

  // Download material helper
  const handleDownload = async (material) => {
    try {
      setDownloadingId(material.id);
      showInfo('Đang chuẩn bị tải tài liệu...');
      const res = await downloadShowcaseMaterial(workspaceId, material.id);
      const data = unwrapApiData(res);
      const downloadUrl = data?.downloadUrl || data;

      if (!downloadUrl) {
        throw new Error('Link tải không khả dụng');
      }

      // Trigger browser download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', material.name || 'document');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('Tải tài liệu thành công!');
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 429) {
        showError('Tải tài liệu giới hạn. Vui lòng thử lại sau vài giây.');
      } else {
        showError('Tải xuống thất bại. Workspace có thể đã hết quota băng thông tải xuống.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // Start trial quiz helper
  const handleStartTrial = async (quizId) => {
    try {
      setStartingQuizId(quizId);
      showInfo('Đang khởi tạo lượt thử trắc nghiệm...');
      const res = await startShowcaseQuizTrial(workspaceId, quizId);
      const data = unwrapApiData(res);
      const attemptId = data?.attemptId || data?.id;

      if (attemptId) {
        showSuccess('Khởi tạo thành công! Bắt đầu làm bài.');
        navigate(`/group-showcase/${workspaceId}/trial/${attemptId}`);
      } else {
        showError('Không nhận được mã lượt làm bài thử.');
      }
    } catch (err) {
      console.error(err);
      showError('Không thể bắt đầu làm bài thử. Vui lòng thử lại sau.');
    } finally {
      setStartingQuizId(null);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter items by tab
  const quizItems = items.filter((i) => i.resourceType === 'QUIZ');
  const materialItems = items.filter((i) => i.resourceType === 'MATERIAL');

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
        <p className="text-sm font-semibold">Đang chuẩn bị trang Showcase...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <HelpCircle className="h-16 w-16 text-slate-400 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold mb-2">Không Tìm Thấy Showcase</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Không gian Showcase không tồn tại hoặc đã được chuyển sang chế độ riêng tư bởi Quản trị viên nhóm.
        </p>
        <Button onClick={() => navigate('/login')} className="bg-blue-600 text-white">
          Quay lại Đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/50 text-slate-900'
    }`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              QM
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              QuizMate AI
            </span>
            <Badge className="bg-blue-500/10 text-blue-500 border-none hover:bg-blue-500/20">
              Showcase
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title="Chuyển chế độ tối/sáng"
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5"
            >
              <LogIn className="h-4 w-4" />
              <span>Đăng nhập</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-slate-200 dark:border-slate-900 bg-slate-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-purple-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-6">
          {workspace.avatarUrl ? (
            <img
              src={workspace.avatarUrl}
              alt={workspace.name}
              className="h-20 w-20 rounded-2xl mx-auto object-cover border-4 border-white/20 shadow-xl"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold mx-auto border-4 border-white/20 shadow-xl">
              {workspace.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {workspace.name}
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto font-medium">
              {workspace.description || 'Chào mừng bạn đến với Không gian học tập công khai.'}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <span className="block text-xl font-bold">{quizItems.length}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bài thi thử</span>
            </div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <span className="block text-xl font-bold">{materialItems.length}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tài liệu học</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabbed Grid */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        {/* Showcase tab switches */}
        <div className="flex justify-center mb-8">
          <div className={`p-1 rounded-2xl border flex gap-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('QUIZ')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
                activeTab === 'QUIZ'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Bài trắc nghiệm học thử</span>
            </button>
            <button
              onClick={() => setActiveTab('MATERIAL')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
                activeTab === 'MATERIAL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Tài liệu chia sẻ</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === 'QUIZ' ? (
          quizItems.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">Chưa có bài thi thử trắc nghiệm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizItems.map((item) => {
                const quiz = item.quiz || {};
                const qCount = quiz.questionCount || quiz.questions?.length || 0;
                const isStarting = startingQuizId === quiz.id;

                return (
                  <Card 
                    key={item.id}
                    className={`group border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                      isDark 
                        ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' 
                        : 'bg-white border-slate-200 hover:shadow-blue-500/5'
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold line-clamp-1">
                            {quiz.title || 'Bài trắc nghiệm học thử'}
                          </CardTitle>
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/15">
                            {qCount} câu hỏi
                          </Badge>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className={`text-xs italic min-h-[32px] line-clamp-2 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.headline || 'Bấm vào để làm bài trắc nghiệm thử sức ngay.'}
                      </p>

                      <Button
                        onClick={() => handleStartTrial(quiz.id)}
                        disabled={isStarting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 rounded-xl shadow-md shadow-blue-500/10"
                      >
                        {isStarting ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Đang khởi tạo...</span>
                          </>
                        ) : (
                          <>
                            <span>Làm thử ngay</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          materialItems.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">Chưa có tài liệu học tập được chia sẻ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {materialItems.map((item) => {
                const mat = item.material || {};
                const sizeStr = formatBytes(mat.size || mat.fileSize);
                const format = (mat.format || mat.fileType || 'PDF').toUpperCase();
                const isDownloading = downloadingId === mat.id;

                return (
                  <Card 
                    key={item.id}
                    className={`border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                      isDark 
                        ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' 
                        : 'bg-white border-slate-200 hover:shadow-emerald-500/5'
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 min-w-0">
                          <CardTitle className="text-base font-bold truncate">
                            {mat.name || mat.title || 'Tài liệu học tập'}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">
                              {format}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Dung lượng: {sizeStr}
                            </span>
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className={`text-xs italic min-h-[32px] line-clamp-2 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.headline || 'Tải file tài liệu về thiết bị để tự học ôn tập.'}
                      </p>

                      <Button
                        onClick={() => handleDownload(mat)}
                        disabled={isDownloading}
                        variant="outline"
                        className={`w-full flex items-center justify-center gap-1.5 rounded-xl border ${
                          isDark 
                            ? 'border-slate-800 hover:bg-slate-950 text-slate-300' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                            <span>Đang tải xuống...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Tải xuống</span>
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Premium Footer */}
      <footer className={`border-t py-8 text-center text-xs mt-auto ${
        isDark ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-white text-slate-400 shadow-inner'
      }`}>
        <p className="font-semibold text-slate-500 dark:text-slate-400 mb-1">
          Hệ thống trắc nghiệm học tập thông minh &copy; {new Date().getFullYear()} QuizMate AI.
        </p>
        <p>Phát triển bởi đội ngũ kỹ sư chất lượng cao. Bảo lưu mọi quyền.</p>
      </footer>
    </div>
  );
}
