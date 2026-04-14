import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, BookOpen, BrainCircuit, Lightbulb, GraduationCap, Target, Rocket, Cpu, Atom, Globe } from "lucide-react";

const ICONS = [Sparkles, BookOpen, BrainCircuit, Lightbulb, GraduationCap, Target, Rocket, Cpu, Atom, Globe];

function WelcomePanel({ isDarkMode, fontClass }) {
  const { t } = useTranslation();

  // Generate stable random items to prevent re-rendering flicker
  const rainDrops = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const Icon = ICONS[i % ICONS.length];
      const left = 10 + Math.random() * 120; // 10% to 130% so they can drift left across the screen
      const delay = Math.random() * -20; // negative delay so some are already on screen
      const duration = 15 + Math.random() * 20; // 15s to 35s
      const size = 24 + Math.random() * 36; // 24px to 60px
      return { id: i, Icon, left, delay, duration, size };
    });
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8 bg-white dark:bg-slate-950 overflow-hidden">
      {/* Define diagonal rain keyframe */}
      <style>{`
        @keyframes diagonal-rain {
          0% { transform: translate(0, -100px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.85; }
          80% { opacity: 0.85; }
          100% { transform: translate(-40vw, 120vh) rotate(360deg); opacity: 0; }
        }
        .rain-icon {
          position: absolute;
          animation-name: diagonal-rain;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Background Animated Rain */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {rainDrops.map((drop) => (
          <drop.Icon
            key={drop.id}
            size={drop.size}
            className={`rain-icon ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`}
            style={{
              left: `${drop.left}%`,
              top: '-10%',
              animationDuration: `${drop.duration}s`,
              animationDelay: `${drop.delay}s`,
            }}
            strokeWidth={2.2}
          />
        ))}
      </div>

      {/* Foreground UI - Clean & Artistic */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl text-center">
        {/* Sleek Minimalist Icon Cluster */}
        <div className="mb-10 relative flex items-center justify-center group cursor-default">
          <div className="absolute inset-0 bg-blue-100/60 dark:bg-blue-900/30 rounded-[2.5rem] rotate-6 scale-110 transition-transform duration-700 group-hover:rotate-12" />
          <div className="absolute inset-0 bg-indigo-100/60 dark:bg-indigo-900/30 rounded-[2.5rem] -rotate-6 scale-110 transition-transform duration-700 group-hover:-rotate-12" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm z-10 transition-transform duration-500 group-hover:scale-105">
            <Rocket className="h-12 w-12 text-blue-600 dark:text-blue-400 group-hover:-translate-y-1 transition-transform duration-300" strokeWidth={1.5} />
          </div>
        </div>

        {/* Typography */}
        <h2 className={`text-[47px] font-extrabold mb-6 tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
          {t("workspace.shell.workspaceWelcomeTitle", "Không Gian Học Tập Đỉnh Cao")}
        </h2>
        <p className={`text-[20px] leading-relaxed mb-14 max-w-xl mx-auto ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
          {t(
            "workspace.shell.workspaceWelcomeDesc",
            "Mở ra chân trời tri thức với sức mạnh từ AI. Chọn ngay một công cụ trên thanh điều hướng để khởi tạo tài liệu, thiết kế lộ trình, hoặc ôn luyện thần tốc."
          )}
        </p>        
      </div>
    </div>
  );
}

export default WelcomePanel;