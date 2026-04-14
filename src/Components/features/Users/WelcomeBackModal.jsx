import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Heart,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent } from "@/Components/ui/dialog";

function pickGreetingByDays(daysInactive) {
  if (daysInactive >= 30) {
    return {
      emoji: "✨",
      tagline: "Chúng tôi đã nhớ bạn rất nhiều!",
      tone: "long",
    };
  }
  if (daysInactive >= 14) {
    return {
      emoji: "🌟",
      tagline: "Mừng bạn quay lại!",
      tone: "mid",
    };
  }
  return {
    emoji: "👋",
    tagline: "Chào mừng bạn trở lại!",
    tone: "short",
  };
}

function buildLongCopy(daysInactive) {
  if (daysInactive >= 30) {
    return "Hơn một tháng rồi không gặp bạn. Không biết QuizMate AI đã làm bạn hài lòng chưa, hay bạn đang bận với chuyện khác? Dù sao, chúng tôi vẫn ở đây chờ bạn.";
  }
  if (daysInactive >= 14) {
    return "Đã khá lâu rồi bạn chưa ghé thăm. Kiến thức sẽ rơi rớt nếu không ôn lại — nhưng đừng lo, chúng ta sẽ nối lại mạch học của bạn ngay bây giờ.";
  }
  return "Bạn đã đi đâu cả tuần rồi? Lộ trình của bạn đang chờ tiếp tục đấy.";
}

export default function WelcomeBackModal({
  open,
  onOpenChange,
  isDarkMode = false,
  info,
}) {
  const navigate = useNavigate();

  const daysInactive = Number(info?.daysInactive ?? 0);
  const greeting = useMemo(() => pickGreetingByDays(daysInactive), [daysInactive]);
  const longCopy = useMemo(() => buildLongCopy(daysInactive), [daysInactive]);

  const userName = info?.userName || "bạn";
  const hasResume = Boolean(info?.knowledgeTitle && info?.resumeUrl);
  const hasRoadmap = Boolean(info?.roadmapTitle);

  const handleResume = () => {
    onOpenChange(false);
    if (info?.resumeUrl) {
      navigate(info.resumeUrl);
    }
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-md rounded-2xl border p-0 overflow-hidden font-sans ${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-slate-50"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div
          className={`relative px-7 pt-8 pb-6 ${
            isDarkMode
              ? "bg-gradient-to-br from-violet-900/60 via-indigo-900/40 to-slate-900"
              : "bg-gradient-to-br from-violet-50 via-indigo-50 to-white"
          }`}
        >
          <div className="absolute top-4 right-4 opacity-60">
            <Sparkles
              className={`w-5 h-5 ${
                isDarkMode ? "text-violet-300" : "text-violet-500"
              }`}
            />
          </div>
          <div className="text-center">
            <div className="text-5xl mb-3 leading-none" aria-hidden>
              {greeting.emoji}
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {greeting.tagline}
            </h2>
            <p
              className={`mt-1 text-sm font-medium ${
                isDarkMode ? "text-violet-200" : "text-violet-600"
              }`}
            >
              {userName}, đã{" "}
              <span className="font-bold">{daysInactive} ngày</span> bạn chưa
              ghé thăm.
            </p>
          </div>
        </div>

        <div className="px-7 py-6 space-y-5">
          <p
            className={`text-sm leading-relaxed ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {longCopy}
          </p>

          {hasResume ? (
            <div
              className={`rounded-xl border p-4 ${
                isDarkMode
                  ? "bg-slate-950/60 border-violet-900/50"
                  : "bg-violet-50/60 border-violet-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-violet-100 text-violet-600"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isDarkMode ? "text-violet-300" : "text-violet-600"
                    }`}
                  >
                    Trước khi bạn nghỉ, bạn đang học
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug line-clamp-2">
                    {info.knowledgeTitle}
                  </p>
                  {hasRoadmap ? (
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      trong lộ trình{" "}
                      <span className="font-medium">{info.roadmapTitle}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                className={`mt-3 flex items-center gap-2 text-xs leading-relaxed ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <Brain className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Chúng tôi có thể gợi ý một bài quiz ngắn để bạn kiểm tra kiến
                  thức còn đọng lại. Bạn muốn thử không?
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-xl border p-4 ${
                isDarkMode
                  ? "bg-slate-950/60 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  <Heart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">
                    QuizMate AI có làm bạn hài lòng không?
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Hãy thử tạo một lộ trình học mới — chúng tôi đã cá nhân hóa
                    trải nghiệm tốt hơn nhiều so với lần trước bạn ghé.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {hasResume ? (
              <button
                type="button"
                onClick={handleResume}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  isDarkMode
                    ? "bg-violet-500 hover:bg-violet-400 text-white"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Tiếp tục và ôn lại kiến thức
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {hasResume ? "Để sau" : "Tiếp tục khám phá trang chủ"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
