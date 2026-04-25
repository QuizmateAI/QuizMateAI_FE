import React from 'react';
import { Check, Zap, Users } from 'lucide-react';
import HeroLogo from '@/assets/QuizmateAI_PIC.png';

function QuizOption({ label, correct = false }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${
        correct
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-900/30 dark:text-emerald-200'
          : 'border-slate-200 bg-white text-slate-500 font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {correct && <Check className="w-3 h-3 text-emerald-500" />}
      {label}
    </div>
  );
}

function FloatingQuizCard({ children, style, delay = '0s', active = false, className = '', rotation = '0deg' }) {
  return (
    <div
      className={`absolute bg-white dark:bg-slate-900 p-3.5 min-w-[180px] ${className}`}
      style={{
        boxShadow: active
          ? '0 20px 40px -12px rgba(15,23,42,.34), 0 0 0 2px rgba(250,204,21,.72)'
          : '0 16px 30px -16px rgba(15,23,42,.4)',
        transform: `rotate(${rotation})`,
        animation: `qm-fade-up .5s ease-out ${delay} both, qm-float-slow 6s ease-in-out ${delay} infinite`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FlashcardStack({ t, style, delay = '0s', rotation = '0deg' }) {
  return (
    <div
      className="absolute h-[152px] w-[196px]"
      style={{
        transform: `rotate(${rotation})`,
        animation: `qm-fade-up .55s ease-out ${delay} both, qm-float-slow 7.5s ease-in-out ${delay} infinite`,
        ...style,
      }}
    >
      <div className="absolute inset-x-4 top-4 bottom-0 rounded-[26px] bg-white/16 backdrop-blur-md" />
      <div className="absolute inset-x-2 top-2 bottom-4 rounded-[26px] bg-white/24" />
      <div className="absolute inset-0 rounded-[26px] bg-white px-4 py-3.5 shadow-[0_22px_40px_-20px_rgba(15,23,42,.45)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0455BF]">
          {t('loginPage.heroFlashcardLabel', 'Flashcard')}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#0455BF]">
            {t('loginPage.heroFlashcardFrontLabel', 'Mặt trước')}
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-3 text-[15px] font-black leading-tight text-slate-900">
          {t('loginPage.heroFlashcardFrontText', 'Định lý Pitago')}
        </div>
        <div className="mt-3 rounded-[18px] bg-slate-50 px-3 py-2.5">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {t('loginPage.heroFlashcardBackLabel', 'Mặt sau')}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-slate-700">
            {t('loginPage.heroFlashcardBackText', 'a² + b² = c²')}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewDeckCard({ t, style, delay = '0s', rotation = '0deg' }) {
  return (
    <div
      className="absolute w-[188px] rounded-[22px] rounded-tr-[16px] rounded-bl-[16px] bg-white px-4 py-3.5 shadow-[0_22px_40px_-22px_rgba(15,23,42,.45)]"
      style={{
        transform: `rotate(${rotation})`,
        animation: `qm-fade-up .55s ease-out ${delay} both, qm-float-slow 7s ease-in-out ${delay} infinite`,
        ...style,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0455BF]">
        {t('loginPage.heroDeckLabel', 'Ôn nhanh')}
      </div>
      <div className="mt-2 text-[14px] font-black leading-tight text-slate-900">
        {t('loginPage.heroDeckTitle', '3 thẻ cần ôn lại')}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#0455BF]">
          {t('loginPage.heroDeckChipMath', 'Toán')}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          {t('loginPage.heroDeckChipEnglish', 'Anh')}
        </span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
          {t('loginPage.heroDeckChipPhysics', 'Lý')}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>{t('loginPage.heroDeckFooter', 'Sẵn sàng cho buổi học tiếp theo')}</span>
        <span className="font-bold text-[#0455BF]">12/15</span>
      </div>
    </div>
  );
}

export default function DiagonalHeroPanel({ t }) {
  return (
    <div
      className="hidden md:block flex-1 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0455BF 0%, #2563EB 60%, #3b82f6 100%)',
        clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)',
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(250,204,21,.35), transparent 70%)',
          animation: 'qm-mesh 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-20 left-10 w-[260px] h-[260px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,134,130,.3), transparent 70%)',
          animation: 'qm-mesh 15s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.15) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(180deg, transparent, #000 40%, #000 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 40%, #000 70%, transparent)',
        }}
      />
      <div
        className="absolute left-[10%] top-[22%] h-[240px] w-[240px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,.14) 0%, rgba(255,255,255,.05) 38%, transparent 72%)' }}
      />
      <div
        className="absolute left-[18%] top-[47%] h-[180px] w-[180px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,.1) 0%, rgba(99,179,255,.06) 34%, transparent 74%)' }}
      />
      <div
        className="absolute left-[24%] bottom-[8%] h-[220px] w-[220px] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(147,197,253,.16) 0%, rgba(96,165,250,.07) 35%, transparent 72%)' }}
      />
      <FlashcardStack
        t={t}
        delay=".15s"
        rotation="-9deg"
        style={{ left: '12%', top: '28%' }}
      />
      <ReviewDeckCard
        t={t}
        delay=".4s"
        rotation="7deg"
        style={{ left: '21%', top: '57%' }}
      />
      <div
        className="absolute top-9 right-10 flex items-start gap-3"
        style={{ animation: 'qm-fade-up .6s ease-out' }}
      >
        <div className="bg-white rounded-[18px] rounded-bl-[12px] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_14px_28px_-14px_rgba(15,23,42,.45)]">
          {t('loginPage.heroGreeting', 'Xin chào!')}{' '}
          <span
            className="inline-block"
            style={{ animation: 'qm-wave 2s ease-in-out infinite', transformOrigin: '70% 80%' }}
          >
            👋
          </span>
        </div>
        <div className="h-[72px] w-[72px] overflow-hidden rounded-full shadow-[0_16px_28px_-16px_rgba(15,23,42,.55)]">
          <img
            src={HeroLogo}
            alt={t('loginPage.logoAlt', 'QuizMate AI Logo')}
            className="h-full w-full scale-[1.14] object-cover object-top"
          />
        </div>
      </div>

      <FloatingQuizCard
        style={{ top: 170, right: 90 }}
        delay="0s"
        active
        rotation="-5deg"
        className="rounded-[22px] rounded-tr-[16px] rounded-bl-[18px]"
      >
        <div className="text-[10px] text-[#0455BF] dark:text-blue-400 font-bold uppercase tracking-wider">
          {t('loginPage.heroQuestionProgress', 'Câu hỏi 3/10')}
        </div>
        <div className="text-[13px] font-bold text-slate-900 dark:text-white my-1.5 leading-tight">
          {t('loginPage.heroQuestionText', 'Thủ đô của Việt Nam là?')}
        </div>
        <div className="flex flex-col gap-1.5">
          <QuizOption label={t('loginPage.heroOptionHanoi', 'Hà Nội')} correct />
          <QuizOption label={t('loginPage.heroOptionHcm', 'TP.HCM')} />
          <QuizOption label={t('loginPage.heroOptionDanang', 'Đà Nẵng')} />
        </div>
      </FloatingQuizCard>

      <FloatingQuizCard
        style={{ top: 395, right: 180 }}
        delay=".3s"
        rotation="4deg"
        className="rounded-[20px] rounded-tr-[14px] rounded-bl-[14px]"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-900 dark:text-white">{t('loginPage.heroStreakTitle', 'Streak 7 ngày')}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('loginPage.heroStreakSubtitle', '+50 XP hôm nay')}</div>
          </div>
        </div>
        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
              animation: 'qm-progress 1.5s ease-out .5s both',
            }}
          />
        </div>
      </FloatingQuizCard>

      <FloatingQuizCard
        style={{ top: 560, right: 60 }}
        delay=".5s"
        rotation="-3deg"
        className="rounded-[20px] rounded-tl-[14px] rounded-br-[16px]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[#0455BF] dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            <div className="text-[13px] font-bold text-slate-900 dark:text-white">{t('loginPage.heroOnlineCount', '15,432 học sinh')}</div>
            {t('loginPage.heroOnlineNow', 'Đã trải nghiệm Quizmate AI')}
          </div>
        </div>
      </FloatingQuizCard>
    </div>
  );
}
