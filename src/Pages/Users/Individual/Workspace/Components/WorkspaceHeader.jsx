import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Share2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LogoLight from "@/assets/LightMode_Logo.png";
import { useNavigate } from 'react-router-dom';

function WorkspaceHeader() {
  const { language, fontClass } = useLanguage();
    const navigate = useNavigate();

  const text = {
    title: {
      vi: "Sổ ghi chú chưa đặt tên",
      en: "Untitled workspace",
    },
    create: {
      vi: "Tạo sổ ghi chú",
      en: "Create workspace",
    },
    share: {
      vi: "Chia sẻ",
      en: "Share",
    },
    settings: {
      vi: "Cài đặt",
      en: "Settings",
    },
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 h-16">
      <div className="max-w-[1740px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
              <div className="w-[150px] h-[120px] flex items-center justify-center cursor-pointer" onClick={() => navigate('/home')}>
                      <img src={LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
                    </div>
          <p className={`text-sm text-gray-800 ${fontClass}`}>
            {text.title[language]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button className="rounded-full bg-[#2563EB] hover:bg-gray-800 text-white h-9 px-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className={fontClass}>{text.create[language]}</span>
          </Button>
          <Button variant="outline" className="rounded-full h-9 px-4 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            <span className={fontClass}>{text.share[language]}</span>
          </Button>
          <Button variant="outline" className="rounded-full h-9 px-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className={fontClass}>{text.settings[language]}</span>
          </Button>
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
            U
          </div>
        </div>
      </div>
    </header>
  );
}

export default WorkspaceHeader;
