import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  CircleHelp,
  Globe,
  Layers3,
  Moon,
  Receipt,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import QuizmateCreditIcon from "@/assets/Quizmate-Credit.png";

function getPricingGuideCopy(t) {
  return {
    navHome: t("pricingGuide.navHome"),
    heroBadge: t("pricingGuide.heroBadge"),
    title: t("pricingGuide.title"),
    subtitle: t("pricingGuide.subtitle"),
    ctaPrimaryGuest: t("pricingGuide.ctaPrimaryGuest"),
    ctaPrimaryUser: t("pricingGuide.ctaPrimaryUser"),
    ctaSecondaryGuest: t("pricingGuide.ctaSecondaryGuest"),
    ctaSecondaryUser: t("pricingGuide.ctaSecondaryUser"),
    openDashboard: t("pricingGuide.openDashboard"),
    viewPlans: t("pricingGuide.viewPlans"),
    summaryCards: t("pricingGuide.summaryCards", { returnObjects: true }),
    bundleTitle: t("pricingGuide.bundleTitle"),
    bundleDesc: t("pricingGuide.bundleDesc"),
    bundleHeaders: t("pricingGuide.bundleHeaders", { returnObjects: true }),
    bundleTable: t("pricingGuide.bundleTable", { returnObjects: true }),
    unitTitle: t("pricingGuide.unitTitle"),
    unitDesc: t("pricingGuide.unitDesc"),
    unitHeaders: t("pricingGuide.unitHeaders", { returnObjects: true }),
    unitTable: t("pricingGuide.unitTable", { returnObjects: true }),
    personalizationTitle: t("pricingGuide.personalizationTitle"),
    personalizationDesc: t("pricingGuide.personalizationDesc"),
    personalizationItems: t("pricingGuide.personalizationItems", { returnObjects: true }),
    examplesTitle: t("pricingGuide.examplesTitle"),
    examplesDesc: t("pricingGuide.examplesDesc"),
    examples: t("pricingGuide.examples", { returnObjects: true }),
    examplesNote: t("pricingGuide.examplesNote"),
    creditCardDescription: t("pricingGuide.creditCardDescription"),
    startingPointLabel: t("pricingGuide.startingPointLabel"),
    examplePrefix: t("pricingGuide.examplePrefix"),
    quickMathLabel: t("pricingGuide.quickMathLabel"),
  };
}

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getHomeTarget(user) {
  if (!user) return "/";
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "SUPER_ADMIN") return "/super-admin";
  return "/home";
}

export default function PricingGuidePage() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language === "en" ? "en" : "vi";
  const copy = useMemo(() => getPricingGuideCopy(t), [t, currentLang]);
  const user = useMemo(() => getStoredUser(), []);
  const isLoggedIn = !!user && !!window.localStorage.getItem("accessToken");
  const isEndUser = user?.role === "USER";
  const fontClass = currentLang === "en" ? "font-poppins" : "font-sans";
  const homeTarget = getHomeTarget(user);
  const [selectedPersonalization, setSelectedPersonalization] = useState(null);

  const toggleLanguage = () => {
    const nextLanguage = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLanguage);
  };

  const topActions = isEndUser
    ? [
        {
          label: copy.ctaPrimaryUser,
          onClick: () => navigate("/wallet", { state: { from: "/pricing" } }),
          primary: true,
        },
        {
          label: copy.ctaSecondaryUser,
          onClick: () => navigate("/plan", { state: { from: "/pricing" } }),
          primary: false,
        },
      ]
    : isLoggedIn
      ? [
          {
            label: copy.openDashboard,
            onClick: () => navigate(homeTarget),
            primary: true,
          },
          {
            label: copy.viewPlans,
            onClick: () => navigate("/"),
            primary: false,
          },
        ]
      : [
        {
          label: copy.ctaPrimaryGuest,
          onClick: () => navigate("/login"),
          primary: true,
        },
        {
          label: copy.ctaSecondaryGuest,
          onClick: () => navigate("/"),
          primary: false,
        },
        ];

  return (
    <div
      className={`min-h-screen ${fontClass} transition-colors ${
        isDarkMode
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#020617_100%)] text-slate-50"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_45%,_#eef6ff_100%)] text-slate-900"
      }`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          isDarkMode ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-white/80"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(homeTarget)}
            className="flex w-[120px] items-center"
            aria-label={copy.navHome}
          >
            <img
              src={isDarkMode ? LogoDark : LogoLight}
              alt="QuizMate AI Logo"
              className="h-auto w-full object-contain"
            />
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className={`rounded-full ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <Globe className="mr-2 h-4 w-4" />
              {currentLang === "vi" ? "VI" : "EN"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className={`rounded-full ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDarkMode ? "Light" : "Dark"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(homeTarget)}
              className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
            >
              {copy.navHome}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[2rem] border px-6 py-8 sm:px-8 sm:py-10">
          <div
            className={`absolute inset-0 ${
              isDarkMode
                ? "bg-[linear-gradient(135deg,rgba(30,41,59,0.9),rgba(2,6,23,0.86))]"
                : "bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.96))]"
            }`}
          />
          <div
            className={`pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full blur-3xl ${
              isDarkMode ? "bg-blue-600/20" : "bg-blue-300/40"
            }`}
          />
          <div
            className={`pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full blur-3xl ${
              isDarkMode ? "bg-cyan-500/20" : "bg-amber-300/40"
            }`}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge
                className={`rounded-full px-4 py-1 text-xs font-bold ${
                  isDarkMode ? "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30" : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                }`}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {copy.heroBadge}
              </Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
              <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {copy.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {topActions.map((action) => (
                  <Button
                    key={action.label}
                    onClick={action.onClick}
                    className={
                      action.primary
                        ? "rounded-full bg-blue-600 text-white hover:bg-blue-700"
                        : `rounded-full ${
                            isDarkMode
                              ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                              : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                          }`
                    }
                    variant={action.primary ? "default" : "outline"}
                  >
                    {action.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <Card className={`w-full max-w-md border-0 shadow-2xl ${isDarkMode ? "bg-slate-900/80 text-slate-50" : "bg-white/90 text-slate-900"}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span className={`inline-flex rounded-2xl p-2 ${isDarkMode ? "bg-blue-500/10 ring-1 ring-blue-400/20" : "bg-blue-50 ring-1 ring-blue-100"}`}>
                    <img src={QuizmateCreditIcon} alt="Quizmate Credit" className="h-10 w-10 rounded-xl" />
                  </span>
                  <span>Quizmate Credit</span>
                </CardTitle>
                <CardDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                  {copy.creditCardDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className={`rounded-2xl p-4 ${isDarkMode ? "bg-slate-950/60" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.24em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    {copy.startingPointLabel}
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-4xl font-black">100</span>
                    <span className={`pb-1 text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>VND / credit</span>
                  </div>
                </div>
                <div className={`rounded-2xl p-4 ${isDarkMode ? "bg-slate-950/60" : "bg-slate-50"}`}>
                  <div className="flex items-start gap-3">
                    <Calculator className={`mt-0.5 h-4 w-4 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
                    <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      {copy.lightRequestHint}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {copy.summaryCards.map((item) => (
            <Card
              key={item.title}
              className={`border ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-white/70 bg-white/80 shadow-slate-900/5"}`}
            >
              <CardContent className="p-5">
                <p className="text-sm font-extrabold">{item.title}</p>
                <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <Card className={`border ${isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-white/70 bg-white/90"}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Layers3 className={`h-5 w-5 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
                {copy.bundleTitle}
              </CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                {copy.bundleDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                <Table className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                  <TableHeader className={isDarkMode ? "bg-slate-950/60" : "bg-slate-50"}>
                    <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.bundleHeaders[0]}
                      </TableHead>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.bundleHeaders[1]}
                      </TableHead>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.bundleHeaders[2]}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copy.bundleTable.map(([name, unit, price]) => (
                      <TableRow key={name} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                        <TableCell className="font-semibold">{name}</TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{unit}</TableCell>
                        <TableCell
                          className={`whitespace-pre-line font-bold leading-7 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                        >
                          {price}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card className={`border ${isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-white/70 bg-white/90"}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Receipt className={`h-5 w-5 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`} />
                {copy.unitTitle}
              </CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                {copy.unitDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                <Table className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                  <TableHeader className={isDarkMode ? "bg-slate-950/60" : "bg-slate-50"}>
                    <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.unitHeaders[0]}
                      </TableHead>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.unitHeaders[1]}
                      </TableHead>
                      <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                        {copy.unitHeaders[2]}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copy.unitTable.map(([name, price, unit]) => (
                      <TableRow key={name} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                        <TableCell className="font-semibold">{name}</TableCell>
                        <TableCell
                          className={`whitespace-pre-line font-bold leading-7 ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}
                        >
                          {price}
                        </TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card className={`border ${isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-white/70 bg-white/90"}`}>
            <CardHeader>
              <CardTitle className="text-2xl font-black">{copy.personalizationTitle}</CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                {copy.personalizationDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                {copy.personalizationItems.map((item, index) => (
                  <div
                    key={item.title}
                    className={`flex items-center justify-between gap-4 px-5 py-4 ${
                      index !== copy.personalizationItems.length - 1
                        ? isDarkMode
                          ? "border-b border-slate-800"
                          : "border-b border-slate-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPersonalization(item)}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                          isDarkMode
                            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label={item.title}
                      >
                        ?
                      </button>
                    </div>
                    <span className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-black">{copy.examplesTitle}</h2>
            <p className={`mt-2 max-w-3xl text-sm leading-7 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{copy.examplesDesc}</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {copy.examples.map((item, index) => (
              <Card
                key={item.title}
                className={`border ${isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-white/70 bg-white/90"}`}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <div className={`text-xs font-bold uppercase tracking-[0.24em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        {`${copy.examplePrefix} ${index + 1}`}
                      </div>
                      <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                    </div>
                    <Badge
                      className={`w-fit rounded-full px-4 py-1 text-sm font-bold ${
                        isDarkMode ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      }`}
                    >
                      {item.total}
                    </Badge>
                  </div>
                  <p className={`mt-4 text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{item.body}</p>
                  {item.breakdown?.length ? (
                    <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50"}`}>
                      <div className={`text-xs font-bold uppercase tracking-[0.2em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        {copy.quickMathLabel}
                      </div>
                      <div className="mt-3 space-y-2">
                        {item.breakdown.map((line) => (
                          <p
                            key={line}
                            className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${isDarkMode ? "bg-slate-950/50 text-slate-300" : "bg-slate-50 text-slate-700"}`}>
            {copy.examplesNote}
          </div>
        </section>
      </main>

      <Dialog
        open={!!selectedPersonalization}
        onOpenChange={(open) => {
          if (!open) setSelectedPersonalization(null);
        }}
      >
        <DialogContent className={isDarkMode ? "border-slate-800 bg-slate-900 text-slate-50" : ""}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleHelp className={`h-5 w-5 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
              {selectedPersonalization?.title}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
              {selectedPersonalization?.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
