import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  FileText,
  GraduationCap,
  Map,
  Mic,
  ShieldCheck,
  Sparkles,
  University,
  UserSquare2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoLight from '@/assets/LightMode_Logo.webp';
import { getEarlyAccessHref, getLaunchDate, launchConfig } from '@/lib/launchConfig';

const audiences = [
  { label: 'Teachers', icon: UserSquare2 },
  { label: 'High Schools', icon: GraduationCap },
  { label: 'Universities', icon: University },
  { label: 'Training Centers', icon: Building2 },
  { label: 'Academic Teams', icon: FileText },
];

const launchSignals = [
  {
    title: 'AI Quiz Studio',
    description: 'Generate structured assessments from lessons, slides, and PDFs.',
    icon: Sparkles,
    tone: 'lime',
    value: 'Ready',
  },
  {
    title: 'Secure Exam Room',
    description: 'Focused test experience with stricter control before public traffic.',
    icon: ShieldCheck,
    tone: 'blue',
    value: 'Locked',
  },
  {
    title: 'Learning Roadmaps',
    description: 'Connect quizzes, study notes, and revision paths into one flow.',
    icon: Map,
    tone: 'white',
    value: 'Mapped',
  },
];

const privateLaunchReasons = [
  {
    title: 'Quality First',
    description: 'The first cohort stays small so quiz generation, scoring logic, and study flows can be tuned with real educator feedback.',
    icon: BrainCircuit,
  },
  {
    title: 'Safer Rollout',
    description: 'Access is restricted while exam security, navigation guardrails, and account flows are hardened before public release.',
    icon: ShieldCheck,
  },
  {
    title: 'Direct Feedback Loop',
    description: 'Early users influence what ships first, from AI quiz outputs to revision notes and analytics priorities.',
    icon: Mic,
  },
];

const releaseStack = [
  {
    title: 'Assessment Builder',
    description: 'AI quiz creation, question banks, and multi-format source intake.',
    icon: Sparkles,
    size: 'large',
  },
  {
    title: 'Exam Security',
    description: 'Protected assessment mode for timed evaluation flows.',
    icon: ShieldCheck,
    size: 'small',
  },
  {
    title: 'Progress Analytics',
    description: 'Performance signals for teachers, learners, and teams.',
    icon: BarChart3,
    size: 'small',
  },
  {
    title: 'Study Companion',
    description: 'Roadmaps, notes, and smarter revision support around every quiz.',
    icon: GraduationCap,
    size: 'wide',
  },
];

const buildCountdown = (launchDate) => {
  if (!launchDate) {
    return null;
  }

  const distance = Math.max(launchDate.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(distance / 1000);

  return {
    days: String(Math.floor(totalSeconds / 86400)).padStart(2, '0'),
    hours: String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
    isComplete: distance === 0,
  };
};

const CountdownCell = ({ label, value }) => (
  <div className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 text-center backdrop-blur">
    <div className="text-3xl font-black tracking-tight text-[#7dff19]">{value}</div>
    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-300">{label}</div>
  </div>
);

const AudienceChip = ({ icon: Icon, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe5f4] bg-white/88 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#17305d] shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
    <Icon className="size-3.5 text-[#67d400]" />
    <span>{label}</span>
  </div>
);

const signalToneClasses = {
  lime: 'border-[#97ef3b]/40 bg-[#7dff19]/12 text-[#7dff19]',
  blue: 'border-[#6ab4ff]/35 bg-[#4b9bff]/12 text-[#8cc7ff]',
  white: 'border-white/15 bg-white/8 text-white',
};

function LaunchingPage() {
  const launchDate = useMemo(() => getLaunchDate(), []);
  const earlyAccessHref = useMemo(() => getEarlyAccessHref(), []);
  const [countdown, setCountdown] = useState(() => buildCountdown(launchDate));

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${launchConfig.brandName} | Private Launch`;

    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!launchDate) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCountdown(buildCountdown(launchDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [launchDate]);

  const launchDateLabel = launchDate
    ? launchDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Launch date coming soon';

  const countdownItems = countdown
    ? [
        { label: 'Days', value: countdown.days },
        { label: 'Hours', value: countdown.hours },
        { label: 'Minutes', value: countdown.minutes },
        { label: 'Seconds', value: countdown.seconds },
      ]
    : [];

  const openInNewTab = !earlyAccessHref.startsWith('#');
  const contactHref = launchConfig.supportEmail ? `mailto:${launchConfig.supportEmail}` : null;

  return (
    <div
      className="min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-950"
      style={{
        fontFamily: '"Be Vietnam Pro", sans-serif',
        backgroundImage:
          'radial-gradient(circle at 12% 12%, rgba(103, 212, 0, 0.18), transparent 24%), radial-gradient(circle at 88% 16%, rgba(37, 99, 235, 0.14), transparent 22%), linear-gradient(rgba(23, 48, 93, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 48, 93, 0.05) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 54px 54px, 54px 54px',
        backgroundPosition: '0 0, 0 0, -1px -1px, -1px -1px',
      }}
    >
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className="absolute left-[-8%] top-20 h-64 w-64 rounded-full bg-[#67d400]/14 blur-3xl" />
        <div className="absolute right-[-8%] top-28 h-72 w-72 rounded-full bg-[#2563eb]/10 blur-3xl" />

        <header className="relative flex flex-col gap-4 rounded-[30px] border border-white/70 bg-white/78 px-5 py-4 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <img src={LogoLight} alt={`${launchConfig.brandName} logo`} className="h-14 w-auto object-contain sm:h-16" />
            <div>
              <p className="text-lg font-black tracking-tight text-[#17305d]">{launchConfig.brandName}</p>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Private launch sequence</p>
            </div>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[#d6e0f0] bg-[#f6faff] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#17305d]">
              Closed until {launchDateLabel}
            </div>
            <Button
              asChild
              className="h-11 rounded-full bg-[#17305d] px-5 text-xs font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgba(23,48,93,0.22)] hover:bg-[#0f2245]"
            >
              <a
                href={earlyAccessHref}
                target={openInNewTab ? '_blank' : undefined}
                rel={openInNewTab ? 'noreferrer' : undefined}
              >
                Request Early Access
              </a>
            </Button>
          </div>
        </header>

        <main className="relative mt-8 space-y-8">
          <section className="grid gap-8 xl:grid-cols-[1.05fr,0.95fr] xl:items-center">
            <div className="relative rounded-[36px] border border-white/75 bg-white/78 p-7 backdrop-blur-xl shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-9">
              <div className="inline-flex rounded-full border border-[#c8f88f] bg-[#efffd9] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#4d9a00]">
                QuizMate AI launch mode
              </div>

              <h1
                className="mt-6 max-w-3xl text-4xl font-black leading-tight text-[#17305d] sm:text-5xl xl:text-6xl"
                style={{ fontFamily: '"Merriweather", serif' }}
              >
                A launch page built for <span className="text-[#67d400]">QuizMate AI</span>, not a generic template.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                The public app is intentionally locked while QuizMate AI prepares a controlled release for teachers,
                schools, and academic teams. We are opening with a smaller first cohort to tune quiz generation,
                secure assessment flows, and study support before wider traffic.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-12 rounded-2xl bg-[#67d400] px-7 text-sm font-extrabold uppercase tracking-[0.15em] text-[#17305d] shadow-[0_18px_36px_rgba(103,212,0,0.28)] hover:bg-[#7dff19]"
                >
                  <a
                    href={earlyAccessHref}
                    target={openInNewTab ? '_blank' : undefined}
                    rel={openInNewTab ? 'noreferrer' : undefined}
                  >
                    Join The First Cohort
                    <ArrowRight className="size-4" />
                  </a>
                </Button>

                <p className="text-sm font-semibold text-slate-500">
                  Public login, home, workspace, and quiz routes stay blocked until {launchDateLabel}.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[26px] border border-[#dbe5f4] bg-[#f7fbff] p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Focus</p>
                  <p className="mt-3 text-2xl font-black text-[#17305d]">AI Quiz</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Source to assessment in a tighter, cleaner workflow.</p>
                </div>
                <div className="rounded-[26px] border border-[#dbe5f4] bg-[#f7fbff] p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Security</p>
                  <p className="mt-3 text-2xl font-black text-[#17305d]">Exam Flow</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Restricted while protected assessment behavior is tuned.</p>
                </div>
                <div className="rounded-[26px] border border-[#dbe5f4] bg-[#f7fbff] p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Support</p>
                  <p className="mt-3 text-2xl font-black text-[#17305d]">Notes + Roadmaps</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Revision tools stay aligned with each generated quiz.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {audiences.map(({ icon, label }) => (
                  <AudienceChip key={label} icon={icon} label={label} />
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-2 top-10 rounded-2xl border border-[#d9eeff] bg-white/85 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#2563eb] shadow-[0_16px_35px_rgba(37,99,235,0.12)]">
                A
              </div>
              <div className="absolute right-3 top-0 rounded-2xl border border-[#d8f8b0] bg-[#efffd9] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#4d9a00] shadow-[0_16px_35px_rgba(103,212,0,0.16)]">
                B
              </div>
              <div className="absolute bottom-6 left-4 rounded-2xl border border-[#d9eeff] bg-white/85 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#17305d] shadow-[0_16px_35px_rgba(15,23,42,0.10)]">
                C
              </div>
              <div className="absolute bottom-0 right-10 rounded-2xl border border-[#d8f8b0] bg-[#efffd9] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#4d9a00] shadow-[0_16px_35px_rgba(103,212,0,0.16)]">
                D
              </div>

              <div className="relative overflow-hidden rounded-[38px] bg-[#0f1e3c] p-6 text-white shadow-[0_28px_80px_rgba(15,30,60,0.34)] sm:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,255,25,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.22),transparent_32%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

                <div className="relative">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#8cc7ff]">Launch Console</p>
                      <h2 className="mt-2 text-2xl font-black">QuizMate AI Command Center</h2>
                    </div>
                    <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-200">
                      {countdown?.isComplete ? 'Opening now' : `Opening ${launchDateLabel}`}
                    </div>
                  </div>

                  {countdownItems.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {countdownItems.map((item) => (
                        <CountdownCell key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                  )}

                  <div className="mt-6 grid gap-4">
                    {launchSignals.map(({ title, description, icon: Icon, tone, value }) => (
                      <div
                        key={title}
                        className={`rounded-[28px] border px-5 py-5 backdrop-blur ${signalToneClasses[tone]}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-black/12 p-3">
                              <Icon className="size-5" />
                            </div>
                            <div>
                              <p className="text-lg font-black">{title}</p>
                              <p className="mt-2 max-w-md text-sm leading-7 text-slate-200/85">{description}</p>
                            </div>
                          </div>
                          <div className="rounded-full border border-current/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em]">
                            {value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-300">Current Mode</p>
                      <p className="mt-3 text-2xl font-black text-[#7dff19]">Private Beta Lock</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        Public-facing routes are intentionally redirected into launch mode.
                      </p>
                    </div>
                    <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-300">First Cohort</p>
                      <p className="mt-3 text-2xl font-black text-white">Educators + Institutions</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        Early access goes to users who can validate assessment, revision, and analytics flows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.92fr,1.08fr]">
            <div className="rounded-[34px] border border-white/80 bg-white/82 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#4d9a00]">Why Access Stays Closed</p>
                  <h2
                    className="mt-3 text-3xl font-black text-[#17305d]"
                    style={{ fontFamily: '"Merriweather", serif' }}
                  >
                    Launch with control, not with noise
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {privateLaunchReasons.map(({ title, description, icon: Icon }) => (
                  <article key={title} className="rounded-[28px] border border-[#dbe5f4] bg-[#f8fbff] p-5">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#eaf9d8] p-3 text-[#4d9a00]">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#17305d]">{title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] bg-[#17305d] p-6 text-white shadow-[0_26px_70px_rgba(23,48,93,0.24)] sm:p-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#9fd6ff]">Day-One Release Stack</p>
              <h2
                className="mt-3 text-3xl font-black"
                style={{ fontFamily: '"Merriweather", serif' }}
              >
                What opens when QuizMate AI goes live
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {releaseStack.map(({ title, description, icon: Icon, size }) => (
                  <article
                    key={title}
                    className={`rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur ${
                      size === 'large' ? 'md:row-span-2' : ''
                    } ${size === 'wide' ? 'md:col-span-2' : ''}`}
                  >
                    <div className="rounded-2xl bg-white/10 p-3 text-[#7dff19] w-fit">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-black">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-200">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="early-access" className="rounded-[38px] border border-[#d8e3f4] bg-white/85 p-7 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[1fr,auto] lg:items-end">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#4d9a00]">Early Access</p>
                <h2
                  className="mt-3 text-3xl font-black text-[#17305d] sm:text-4xl"
                  style={{ fontFamily: '"Merriweather", serif' }}
                >
                  Register before the public launch opens
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                  Join the first rollout to test QuizMate AI earlier, share feedback on assessment quality, and help
                  shape the release priorities for schools, universities, and teaching teams.
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                <Button
                  asChild
                  className="h-12 rounded-2xl bg-[#67d400] px-7 text-sm font-extrabold uppercase tracking-[0.15em] text-[#17305d] shadow-[0_18px_36px_rgba(103,212,0,0.28)] hover:bg-[#7dff19]"
                >
                  <a
                    href={earlyAccessHref}
                    target={openInNewTab ? '_blank' : undefined}
                    rel={openInNewTab ? 'noreferrer' : undefined}
                  >
                    Register As Early Tester
                  </a>
                </Button>

                {contactHref && (
                  <a className="text-sm font-semibold text-[#17305d] underline decoration-[#17305d]/30 underline-offset-4" href={contactHref}>
                    Contact {launchConfig.supportEmail}
                  </a>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {launchConfig.brandName}. All rights reserved.</p>
          <p>Launch mode is active. All application routes remain restricted.</p>
        </footer>
      </div>
    </div>
  );
}

export default LaunchingPage;
