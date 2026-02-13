import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, Map, Settings, Shield, Zap, Award, 
  TrendingUp, BookOpen, Clock, Star, Edit3, Globe, Moon, Sun, Share2, LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useNavigate } from 'react-router-dom'; 
import LogoLight from "@/assets/LightMode_Logo.png";
import LogoDark from "@/assets/DarkMode_Logo.png";

// --- Custom Components (to emulate missing UI components) ---

const Tabs = ({ children, className }) => <div className={className}>{children}</div>;
const TabsList = ({ children, className }) => <div className={`flex space-x-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 ${className}`}>{children}</div>;
const TabsTrigger = ({ active, onClick, children, className }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      active 
        ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50' 
        : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-50'
    } ${className}`}
  >
    {children}
  </button>
);
const TabsContent = ({ active, children, className }) => active ? <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>{children}</div> : null;

// --- Chart Component ---

const SkillRadarChart = ({ skills }) => {
  // Simple SVG Radar Chart
  // Center: 100, 100. Radius: 80.
  const levels = [1, 2, 3, 4, 5];
  const angleSlice = (Math.PI * 2) / skills.length;
  
  const getCoordinates = (value, index, maxVal = 100) => {
    const angle = index * angleSlice - Math.PI / 2; // Start from top
    const radius = (value / maxVal) * 80;
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle)
    };
  };

  const points = skills.map((skill, i) => {
    const coords = getCoordinates(skill.value, i);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center p-4">
        <div className="relative h-[250px] w-[250px]">
            <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
                {/* Background Grid */}
                {levels.map(level => (
                    <circle 
                        key={level} 
                        cx="100" 
                        cy="100" 
                        r={level * 16} 
                        className="fill-none stroke-slate-200 dark:stroke-slate-700" 
                        strokeWidth="1"
                    />
                ))}
                {skills.map((_, i) => {
                    const coords = getCoordinates(100, i);
                    return (
                        <line 
                            key={i} 
                            x1="100" 
                            y1="100" 
                            x2={coords.x} 
                            y2={coords.y} 
                            className="stroke-slate-200 dark:stroke-slate-700" 
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Data Polygon */}
                <polygon 
                    points={points} 
                    className="fill-blue-500/20 stroke-blue-500" 
                    strokeWidth="2" 
                />
                
                {/* Labels */}
                {skills.map((skill, i) => {
                    const coords = getCoordinates(115, i);
                    return (
                        <text 
                            key={i} 
                            x={coords.x} 
                            y={coords.y} 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            className="text-[10px] font-medium fill-slate-600 dark:fill-slate-300"
                        >
                            {skill.name}
                        </text>
                    );
                })}
            </svg>
        </div>
    </div>
  );
};

const ProfileHeader = ({ settingsMenu, isDarkMode, user }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

    return (
        <header className={`w-full h-16 border-b transition-colors duration-300 sticky top-0 z-[50] ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"}`}>
            <div className="max-w-[1740px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                    <div
                        className="w-[100px] md:w-[130px] flex items-center justify-center cursor-pointer"
                        onClick={() => navigate("/home")}
                    >
                        <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Share Profile Button - Hidden on small mobile */}
                    <Button
                        variant="ghost"
                        className={`rounded-full h-9 w-9 md:w-auto px-0 md:px-4 flex items-center justify-center gap-2 ${
                            isDarkMode ? "text-slate-200 hover:bg-slate-900" : "text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Share Profile"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className={`hidden md:inline ${fontClass}`}>Share</span>
                    </Button>

                    {settingsMenu}

                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-white dark:ring-slate-800 overflow-hidden">
                         <img src={user.avatar} alt="User" className="h-full w-full object-cover" />
                    </div>
                </div>
            </div>
        </header>
    );
};

// --- Page Component ---

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [activeTab, setActiveTab] = useState('analytics');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);

    // Font Handling
    const currentLang = i18n.language;
    const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
    
    // Settings Menu Logic
    const toggleLanguage = () => {
        const newLang = currentLang === "vi" ? "en" : "vi";
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isSettingsOpen]);

    const settingsMenu = (
        <div ref={settingsRef} className="relative">
            <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center justify-center gap-2 rounded-full h-9 w-9 md:w-auto md:px-4 text-sm border transition-colors duration-300 ${
                    isDarkMode
                        ? "border-slate-700 text-slate-200 hover:bg-slate-900"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
                aria-expanded={isSettingsOpen}
                aria-haspopup="menu"
                title={t("common.settings")}
            >
                <Settings className="w-4 h-4" />
                <span className={`hidden md:inline ${fontClass}`}>{t("common.settings")}</span>
            </button>

            {isSettingsOpen ? (
                <div
                    role="menu"
                    className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 z-[60] ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
                    }`}
                >
                    <button
                        type="button"
                        onClick={toggleLanguage}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                        }`}
                    >
                        <span className={`flex items-center gap-2 ${fontClass}`}>
                            <Globe className="w-4 h-4" />
                            {t("common.language")}
                        </span>
                        <span className={`text-xs font-semibold ${fontClass}`}>
                            {currentLang === "vi" ? "VI" : "EN"}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
                        }`}
                    >
                        <span className={`flex items-center gap-2 ${fontClass}`}>
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            {t("common.theme")}
                        </span>
                        <span className={`text-xs font-semibold ${fontClass}`}>
                            {isDarkMode ? t("common.dark") : t("common.light")}
                        </span>
                    </button>
                    <div className={`h-px w-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}></div>
                    <button
                        type="button"
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 transition-colors ${
                            isDarkMode ? "hover:bg-slate-900" : "hover:bg-red-50"
                        }`}
                    >
                        <LogOut className="w-4 h-4" />
                        <span className={fontClass}>Sign Out</span>
                    </button>
                </div>
            ) : null}
        </div>
    );
    
    // Mock Data
    const user = {
        name: "Alex Nguyen",
        level: 12,
        xp: 2450,
        nextLevelXp: 3000,
        role: "Pro Learner",
        tokens: 450,
        avatar: "https://github.com/shadcn.png" 
    };

    const skills = [
        { name: "Logic", value: 80 },
        { name: "Memory", value: 65 },
        { name: "Speed", value: 90 },
        { name: "Focus", value: 75 },
        { name: "Creativity", value: 60 },
    ];
    const badges = [
        { id: 1, name: "Quiz Master", icon: Award, bg: "bg-yellow-100 dark:bg-yellow-900/30", color: "text-yellow-600 dark:text-yellow-400" },
        { id: 2, name: "Streak Keeper", icon: TrendingUp, bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
        { id: 3, name: "Speedster", icon: Zap, bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-600 dark:text-red-400" },
    ];
    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-white" : "bg-[#F7FBFF] text-slate-900"} ${fontClass}`}>
            <ProfileHeader settingsMenu={settingsMenu} isDarkMode={isDarkMode} user={user} />
            
            <div className="flex-1 w-full overflow-y-auto">
                <div className="max-w-[1740px] mx-auto px-4 md:px-6 py-6 h-full pb-24 md:pb-6"> 
                    
                    {/* Header Section */}
                    <div className="mb-6 md:mb-8 flex flex-col items-center justify-center text-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("profile.title", "My Profile")}</h1>
                        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">{t("profile.description", "Manage your learning journey and personal settings.")}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
                    
                    {/* Left Column: Identity & Badges */}
                    <div className="space-y-6 lg:col-span-4 xl:col-span-3">
                        
                        {/* Identity Card */}
                        <Card className="border-white/60 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50 dark:shadow-blue-900/20">
                            <CardContent className="flex flex-col items-center pt-8">
                                <div className="relative mb-4">
                                    <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-xl dark:border-slate-800">
                                        <img src={user.avatar} alt="User Avatar" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                                        <span className="text-xs font-bold">{user.level}</span>
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold">{user.name}</h2>
                                <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">{user.role}</p>
                                
                                <div className="w-full space-y-2 px-4">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>{t("profile.xpProgress", "XP Progress")}</span>
                                        <span>{user.xp} / {user.nextLevelXp}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                        <div 
                                            className="h-full bg-blue-600 transition-all duration-500" 
                                            style={{ width: `${(user.xp / user.nextLevelXp) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex w-full gap-2 px-4">
                                    <Button variant="outline" className="flex-1 dark:border-slate-700 dark:hover:bg-slate-800">
                                        <Edit3 className="mr-2 h-4 w-4" /> {t("profile.edit", "Edit")}
                                    </Button>
                                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                        {t("profile.share", "Share")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Token Status */}
                        <Card className="border-white/60 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:from-indigo-900/20 dark:to-blue-900/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Zap className="h-5 w-5 fill-yellow-500 text-yellow-500" /> {t("profile.aiTokens", "AI Tokens")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-bold">{user.tokens}</span>
                                    <Button size="sm" variant="secondary" className="h-7 text-xs">{t("profile.topUp", "Top Up")}</Button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("profile.tokenDesc", "Enough for ~20 quizzes.")}</p>
                            </CardContent>
                        </Card>

                        {/* Badges */}
                        <Card className="border-white/60 bg-white/70 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("profile.achievements", "Achievements")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {badges.map((badge) => (
                                    <div key={badge.id} className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${badge.bg} ${badge.color}`}>
                                            <badge.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{badge.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.unlocked", { days: 2 }, "Unlocked 2 days ago")}</p>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-xs text-slate-500">{t("profile.viewAllBadges", "View All Badges")}</Button>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column: Learning Hub */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <Tabs className="w-full space-y-6">
                            <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                                <TabsTrigger active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
                                    {t("profile.tabs.analytics", "Analytics")}
                                </TabsTrigger>
                                <TabsTrigger active={activeTab === 'roadmaps'} onClick={() => setActiveTab('roadmaps')}>
                                    {t("profile.tabs.roadmaps", "My Roadmaps")}
                                </TabsTrigger>
                                <TabsTrigger active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
                                    {t("profile.tabs.settings", "Settings")}
                                </TabsTrigger>
                            </TabsList>

                            {/* Analytics Tab */}
                            <TabsContent active={activeTab === 'analytics'} className="space-y-6 animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Radar Chart */}
                                    <Card className="border-white/60 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50 dark:shadow-blue-900/10">
                                        <CardHeader>
                                            <CardTitle>{t("profile.skillMatrix.title", "Skill Matrix")}</CardTitle>
                                            <CardDescription>{t("profile.skillMatrix.desc", "Your strengths & areas to improve")}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <SkillRadarChart skills={skills} />
                                        </CardContent>
                                    </Card>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <Card className="flex flex-col justify-center p-3 sm:p-4 text-center border-white/60 bg-white/70 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/50">
                                            <BookOpen className="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                                            <span className="text-xl sm:text-2xl font-bold">42</span>
                                            <span className="text-[10px] sm:text-xs text-slate-500">{t("profile.stats.topicsMastered", "Topics Mastered")}</span>
                                        </Card>
                                        <Card className="flex flex-col justify-center p-3 sm:p-4 text-center border-white/60 bg-white/70 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/50">
                                            <Clock className="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                                            <span className="text-xl sm:text-2xl font-bold">128h</span>
                                            <span className="text-[10px] sm:text-xs text-slate-500">{t("profile.stats.learningTime", "Learning Time")}</span>
                                        </Card>
                                        <Card className="flex flex-col justify-center p-3 sm:p-4 text-center border-white/60 bg-white/70 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/50">
                                            <Shield className="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                                            <span className="text-xl sm:text-2xl font-bold">15</span>
                                            <span className="text-[10px] sm:text-xs text-slate-500">{t("profile.stats.dayStreak", "Day Streak")}</span>
                                        </Card>
                                        <Card className="flex flex-col justify-center p-3 sm:p-4 text-center border-white/60 bg-white/70 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/50">
                                            <Star className="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                                            <span className="text-xl sm:text-2xl font-bold">98%</span>
                                            <span className="text-[10px] sm:text-xs text-slate-500">{t("profile.stats.avgScore", "Avg. Score")}</span>
                                        </Card>
                                    </div>
                                </div>
                                <Card className="p-6 border-white/60 bg-white/70 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
                                    <CardTitle className="mb-4">{t("profile.recentActivity", "Recent Activity")}</CardTitle>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                    <div>
                                                        <p className="text-sm font-medium">Completed "React Advanced Patterns"</p>
                                                        <p className="text-xs text-slate-500">2 hours ago</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">+50 XP</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Roadmaps Tab */}
                            <TabsContent active={activeTab === 'roadmaps'} className="animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                   <Card className="group relative overflow-hidden text-center cursor-pointer hover:shadow-lg transition-all border-dashed border-2 border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/20 h-[200px] flex flex-col items-center justify-center">
                                       <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3">
                                           <span className="text-2xl">+</span>
                                       </div>
                                       <p className="font-semibold text-slate-600 dark:text-slate-300">{t("profile.roadmap.create", "Create New Roadmap")}</p>
                                       <p className="text-xs text-slate-500">{t("profile.roadmap.createDesc", "Paste URL, Upload PDF, or Enter Topic")}</p>
                                   </Card>
                                   
                                   {[1, 2].map(i => (
                                       <Card key={i} className="group cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all border-white/60 bg-white/70 dark:border-slate-700/50 dark:bg-slate-900/50">
                                           <div className="h-2 bg-blue-500 w-1/3"></div>
                                           <CardHeader>
                                               <CardTitle className="text-base">Fullstack Development</CardTitle>
                                               <CardDescription>{t("profile.roadmap.progress", "Progress")}: 35%</CardDescription>
                                           </CardHeader>
                                           <CardContent>
                                               <p className="text-xs text-slate-500 mb-4">{t("profile.roadmap.lastStudied", { days: 2 }, "Last studied 2 days ago")}</p>
                                               <Button size="sm" className="w-full">{t("profile.roadmap.continue", "Continue")}</Button>
                                           </CardContent>
                                       </Card>
                                   ))}
                                </div>
                            </TabsContent>

                             {/* Settings Tab */}
                             <TabsContent active={activeTab === 'settings'} className="animate-in fade-in-50 duration-500">
                                <Card className="border-white/60 bg-white/70 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
                                    <CardHeader>
                                        <CardTitle>{t("profile.settings.title", "Account Settings")}</CardTitle>
                                        <CardDescription>{t("profile.settings.desc", "Update your personal information")}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-slate-500 italic">{t("profile.settings.placeholder", "Settings panel placeholder...")}</p>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Profile;
