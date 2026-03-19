import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { Plus, Trash2, Loader2, BadgeCheck, ArrowLeft, MapPin, RefreshCw, Save, Rocket, AlertCircle, Lock, Unlock, RotateCcw, ArrowUp, Sparkles, Sliders, CheckSquare, BrainCircuit, FileText, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFullQuiz } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace, getPhasesByRoadmap, getKnowledgesByPhase, createRoadmapForWorkspace, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import { generateAIQuiz, getQuestionTypes, getDifficultyDefinitions, getBloomSkills } from "@/api/AIAPI";
import QuickCreateDialog from "../QuickCreateDialog";

// Danh sách dạng câu hỏi và độ khó
const QUESTION_TYPES = ["multipleChoice", "multipleSelect", "trueFalse", "fillBlank", "shortAnswer"];
const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const QUIZ_INTENTS = ["PRE_LEARNING", "POST_LEARNING", "REVIEW"];
const BLOOM_LEVELS = [
  { id: 1, key: "remember" },
  { id: 2, key: "understand" },
  { id: 3, key: "apply" },
  { id: 4, key: "analyze" },
  { id: 5, key: "evaluate" },
];
// Danh sách contextType cho Individual Workspace — Quiz chỉ tạo ở KNOWLEDGE
// (ROADMAP dành cho MockTest, PHASE dành cho PostLearning)
const FIXED_CONTEXT_TYPE = "KNOWLEDGE";

// 4 Chiến lược chia điểm (Scoring Strategy Profiles)
const SCORING_STRATEGIES = {
  balanced: { easy: 10, medium: 15, hard: 20 },
  linear:   { easy: 10, medium: 20, hard: 30 },
  elite:    { easy: 10, medium: 20, hard: 40 },
  tight:    { easy: 10, medium: 11, hard: 12 },
};

// Trọng số mặc định — lấy từ strategy "balanced"
const DIFFICULTY_WEIGHTS = SCORING_STRATEGIES.balanced;

// Auto-distribute points logic (nhận thêm tham số strategy)
const autoDistributePoints = (currentQuestions, totalQuizScore, strategy = "balanced") => {
  const weights = SCORING_STRATEGIES[strategy] || SCORING_STRATEGIES.balanced;
  
  // 1. Tính tổng điểm đã bị khóa bởi người dùng
  const lockedPoints = currentQuestions
    .filter(q => q.isLocked)
    .reduce((sum, q) => sum + (Number(q.point) || 0), 0);

  // 2. Tính tổng trọng số của các câu chưa khóa
  const unlockedQuestions = currentQuestions.filter(q => !q.isLocked);
  const totalUnlockedWeight = unlockedQuestions.reduce((sum, q) => sum + weights[q.difficulty], 0);

  const remainingScore = Math.max(0, totalQuizScore - lockedPoints);

  // 3. Phân bổ lại điểm
  const distributed = currentQuestions.map(q => {
    // Luôn cập nhật weight cho câu hỏi để gửi BE
    const questionWeight = weights[q.difficulty] || 10;
    
    if (q.isLocked) return { ...q, weight: questionWeight };
    
    // Nếu không còn trọng số nào (ví dụ tất cả đều bị khóa), chia đều điểm 0
    if (totalUnlockedWeight === 0) return { ...q, point: 0, weight: questionWeight };

    const rawPoint = (questionWeight / totalUnlockedWeight) * remainingScore;
    return { ...q, point: Math.round(rawPoint * 100) / 100, weight: questionWeight }; // Làm tròn tạm thời để hiển thị
  });

  // 4. Bù sai số làm tròn (để tổng hiển thị = maxScore)
  const currentTotal = distributed.reduce((sum, q) => sum + (q.point || 0), 0);
  const delta = Math.round((totalQuizScore - currentTotal) * 100) / 100;
  
  if (delta !== 0) {
    // Ưu tiên cộng vào câu hỏi có điểm cao nhất hoặc câu cuối cùng chưa khóa
    for (let i = distributed.length - 1; i >= 0; i--) {
      if (!distributed[i].isLocked) {
        distributed[i] = { ...distributed[i], point: Math.round((distributed[i].point + delta) * 100) / 100 };
        break; 
      }
    }
  }

  return distributed;
};

// Aliased for backward compatibility — wrapper truyền strategy mặc định
const calculateScores = (qs, maxScore, strategy) => autoDistributePoints(qs, maxScore, strategy);

// Khung câu hỏi mặc định — nhận difficulty từ overallDifficulty
const makeDefaultQuestion = (difficulty = "medium") => ({
  type: "multipleChoice", text: "", difficulty, bloomId: 1, duration: 0, explanation: "",
  point: 0, isLocked: false, weight: 15,
  answers: [{ text: "", correct: false }, { text: "", correct: false }],
});

// Form tạo Quiz — hiển thị inline trong ChatPanel thay vì popup
function CreateQuizForm({ isDarkMode = false, onCreateQuiz, onBack, contextId: defaultContextId, selectedSourceIds = [], sources = [] }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  // Auto-switch to AI tab if materials are pre-selected
  // const [tab, setTab] = useState(selectedSourceIds.length > 0 ? "ai" : "manual");
    const [tab, setTab] = useState("ai");
  const selectedMaterialIds = Array.isArray(selectedSourceIds) ? selectedSourceIds : [];
  const selectedSourceItems = sources.filter((s) => selectedMaterialIds.includes(s.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [questionValidationErrors, setQuestionValidationErrors] = useState({});

  useEffect(() => {
    if (selectedMaterialIds.length > 0) {
      setFieldErrors((prev) => ({ ...prev, selectedMaterialIds: "" }));
    }
  }, [selectedMaterialIds.length]);

  // State quản lý vị trí tạo quiz — luôn là KNOWLEDGE
  const [selectedContextId, setSelectedContextId] = useState("");
  const [attachToRoadmap, setAttachToRoadmap] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  // Dữ liệu cascade dropdown: roadmap → phase → knowledge (từ workspace hiện tại)
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  // Cờ đánh dấu đã tải xong từng cấp (để phân biệt mảng rỗng do chưa tải vs không có dữ liệu)
  const [roadmapsLoaded, setRoadmapsLoaded] = useState(false);
  const [phasesLoaded, setPhasesLoaded] = useState(false);
  const [knowledgesLoaded, setKnowledgesLoaded] = useState(false);

  // State quản lý dialog tạo nhanh
  const [quickCreateType, setQuickCreateType] = useState(null); // "roadmap" | "phase" | "knowledge" | null

  // Tải danh sách roadmap từ workspace hiện tại
  const loadRoadmaps = useCallback(async () => {
    if (!defaultContextId) return;
    setContextLoading(true);
    try {
      const res = await getRoadmapsByWorkspace(defaultContextId, 0, 100);
      setRoadmaps(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải roadmaps:", e);
    } finally {
      setContextLoading(false);
      setRoadmapsLoaded(true);
    }
  }, [defaultContextId]);

  // Tự động tải roadmaps khi mount
  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  // Khi chọn roadmap — tải phases cho PHASE/KNOWLEDGE
  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    if (!roadmapId) { setSelectedContextId(""); return; }
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
      setPhasesLoaded(true);
    }
  }, []);

  // Khi chọn phase — luôn tải knowledges (vì contextType cố định = KNOWLEDGE)
  const handlePhaseSelect = useCallback(async (phaseId) => {
    setSelectedPhaseId(phaseId);
    setKnowledges([]);
    setSelectedContextId("");
    if (!phaseId) return;
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
      setKnowledgesLoaded(true);
    }
  }, []);

  // Khi chọn knowledge — set contextId
  const handleKnowledgeSelect = (knowledgeId) => {
    setSelectedContextId(knowledgeId);
  };

  // Hàm reload cho từng cấp dropdown
  const reloadRoadmaps = () => {
    setSelectedRoadmapId("");
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    setRoadmapsLoaded(false);
    setPhasesLoaded(false);
    setKnowledgesLoaded(false);
    loadRoadmaps();
  };

  const reloadPhases = async () => {
    if (!selectedRoadmapId) return;
    setSelectedPhaseId("");
    setKnowledges([]);
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(selectedRoadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
      setPhasesLoaded(true);
    }
  };

  const reloadKnowledges = async () => {
    if (!selectedPhaseId) return;
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(selectedPhaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
      setKnowledgesLoaded(true);
    }
  };

  // Hàm tạo nhanh — bind parentId rồi truyền cho QuickCreateDialog
  const getQuickCreateFn = () => {
    if (quickCreateType === "roadmap") return (data) => createRoadmapForWorkspace({ ...data, workspaceId: defaultContextId });
    if (quickCreateType === "phase") return (data) => createPhase(selectedRoadmapId, data);
    if (quickCreateType === "knowledge") return (data) => createKnowledge(selectedPhaseId, data);
    return null;
  };

  // Callback sau khi tạo nhanh thành công — reload dropdown tương ứng
  const handleQuickCreated = () => {
    if (quickCreateType === "roadmap") reloadRoadmaps();
    else if (quickCreateType === "phase") reloadPhases();
    else if (quickCreateType === "knowledge") reloadKnowledges();
  };

  // Component hiển thị empty state + nút tạo nhanh
  const EmptyState = ({ messageKey, createType }) => (
    <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span className={`flex-1 ${fontClass}`}>{t(messageKey)}</span>
      <button type="button" onClick={() => setQuickCreateType(createType)}
        className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-md transition-all active:scale-95 ${isDarkMode ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
        <Plus className="w-3 h-3 inline mr-0.5" />{t("workspace.quiz.quickCreate.createBtn")}
      </button>
    </div>
  );

  // State cho tab Manual
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(7.5);
  const [maxAttempt, setMaxAttempt] = useState(3);
  const [quizIntent, setQuizIntent] = useState("PRE_LEARNING");
  const [timerMode, setTimerMode] = useState(true);
  const [overallDifficulty, setOverallDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [maxScore, setMaxScore] = useState(10);
  const [showNavigator, setShowNavigator] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState("balanced");

  // State Configure AI
  const [difficultyDefs, setDifficultyDefs] = useState([]);
  const [selectedDifficultyId, setSelectedDifficultyId] = useState(""); // ID or "CUSTOM"
  const [customDifficulty, setCustomDifficulty] = useState({ easy: 30, medium: 40, hard: 30 });
  const [qTypes, setQTypes] = useState([]);
  const [selectedQTypes, setSelectedQTypes] = useState([]); // { questionTypeId, ratio, isLocked }
  const [bloomSkills, setBloomSkills] = useState([]);
  const [selectedBloomSkills, setSelectedBloomSkills] = useState([]); // { bloomId, ratio, isLocked }

  // State cho tab AI
  const [aiName, setAiName] = useState("");
  // const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTotalQuestions, setAiTotalQuestions] = useState(10);
  const [aiDuration, setAiDuration] = useState(15);
  const [aiEasyDuration, setAiEasyDuration] = useState(60); // in seconds
  const [aiMediumDuration, setAiMediumDuration] = useState(120); // in seconds
  const [aiHardDuration, setAiHardDuration] = useState(180); // in seconds
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuizIntent, setAiQuizIntent] = useState("REVIEW");
  const [aiTimerMode, setAiTimerMode] = useState(true);
  const [questionTypeUnit, setQuestionTypeUnit] = useState(false);
  const [bloomUnit, setBloomUnit] = useState(false);
  const [questionUnit, setQuestionUnit] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");
  const [qTypeToAdd, setQTypeToAdd] = useState("");
  const [bloomToAdd, setBloomToAdd] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // Track errors for each field
  const prevQuestionTypeUnitRef = useRef(questionTypeUnit);
  const prevBloomUnitRef = useRef(bloomUnit);

  const getTargetTotal = (unitByCount) => unitByCount ? Number(aiTotalQuestions || 0) : 100;

  const shuffle = (arr) => {
    const clone = [...arr];
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  };

  const splitIntegerRandom = (parts, total) => {
    if (parts <= 0) return [];
    const base = Math.floor(total / parts);
    const remainder = Math.max(0, total - (base * parts));
    const values = Array(parts).fill(base);
    const indexes = shuffle(Array.from({ length: parts }, (_, i) => i));
    for (let i = 0; i < remainder; i += 1) {
      values[indexes[i]] += 1;
    }
    return values;
  };

  const distributeConfigValues = (items, targetTotal, unitByCount = false) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const lockedTotal = items
      .filter((item) => item.isLocked)
      .reduce((sum, item) => {
        const ratio = Number(item.ratio) || 0;
        return sum + (unitByCount ? Math.round(ratio) : ratio);
      }, 0);

    const unlockedIndexes = items
      .map((item, idx) => (!item.isLocked ? idx : -1))
      .filter((idx) => idx !== -1);

    if (unlockedIndexes.length === 0) {
      return items;
    }

    const remaining = Math.max(0, Number(targetTotal || 0) - lockedTotal);
    let next = items;

    if (unitByCount) {
      const integerTarget = Math.max(0, Math.round(remaining));
      const randomSplit = splitIntegerRandom(unlockedIndexes.length, integerTarget);
      next = items.map((item, idx) => {
        if (item.isLocked) return { ...item, ratio: Math.max(0, Math.round(Number(item.ratio) || 0)) };
        const splitIdx = unlockedIndexes.indexOf(idx);
        return { ...item, ratio: randomSplit[splitIdx] || 0 };
      });
    } else {
      const base = Math.floor((remaining / unlockedIndexes.length) * 100) / 100;
      next = items.map((item) => item.isLocked ? item : { ...item, ratio: base });
      const distributedTotal = next.reduce((sum, item) => sum + (Number(item.ratio) || 0), 0);
      const delta = Math.round((Number(targetTotal || 0) - distributedTotal) * 100) / 100;

      const lastUnlockedIdx = unlockedIndexes[unlockedIndexes.length - 1];
      if (lastUnlockedIdx !== undefined && delta !== 0) {
        next[lastUnlockedIdx] = {
          ...next[lastUnlockedIdx],
          ratio: Math.max(0, Math.round((Number(next[lastUnlockedIdx].ratio || 0) + delta) * 100) / 100),
        };
      }
    }

    return next;
  };

  const convertLockedValuesByUnit = (items, fromUnitByCount, toUnitByCount) => {
    if (!Array.isArray(items) || items.length === 0 || fromUnitByCount === toUnitByCount) {
      return items;
    }

    const total = Math.max(1, Number(aiTotalQuestions || 0));

    return items.map((item) => {
      if (!item?.isLocked) return item;

      const raw = Math.max(0, Number(item.ratio) || 0);
      let converted = raw;

      if (!fromUnitByCount && toUnitByCount) {
        converted = Math.ceil((raw / 100) * total);
      } else if (fromUnitByCount && !toUnitByCount) {
        converted = Math.ceil(((raw / total) * 100) * 100) / 100;
      }

      return { ...item, ratio: converted };
    });
  };

  const distributeCustomDifficultyEvenly = (unitByCount) => {
    if (unitByCount) {
      const values = splitIntegerRandom(3, Math.max(0, Number(aiTotalQuestions || 0)));
      return { easy: values[0], medium: values[1], hard: values[2] };
    }

    const target = 100;
    const base = Math.floor((target / 3) * 100) / 100;
    const easy = base;
    const medium = base;
    const hard = Math.round((target - easy - medium) * 100) / 100;
    return { easy, medium, hard };
  };

  // Auto-switch to AI tab when user selects source(s) in SourcesPanel
  useEffect(() => {
    if (selectedSourceIds.length > 0) {
      setTab((prev) => (prev === "ai" ? prev : "ai"));
    }
  }, [selectedSourceIds]);

  // Fetch metadata on AI tab active
  useEffect(() => {
    if (tab === "ai") {
      const fetchData = async () => {
        try {
          setMetadataLoading(true);
          setMetadataError("");

          // Fetch metadata for AI config options
          const [qTypeRes, diffRes, bloomRes] = await Promise.all([
            getQuestionTypes(),
            getDifficultyDefinitions(),
            getBloomSkills()
          ]);

          // `api` interceptor trả về trực tiếp `response.data`, nên phải normalize cho cả 2 dạng.
          const toList = (res) => {
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.content)) return res.content;
            return [];
          };

          const questionTypeList = toList(qTypeRes);
          const difficultyList = toList(diffRes);
          const bloomList = toList(bloomRes);

          setQTypes(questionTypeList);
          setDifficultyDefs(difficultyList);
          setBloomSkills(bloomList);
          
          if (difficultyList.length > 0) {
             const defaultDiff = difficultyList.find((d) => d.difficultyName === "EASY") || difficultyList[0];
             setSelectedDifficultyId(defaultDiff.id);
          }
          
          if (questionTypeList.length > 0) {
             const singleChoice = questionTypeList.find((q) => q.questionType === "SINGLE_CHOICE");
             if (singleChoice) {
              setSelectedQTypes([{ questionTypeId: singleChoice.questionTypeId, ratio: 100, isLocked: false }]);
             }
             setQTypeToAdd(String((questionTypeList[0]?.questionTypeId ?? "")));
          }

          if (bloomList.length > 0) {
             const remember = bloomList.find((b) => b.bloomName === "REMEMBER");
             if (remember) {
              setSelectedBloomSkills([{ bloomId: remember.bloomId, ratio: 100, isLocked: false }]);
             }
             setBloomToAdd(String((bloomList[0]?.bloomId ?? "")));
          }

          if (!questionTypeList.length || !difficultyList.length || !bloomList.length) {
            setMetadataError(t("workspace.quiz.aiConfig.metadataEmpty"));
          }

        } catch (e) {
          console.error("Failed to load AI config data", e);
          setMetadataError(e?.message || t("workspace.quiz.aiConfig.metadataLoadFailed"));
        } finally {
          setMetadataLoading(false);
        }
      };
      
      fetchData();
    }
  }, [tab, defaultContextId, t]);

  const handleDifficultyChange = (e) => {
    const val = e.target.value;
    if (val === "CUSTOM") {
      setSelectedDifficultyId("CUSTOM");
      setCustomDifficulty(distributeCustomDifficultyEvenly(questionUnit));
    } else {
      setSelectedDifficultyId(Number(val));
      setQuestionUnit(false);
    }
  };

  useEffect(() => {
    if (selectedDifficultyId !== "CUSTOM" && questionUnit) {
      setQuestionUnit(false);
    }
  }, [selectedDifficultyId, questionUnit]);

  useEffect(() => {
    if (selectedDifficultyId === "CUSTOM") {
      setCustomDifficulty(distributeCustomDifficultyEvenly(questionUnit));
    }
  }, [aiTotalQuestions, questionUnit, selectedDifficultyId]);

  const handleAddQType = () => {
    const id = Number(qTypeToAdd);
    if (!id) return;
    setSelectedQTypes((prev) => {
      if (prev.some((item) => item.questionTypeId === id)) return prev;
      const next = [...prev, { questionTypeId: id, ratio: 0, isLocked: false }];
      return distributeConfigValues(next, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  };

  const handleQTypeRatioChange = (id, ratio) => {
    const raw = Math.max(0, Number(ratio) || 0);
    const parsed = questionTypeUnit ? Math.round(raw) : raw;
    setSelectedQTypes((prev) => {
      const next = prev.map((item) => item.questionTypeId === id ? { ...item, ratio: parsed, isLocked: true } : item);
      return distributeConfigValues(next, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  };

  const handleToggleQTypeLock = (id) => {
    setSelectedQTypes((prev) => {
      const target = prev.find((item) => item.questionTypeId === id);
      if (!target) return prev;
      if (!target.isLocked) {
        const unlockedCount = prev.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) return prev;
      }
      const next = prev.map((item) => item.questionTypeId === id ? { ...item, isLocked: !item.isLocked } : item);
      return distributeConfigValues(next, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  };

  const handleRemoveQType = (id) => {
    setSelectedQTypes((prev) => {
      const next = prev.filter((item) => item.questionTypeId !== id);
      return distributeConfigValues(next, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  };

  const handleAddBloom = () => {
    const id = Number(bloomToAdd);
    if (!id) return;
    setSelectedBloomSkills((prev) => {
      if (prev.some((item) => item.bloomId === id)) return prev;
      const next = [...prev, { bloomId: id, ratio: 0, isLocked: false }];
      return distributeConfigValues(next, getTargetTotal(bloomUnit), bloomUnit);
    });
  };

  const handleBloomRatioChange = (id, ratio) => {
    const raw = Math.max(0, Number(ratio) || 0);
    const parsed = bloomUnit ? Math.round(raw) : raw;
    setSelectedBloomSkills((prev) => {
      const next = prev.map((item) => item.bloomId === id ? { ...item, ratio: parsed, isLocked: true } : item);
      return distributeConfigValues(next, getTargetTotal(bloomUnit), bloomUnit);
    });
  };

  const handleToggleBloomLock = (id) => {
    setSelectedBloomSkills((prev) => {
      const target = prev.find((item) => item.bloomId === id);
      if (!target) return prev;
      if (!target.isLocked) {
        const unlockedCount = prev.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) return prev;
      }
      const next = prev.map((item) => item.bloomId === id ? { ...item, isLocked: !item.isLocked } : item);
      return distributeConfigValues(next, getTargetTotal(bloomUnit), bloomUnit);
    });
  };

  const handleRemoveBloom = (id) => {
    setSelectedBloomSkills((prev) => {
      const next = prev.filter((item) => item.bloomId !== id);
      return distributeConfigValues(next, getTargetTotal(bloomUnit), bloomUnit);
    });
  };

  useEffect(() => {
    if (prevQuestionTypeUnitRef.current !== questionTypeUnit) {
      const fromUnitByCount = prevQuestionTypeUnitRef.current;
      setSelectedQTypes((prev) => {
        const converted = convertLockedValuesByUnit(prev, fromUnitByCount, questionTypeUnit);
        return distributeConfigValues(converted, getTargetTotal(questionTypeUnit), questionTypeUnit);
      });
      prevQuestionTypeUnitRef.current = questionTypeUnit;
      return;
    }

    setSelectedQTypes((prev) => distributeConfigValues(prev, getTargetTotal(questionTypeUnit), questionTypeUnit));
  }, [questionTypeUnit, aiTotalQuestions]);

  useEffect(() => {
    if (prevBloomUnitRef.current !== bloomUnit) {
      const fromUnitByCount = prevBloomUnitRef.current;
      setSelectedBloomSkills((prev) => {
        const converted = convertLockedValuesByUnit(prev, fromUnitByCount, bloomUnit);
        return distributeConfigValues(converted, getTargetTotal(bloomUnit), bloomUnit);
      });
      prevBloomUnitRef.current = bloomUnit;
      return;
    }

    setSelectedBloomSkills((prev) => distributeConfigValues(prev, getTargetTotal(bloomUnit), bloomUnit));
  }, [bloomUnit, aiTotalQuestions]);


  // Wrapper recalculate với maxScore + strategy hiện tại
  const recalculate = (qs) => calculateScores(qs, maxScore, selectedStrategy);

  // Đổi chiến lược chia điểm
  const handleStrategyChange = (strategy) => {
    setSelectedStrategy(strategy);
    setQuestions((prev) => calculateScores(prev, maxScore, strategy));
  };

  // Toggle khóa điểm — luôn giữ ít nhất 1 câu chưa khóa để thuật toán phân bổ hoạt động đúng.
  const handleToggleLock = (idx) => {
    setQuestions((prev) => {
      const q = prev[idx];
      if (q.isLocked) {
        return recalculate(prev.map((item, i) => i === idx ? { ...item, isLocked: false } : item));
      }
      // Không cho khóa nếu đây là câu chưa khóa cuối cùng
      const unlocked = prev.filter(item => !item.isLocked).length;
      if (unlocked <= 1) return prev;
      const next = prev.map((item, i) => i === idx ? { ...item, isLocked: true } : item);
      return calculateScores(next, maxScore);
    });
  };

  // Tự động sinh câu hỏi khi thay đổi tổng số câu — câu mới dùng overallDifficulty
  const handleTotalQuestionsChange = (val) => {
    const count = Math.max(0, Number(val));
    setTotalQuestions(count);
    if (count === 0) { setQuestions([]); return; }
    setQuestions((prev) => {
      const next = count > prev.length
        ? [...prev, ...Array.from({ length: count - prev.length }, () => makeDefaultQuestion(overallDifficulty))]
        : prev.slice(0, count);
      return recalculate(next);
    });
  };

  // Thêm câu hỏi mới — câu mới dùng overallDifficulty hiện tại
  const addQuestion = () => {
    setQuestions((prev) => recalculate([...prev, makeDefaultQuestion(overallDifficulty)]));
    setTotalQuestions((prev) => prev + 1);
  };

  // Xóa câu hỏi
  const removeQuestion = (idx) => {
    setQuestions((prev) => recalculate(prev.filter((_, i) => i !== idx)));
    setTotalQuestions((prev) => Math.max(0, prev - 1));
  };

  // Cập nhật câu hỏi — nếu thay đổi độ khó thì recalculate
  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) => i === idx ? { ...q, [field]: value } : q);
      return field === "difficulty" ? recalculate(next) : next;
    });
  };

  // Thêm đáp án
  const addAnswer = (qIdx) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, answers: [...q.answers, { text: "", correct: false }] } : q
    ));
  };

  // Thủ công chỉnh điểm → khóa câu hỏi đó (chặn nếu là câu cuối cùng chưa khóa)
  const handlePointChange = (idx, value) => {
    const pt = Math.max(0, Math.round(Number(value) * 100) / 100);
    setQuestions((prev) => {
      const q = prev[idx];
      // Nếu câu đang unlocked → sẽ bị auto-lock → kiểm tra phải giữ ≥1 câu unlocked
      if (!q.isLocked) {
        const unlocked = prev.filter(item => !item.isLocked).length;
        if (unlocked <= 1) return prev;
      }
      const next = prev.map((qi, i) => i === idx ? { ...qi, point: pt, isLocked: true } : qi);
      return calculateScores(next, maxScore);
    });
  };

  // Mở khóa điểm → quay về tự động (Đã gộp vào handleToggleLock, giữ lại hàm này nếu cần gọi độc lập, hoặc xóa)
  // const handleUnlockPoint = (idx) => ...

  // Reset tất cả về tự động
  const resetAllScores = () => {
    setQuestions((prev) => recalculate(prev.map((q) => ({ ...q, isLocked: false }))));
  };

  // Thay đổi tổng điểm tối đa
  const handleMaxScoreChange = (val) => {
    const ms = Math.max(0, Number(val));
    setMaxScore(ms);
    setQuestions((prev) => calculateScores(prev, ms, selectedStrategy));
  };

  // Cuộn tới câu hỏi
  const scrollToQuestion = (idx) => {
    document.getElementById(`quiz-q-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const isQuestionMissingCorrectAnswer = (q) => {
    if (q.type === "multipleChoice" || q.type === "multipleSelect") {
      return !(q.answers || []).some((ans) => ans.correct);
    }
    if (q.type === "trueFalse") {
      return q.correctAnswer !== "true" && q.correctAnswer !== "false";
    }
    if (q.type === "fillBlank" || q.type === "shortAnswer") {
      return !String(q.correctAnswer || "").trim();
    }
    return false;
  };

  const buildCorrectAnswerErrorMap = (quizQuestions) => {
    return quizQuestions.reduce((acc, q, idx) => {
      if (isQuestionMissingCorrectAnswer(q)) {
        acc[idx] = t("workspace.quiz.validation.correctAnswerRequiredInline");
      }
      return acc;
    }, {});
  };

  useEffect(() => {
    if (!Object.keys(questionValidationErrors).length) return;
    setQuestionValidationErrors(buildCorrectAnswerErrorMap(questions));
  }, [questions]);

  const findQuestionMissingCorrectAnswer = (quizQuestions) => {
    const errorMap = buildCorrectAnswerErrorMap(quizQuestions);
    const firstInvalid = Object.keys(errorMap)[0];
    return {
      errorMap,
      firstInvalidIndex: firstInvalid === undefined ? -1 : Number(firstInvalid),
    };
  };

  // Xử lý submit — gọi API tạo quiz hoàn chỉnh (multi-step)
  const handleSubmit = async (quizStatus = "ACTIVE") => {
    setSubmitting(true);
    setError("");
    try {
      if (tab === "manual") {
        // Validate cơ bản
        if (!name.trim()) {
          setError(t("workspace.quiz.validation.nameRequired"));
          setSubmitting(false);
          return;
        }
        if (attachToRoadmap && !selectedContextId) {
          setError(t("workspace.quiz.validation.contextRequired"));
          setSubmitting(false);
          return;
        }

        const targetWorkspaceId = attachToRoadmap ? null : Number(defaultContextId);
        const targetKnowledgeId = attachToRoadmap ? Number(selectedContextId) : null;

        const { errorMap, firstInvalidIndex } = findQuestionMissingCorrectAnswer(questions);
        if (firstInvalidIndex !== -1) {
          setQuestionValidationErrors(errorMap);
          setError(t("workspace.quiz.validation.correctAnswerRequired", { index: firstInvalidIndex + 1 }));
          scrollToQuestion(firstInvalidIndex);
          setSubmitting(false);
          return;
        }

        setQuestionValidationErrors({});

        // Gọi API tạo quiz hoàn chỉnh (multi-step: quiz → section → questions → answers)
        const result = await createFullQuiz({
          workspaceId: targetWorkspaceId,
          roadmapId: null,
          phaseId: null,
          knowledgeId: targetKnowledgeId,
          title: name,
          duration,
          quizIntent,
          timerMode,
          passingScore,
          maxAttempt,
          overallDifficulty,
          questions,
          status: quizStatus,
        });

        // Thông báo component cha quiz đã được tạo thành công
        await onCreateQuiz?.({ quizId: result.quizId, title: result.title, ...result });
      } else {
        // Tab AI — gọi API tạo quiz AI
        let newFieldErrors = {};

        if (!aiName.trim()) {
           newFieldErrors.aiName = t("workspace.quiz.validation.nameRequired");
        }
          if (selectedMaterialIds.length === 0) {
            newFieldErrors.selectedMaterialIds = t("workspace.quiz.validation.materialRequired");
          }
        if (!Number.isFinite(aiTotalQuestions) || aiTotalQuestions <= 0) {
           newFieldErrors.aiTotalQuestions = t("workspace.quiz.aiConfig.totalQuestions");
        }
        if (aiTimerMode && (!Number.isFinite(aiDuration) || aiDuration <= 0)) {
           newFieldErrors.aiDuration = t("workspace.quiz.validation.timeDurationRequired");
        }

        // Validate per-question durations when timerMode is false
        if (!aiTimerMode) {
          const easyDur = Number(aiEasyDuration) || 0;
          const mediumDur = Number(aiMediumDuration) || 0;
          const hardDur = Number(aiHardDuration) || 0;

          if (!easyDur || !mediumDur || !hardDur) {
            newFieldErrors.aiDurations = t("workspace.quiz.validation.allDurationsRequired");
          } else {
            if (easyDur < 10 || mediumDur < 10 || hardDur < 10) {
              newFieldErrors.aiDurations = t("workspace.quiz.validation.durationMinimum");
            }
            if (mediumDur <= easyDur) {
              newFieldErrors.aiDurations = t("workspace.quiz.validation.mediumDurationMustBeGreaterThanEasy");
            }
            if (hardDur <= mediumDur) {
              newFieldErrors.aiDurations = t("workspace.quiz.validation.hardDurationMustBeGreaterThanMedium");
            }
          }
        }

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
          setError(Object.values(newFieldErrors)[0]); // Show first error as main error
          setSubmitting(false);
          return;
        }

        const sum = (items, key = "ratio") => items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
        const nearlyEqual = (a, b) => Math.abs(a - b) <= 0.01;
        const questionTarget = questionTypeUnit ? Number(aiTotalQuestions || 0) : 100;
        const bloomTarget = bloomUnit ? Number(aiTotalQuestions || 0) : 100;

        // Construct AI Payload
        const selectedDifficulty = difficultyDefs.find((d) => d.id === selectedDifficultyId);
        const difficultyRatios = selectedDifficultyId === "CUSTOM"
          ? customDifficulty
          : {
              easy: Number(selectedDifficulty?.easyRatio || 0),
              medium: Number(selectedDifficulty?.mediumRatio || 0),
              hard: Number(selectedDifficulty?.hardRatio || 0),
            };

        const difficultyTarget = questionUnit ? Number(aiTotalQuestions || 0) : 100;
        const difficultyTotal = Number(difficultyRatios.easy || 0) + Number(difficultyRatios.medium || 0) + Number(difficultyRatios.hard || 0);
        if (!nearlyEqual(difficultyTotal, difficultyTarget)) {
          setError(questionUnit
            ? t("workspace.quiz.validation.difficultyTotalByCount", { target: difficultyTarget })
            : t("workspace.quiz.validation.difficultyTotalByPercent")
          );
          setSubmitting(false);
          return;
        }

        if (selectedQTypes.length === 0) {
          setError(t("workspace.quiz.validation.questionTypeRequired"));
          setSubmitting(false);
          return;
        }
        const questionTypeTotal = sum(selectedQTypes);
        if (!nearlyEqual(questionTypeTotal, questionTarget)) {
          setError(questionTypeUnit
            ? t("workspace.quiz.validation.questionTypeTotalByCount", { target: questionTarget })
            : t("workspace.quiz.validation.questionTypeTotalByPercent")
          );
          setSubmitting(false);
          return;
        }

        if (selectedBloomSkills.length === 0) {
          setError(t("workspace.quiz.validation.bloomRequired"));
          setSubmitting(false);
          return;
        }
        const bloomTotal = sum(selectedBloomSkills);
        if (!nearlyEqual(bloomTotal, bloomTarget)) {
          setError(bloomUnit
            ? t("workspace.quiz.validation.bloomTotalByCount", { target: bloomTarget })
            : t("workspace.quiz.validation.bloomTotalByPercent")
          );
          setSubmitting(false);
          return;
        }

        const normalizedDuration = Math.max(1, Number(aiDuration) || 1);

        const payload = {
          title: aiName,
          materialIds: selectedMaterialIds,
          overallDifficulty: selectedDifficultyId === "CUSTOM" ? "CUSTOM" : selectedDifficulty?.difficultyName || "MEDIUM",
          durationInMinute: aiTimerMode ? normalizedDuration : 0,
          durationInSecond: 0,
          roadmapId: null,
          phaseId: null,
          knowledgeId: null,
          workspaceId: defaultContextId, // Individual workspace ID
          totalQuestion: aiTotalQuestions,
          prompt: aiPrompt,
          outputLanguage: i18n.language === 'vi' ? 'Vietnamese' : 'English',
          questionTypeUnit,
          questionTypes: selectedQTypes.map((item) => ({ questionTypeId: item.questionTypeId, ratio: Number(item.ratio) || 0 })),
          bloomUnit,
          bloomSkills: selectedBloomSkills.map((item) => ({ bloomId: item.bloomId, ratio: Number(item.ratio) || 0 })),
          quizIntent: aiQuizIntent || "REVIEW",
          questionUnit,
          easyRatio: difficultyRatios.easy,
          mediumRatio: difficultyRatios.medium,
          hardRatio: difficultyRatios.hard,
          timerMode: aiTimerMode,
          ...(aiTimerMode ? {} : {
            easyDurationInSeconds: Math.max(1, Number(aiEasyDuration) || 1),
            mediumDurationInSeconds: Math.max(1, Number(aiMediumDuration) || 1),
            hardDurationInSeconds: Math.max(1, Number(aiHardDuration) || 1),
          })
        };
        
        const result = await generateAIQuiz(payload);
        console.log("AI Quiz Created", result);
        
        await onCreateQuiz?.(result.data || result);
      }
    } catch (err) {
      console.error("Lỗi khi tạo quiz:", err);
      setError(err.message || t("workspace.quiz.validation.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;

  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  const tabCls = (key) => `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
    tab === key
      ? isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm"
      : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass} text-left`;
  const requiredMark = <span className="text-red-500 ml-1">*</span>;

  const normalizeIntegerInput = (value) => {
    if (value === "") return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    return Number(normalized || 0);
  };

  const applyMinOnBlur = (value, setter, minValue = 1) => {
    const next = Number(value);
    setter(Number.isFinite(next) && next >= minValue ? next : minValue);
  };

  // Tổng điểm hiện tại (computed)
  const totalScoreDisplay = Math.round(questions.reduce((s, q) => s + (q.point || 0), 0) * 100) / 100;
  const unlockedCount = questions.filter(q => !q.isLocked).length;

  return (
    <div id="create-quiz-header" className="flex flex-col h-full scroll-mt-20">
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.quiz.createTitle")}
          </p>
        </div>
      </div>

      <div id="create-quiz-scroll-root" className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.quiz.createDesc")}
        </p>

        <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-amber-950/30 text-amber-300 border border-amber-900/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {t("workspace.quiz.validation.requiredFieldsHint")}
        </div>

        {/* Tab chọn chế độ */}
        {/* <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.quiz.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.quiz.tabAI")}</button>
        </div> */}

        {tab === "manual" ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
              <input className={inputCls} placeholder={t("workspace.quiz.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
                    {t("workspace.quiz.contextSelector.attachPrompt")}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                    {attachToRoadmap
                      ? t("workspace.quiz.contextSelector.attachHintYes")
                      : t("workspace.quiz.contextSelector.attachHintNo")}
                  </p>
                </div>
                <div className={`inline-flex rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={() => setAttachToRoadmap(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      attachToRoadmap
                        ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                        : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
                    } ${fontClass}`}
                  >
                    {t("workspace.quiz.contextSelector.attachYes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachToRoadmap(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      !attachToRoadmap
                        ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                        : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
                    } ${fontClass}`}
                  >
                    {t("workspace.quiz.contextSelector.attachNo")}
                  </button>
                </div>
              </div>
            </div>

            {/* Chọn vị trí tạo quiz — mặc định KNOWLEDGE (roadmap → phase → knowledge) */}
            {attachToRoadmap && (
            <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                  {t("workspace.quiz.contextSelector.title")}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                  {t("workspace.quiz.contextSelector.types.KNOWLEDGE")}
                </span>
              </div>

              {/* Chọn roadmap + nút reload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectRoadmap")}</span>
                  <button type="button" onClick={reloadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                    <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={contextLoading}>
                  <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                  {roadmaps.map((rm) => (
                    <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>
                      {rm.title || rm.name || `Roadmap #${rm.roadmapId || rm.id}`}
                    </option>
                  ))}
                </select>
                {!contextLoading && roadmapsLoaded && roadmaps.length === 0 && (
                  <EmptyState messageKey="workspace.quiz.quickCreate.emptyRoadmap" createType="roadmap" />
                )}
              </div>

              {/* Chọn phase + nút reload */}
              {selectedRoadmapId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectPhase")}</span>
                    <button type="button" onClick={reloadPhases} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                      <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <select className={selectCls} value={selectedPhaseId} onChange={(e) => handlePhaseSelect(e.target.value)} disabled={contextLoading}>
                    <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                    {phases.map((ph) => (
                      <option key={ph.phaseId || ph.id} value={ph.phaseId || ph.id}>
                        {ph.title || ph.name || `Phase #${ph.phaseId || ph.id}`}
                      </option>
                    ))}
                  </select>
                  {!contextLoading && phasesLoaded && phases.length === 0 && (
                    <EmptyState messageKey="workspace.quiz.quickCreate.emptyPhase" createType="phase" />
                  )}
                </div>
              )}

              {/* Chọn knowledge + nút reload */}
              {selectedPhaseId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectKnowledge")}</span>
                    <button type="button" onClick={reloadKnowledges} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                      <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <select className={selectCls} value={selectedContextId} onChange={(e) => handleKnowledgeSelect(e.target.value)} disabled={contextLoading}>
                    <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                    {knowledges.map((kn) => (
                      <option key={kn.knowledgeId || kn.id} value={kn.knowledgeId || kn.id}>
                        {kn.title || kn.name || `Knowledge #${kn.knowledgeId || kn.id}`}
                      </option>
                    ))}
                  </select>
                  {!contextLoading && knowledgesLoaded && knowledges.length === 0 && (
                    <EmptyState messageKey="workspace.quiz.quickCreate.emptyKnowledge" createType="knowledge" />
                  )}
                </div>
              )}
            </div>
            )}

            {/* Cấu hình Quiz Intent và Timer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.intent")}{requiredMark}</label>
                <select className={selectCls} value={quizIntent} onChange={(e) => setQuizIntent(e.target.value)}>
                  {QUIZ_INTENTS.map((intent) => <option key={intent} value={intent}>{t(`workspace.quiz.intentLabels.${intent}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.overallDifficulty")}{requiredMark}</label>
                <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle Timer Mode */}
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
                <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.timerMode")}</span>
              </label>
              <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {timerMode ? t("workspace.quiz.timerModeHintOn") : t("workspace.quiz.timerModeHintOff")}
              </span>
            </div>

            <div className={`grid ${timerMode ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
              {/* Thời lượng tổng — chỉ hiện khi timerMode=true */}
              {timerMode && (
                <div>
                  <label className={labelCls}>{t("workspace.quiz.timeDuration")}{requiredMark}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={duration}
                    onChange={(e) => setDuration(normalizeIntegerInput(e.target.value))}
                    onBlur={() => applyMinOnBlur(duration, setDuration, 1)}
                    min={1}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>{t("workspace.quiz.passingScore")}</label>
                <input type="number" className={inputCls} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={10} step={0.5} />
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.maxAttempt")}{requiredMark}</label>
                <input
                  type="number"
                  className={inputCls}
                  value={maxAttempt}
                  onChange={(e) => setMaxAttempt(normalizeIntegerInput(e.target.value))}
                  onBlur={() => applyMinOnBlur(maxAttempt, setMaxAttempt, 1)}
                  min={1}
                />
              </div>
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error}
              </div>
            )}

            {/* Danh sách câu hỏi */}
            <div className="space-y-3">
              {/* Tổng số câu hỏi + Tổng điểm tối đa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("workspace.quiz.totalQuestions")}{requiredMark}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={totalQuestions}
                    onChange={(e) => handleTotalQuestionsChange(normalizeIntegerInput(e.target.value))}
                    min={0}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("workspace.quiz.maxScore")}</label>
                  <input type="number" className={inputCls} value={maxScore} onChange={(e) => handleMaxScoreChange(e.target.value)} min={0} step={0.5} />
                </div>
              </div>

              {/* Scoring Strategy — Chiến lược chia điểm */}
              <div className={`p-3 rounded-xl border transition-all ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-blue-50/50 border-blue-100"}`}>
                <label className={labelCls}>{t("workspace.quiz.scoringStrategy")}</label>
                <select className={selectCls} value={selectedStrategy} onChange={(e) => handleStrategyChange(e.target.value)}>
                  {Object.keys(SCORING_STRATEGIES).map((key) => {
                    const s = SCORING_STRATEGIES[key];
                    return <option key={key} value={key}>{t(`workspace.quiz.strategyName.${key}`)} ({s.easy}-{s.medium}-{s.hard})</option>;
                  })}
                </select>
                <p className={`mt-2 text-xs leading-relaxed text-left ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                  {t(`workspace.quiz.strategyDesc.${selectedStrategy}`)}
                </p>
                {/* Visual Preview — thanh tỷ lệ mini */}
                <div className="flex items-center gap-1.5 mt-2">
                  {["easy", "medium", "hard"].map((d) => {
                    const s = SCORING_STRATEGIES[selectedStrategy];
                    const total = s.easy + s.medium + s.hard;
                    const pct = Math.round((s[d] / total) * 100);
                    const colors = { easy: "bg-green-500", medium: "bg-amber-500", hard: "bg-red-500" };
                    return (
                      <div key={d} className="flex items-center gap-1 flex-1 min-w-0">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${colors[d]}`} style={{ width: `${pct}%`, minWidth: "8px" }} />
                        <span className={`text-[10px] shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t(`workspace.quiz.difficultyLevels.${d}`)} {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question Navigator — điều hướng nhanh */}
              {questions.length > 0 && (
                <div className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                        {t("workspace.quiz.navigator.title")}
                      </span>
                      <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                        totalScoreDisplay > maxScore
                          ? isDarkMode ? "bg-red-950/40 text-red-400" : "bg-red-100 text-red-600"
                          : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-700"
                      }`}>
                        {totalScoreDisplay}/{maxScore} {t("workspace.quiz.navigator.pts")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={resetAllScores} title={t("workspace.quiz.navigator.reset")}
                        className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}>
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* Grid điều hướng */}
                  <div className="flex flex-wrap gap-1.5">
                    {questions.map((q, idx) => {
                      const dc = q.difficulty === "easy" ? (isDarkMode ? "border-green-500/60" : "border-green-400")
                        : q.difficulty === "hard" ? (isDarkMode ? "border-red-500/60" : "border-red-400")
                        : (isDarkMode ? "border-amber-500/60" : "border-amber-400");
                      return (
                        <button key={idx} type="button" onClick={() => scrollToQuestion(idx)}
                          className={`w-8 h-8 rounded-lg text-[11px] font-semibold border-2 flex items-center justify-center relative transition-all active:scale-95 ${dc} ${
                            q.isLocked ? (isDarkMode ? "bg-blue-500/15" : "bg-blue-50") : (isDarkMode ? "bg-slate-800" : "bg-white")
                          } ${isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-100"}`}>
                          {idx + 1}
                          {q.isLocked && <Lock className="w-2 h-2 absolute -top-1 -right-1 text-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                  {/* Cảnh báo vượt tổng điểm */}
                  {totalScoreDisplay > maxScore && (
                    <div className={`text-[11px] px-2 py-1.5 rounded-md flex items-center gap-1.5 ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className={fontClass}>{t("workspace.quiz.navigator.overflow")}</span>
                    </div>
                  )}
                  {/* Chú giải */}
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-sm border-2 ${isDarkMode ? "border-green-500/60" : "border-green-400"}`} />
                      <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.difficultyLevels.easy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-sm border-2 ${isDarkMode ? "border-amber-500/60" : "border-amber-400"}`} />
                      <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.difficultyLevels.medium")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-sm border-2 ${isDarkMode ? "border-red-500/60" : "border-red-400"}`} />
                      <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.difficultyLevels.hard")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className={`w-2.5 h-2.5 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                      <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.navigator.locked")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Navigation Bar */}
              {questions.length > 3 && (
                <div className={`sticky top-0 z-20 flex items-center justify-between px-3 py-2 mb-3 rounded-lg shadow-sm backdrop-blur-md border ${isDarkMode ? "bg-slate-900/90 border-slate-700" : "bg-white/90 border-gray-200"}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <MapPin className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    <input
                      type="number"
                      min={1}
                      max={questions.length}
                      placeholder={t("workspace.quiz.navigator.jumpTo")}
                      className={`text-xs w-full bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? "text-slate-200 placeholder:text-slate-500" : "text-gray-700 placeholder:text-gray-400"} ${fontClass}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const num = Number(e.target.value);
                          if (num >= 1 && num <= questions.length) {
                            scrollToQuestion(num - 1);
                            e.target.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    title={t("workspace.quiz.navigator.scrollTop")}
                    onClick={() => {
                      const root = document.getElementById("create-quiz-scroll-root");
                      if (root) root.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`p-1.5 rounded-full transition-all active:scale-95 ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              )}

              {questions.map((q, qIdx) => {
                const questionError = questionValidationErrors[qIdx];
                return (
                <div key={qIdx} id={`quiz-q-${qIdx}`} className={`rounded-lg border p-3 space-y-2 ${questionError
                  ? (isDarkMode ? "border-red-600/70 bg-red-950/10" : "border-red-300 bg-red-50/60")
                  : (isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50")}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{qIdx + 1}</span>
                      {/* Ô điểm + Nút khóa */}
                      <div className="flex items-center gap-1">
                        <input type="number" className={`w-16 rounded-md border px-1.5 py-0.5 text-xs text-center outline-none transition-all ${
                          q.isLocked
                            ? isDarkMode ? "bg-blue-950/30 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700"
                            : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-gray-100 border-gray-300 text-gray-600"
                        } ${!q.isLocked && unlockedCount <= 1 ? "cursor-not-allowed opacity-60" : ""}`}
                          value={q.point || 0} onChange={(e) => handlePointChange(qIdx, e.target.value)} step={0.01} min={0}
                          readOnly={!q.isLocked && unlockedCount <= 1}
                          title={!q.isLocked && unlockedCount <= 1 ? t("workspace.quiz.navigator.lastUnlocked") : ""} />
                        <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.navigator.pts")}</span>
                        <button type="button" onClick={() => handleToggleLock(qIdx)}
                          disabled={!q.isLocked && unlockedCount <= 1}
                          title={!q.isLocked && unlockedCount <= 1 ? t("workspace.quiz.navigator.lastUnlocked") : q.isLocked ? t("workspace.quiz.navigator.clickUnlock") : t("workspace.quiz.navigator.clickLock")}
                          className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded transition-all border ${!q.isLocked && unlockedCount <= 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${q.isLocked 
                            ? (isDarkMode ? "bg-blue-950/30 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700")
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200" : "bg-gray-100 border-gray-300 text-gray-500 hover:text-gray-700")
                          }`}>
                          {q.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span className={fontClass}>{q.isLocked ? t("workspace.quiz.navigator.locked") : t("workspace.quiz.navigator.auto")}</span>
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeQuestion(qIdx)} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all active:scale-95 text-xs font-medium ${isDarkMode ? "bg-red-950/30 text-red-400 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className={fontClass}>{t("workspace.quiz.deleteQuestion")}</span>
                    </button>
                  </div>

                  {/* Loại câu hỏi + Độ khó + Bloom */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.questionTypeLabel")}</label>
                      <select className={selectCls} value={q.type} onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}>
                        {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`workspace.quiz.types.${qt}`)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.difficultyLabel")}</label>
                      <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestion(qIdx, "difficulty", e.target.value)}>
                        {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.bloomLabel")}</label>
                      <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestion(qIdx, "bloomId", Number(e.target.value))}>
                        {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`workspace.quiz.bloomLevels.${b.key}`)}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.questionTextLabel")}</label>
                    <input className={inputCls} placeholder={t("workspace.quiz.questionText")} value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} />
                  </div>

                  {/* Thời gian mỗi câu (giây) — chỉ hiện khi timerMode=false */}
                  <div className={`grid ${!timerMode ? "grid-cols-2" : ""} gap-2`}>
                    {!timerMode && (
                      <div>
                        <label className={labelCls}>{t("workspace.quiz.questionDuration")}</label>
                        <input type="number" className={inputCls} value={q.duration} onChange={(e) => updateQuestion(qIdx, "duration", Number(e.target.value))} min={0} placeholder="0" />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.explanation")}</label>
                      <input className={inputCls} placeholder={t("workspace.quiz.explanationPlaceholder")} value={q.explanation} onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)} />
                    </div>
                  </div>

                  {/* Đáp án cho multiple choice / multiple select */}
                  {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                    <div className="space-y-1.5 pl-2">
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`q-${qIdx}`} checked={a.correct}
                            onChange={() => {
                              const newAnswers = q.answers.map((ans, ai) => ({
                                ...ans,
                                correct: q.type === "multipleSelect" ? (ai === aIdx ? !ans.correct : ans.correct) : ai === aIdx,
                              }));
                              updateQuestion(qIdx, "answers", newAnswers);
                            }}
                          />
                          <input className={`${inputCls} flex-1`} placeholder={`${t("workspace.quiz.answers")} ${aIdx + 1}`} value={a.text}
                            onChange={(e) => {
                              const newAnswers = [...q.answers];
                              newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                              updateQuestion(qIdx, "answers", newAnswers);
                            }}
                          />
                        </div>
                      ))}
                      <button onClick={() => addAnswer(qIdx)} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> {t("workspace.quiz.addAnswer")}
                      </button>
                    </div>
                  )}
                  {q.type === "trueFalse" && (
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.correctAnswerLabel")}</label>
                      <select className={selectCls} value={q.correctAnswer || "true"}
                        onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)}>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </div>
                  )}
                  {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                    <div>
                      <label className={labelCls}>{t("workspace.quiz.correctAnswerLabel")}</label>
                      <input className={inputCls} placeholder={t("workspace.quiz.correctAnswer")} value={q.correctAnswer || ""}
                        onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)} />
                    </div>
                  )}

                  {questionError && (
                    <div className={`text-xs px-2 py-1 rounded-md ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-100 text-red-700"}`}>
                      {questionError}
                    </div>
                  )}
                </div>
              );})}
              <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                <Plus className="w-4 h-4 mr-2" /> {t("workspace.quiz.addQuestion")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {metadataLoading && (
              <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t("workspace.quiz.aiConfig.loadingMetadata")}
              </div>
            )}
            {metadataError && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-700"}`}>
                {metadataError}
              </div>
            )}

             {/* 1. Basic Info */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
               <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                  <FileText className="w-4 h-4 text-blue-500"/> {t("workspace.quiz.aiConfig.generalInfo")}
               </h3>
               <div className="space-y-3">
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
                    <input 
                      className={`${inputCls} ${fieldErrors.aiName ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`} 
                      placeholder={t("workspace.quiz.namePlaceholder")} 
                      value={aiName} 
                      onChange={(e) => {
                        setAiName(e.target.value);
                        setFieldErrors(prev => ({ ...prev, aiName: "" }));
                      }} 
                    />
                    {fieldErrors.aiName && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.aiName}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.aiConfig.customPromptLabel", "vui lòng nhập yêu cầu của bạn")}</label>
                    <textarea 
                      className={`${inputCls} min-h-[60px] resize-none`} 
                      placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")} 
                      value={aiPrompt} 
                      onChange={(e) => {
                        setAiPrompt(e.target.value);
                      }} 
                    />
                  </div>
               </div>
            </div>

            {/* 2. Selected Materials from Sources Panel */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
               <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                <CheckSquare className="w-4 h-4 text-green-500"/> {t("workspace.quiz.aiConfig.selectedMaterials")}
               </h3>
               {selectedMaterialIds.length > 0 ? (
                 <div className="space-y-2">
                   <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                     {t("workspace.quiz.aiConfig.selectedMaterialsCount", { count: selectedMaterialIds.length })}
                   </div>
                   <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                     {selectedSourceItems.map((item) => (
                       <div key={item.id} className={`text-xs px-2.5 py-1.5 rounded-md border ${isDarkMode ? "border-slate-700 text-slate-300 bg-slate-800/60" : "border-gray-200 text-gray-700 bg-gray-50"}`}>
                         {item.name || `Material #${item.id}`}
                       </div>
                     ))}
                   </div>
                 </div>
               ) : (
                 <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                   {t("workspace.quiz.aiConfig.noSelectedMaterials")}
                 </div>
               )}
               {fieldErrors.selectedMaterialIds && (
                 <p className="text-xs text-red-500 mt-2">{fieldErrors.selectedMaterialIds}</p>
               )}
            </div>

             {/* 3. Settings */}
             <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                  <Sliders className="w-4 h-4 text-gray-500"/> {t("workspace.quiz.aiConfig.settings")}
                </h3>
                <div className={`grid ${aiTimerMode ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                   <div>
                     <label className={labelCls}>{t("workspace.quiz.aiConfig.totalQuestions")}{requiredMark}</label>
                     <input
                       type="number"
                       className={`${inputCls} ${fieldErrors.aiTotalQuestions ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                       value={aiTotalQuestions}
                       onChange={(e) => {
                         setAiTotalQuestions(normalizeIntegerInput(e.target.value));
                         setFieldErrors(prev => ({ ...prev, aiTotalQuestions: "" }));
                       }}
                       onBlur={() => applyMinOnBlur(aiTotalQuestions, setAiTotalQuestions, 1)}
                       min={1}
                     />
                     {fieldErrors.aiTotalQuestions && (
                       <p className="text-xs text-red-500 mt-1">{fieldErrors.aiTotalQuestions}</p>
                     )}
                   </div>
                   {aiTimerMode && (
                     <div>
                       <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes")}{requiredMark}</label>
                       <input
                         type="number"
                         className={`${inputCls} ${fieldErrors.aiDuration ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                         value={aiDuration}
                         onChange={(e) => {
                           setAiDuration(normalizeIntegerInput(e.target.value));
                           setFieldErrors(prev => ({ ...prev, aiDuration: "" }));
                         }}
                         onBlur={() => applyMinOnBlur(aiDuration, setAiDuration, 1)}
                         min={1}
                       />
                       {fieldErrors.aiDuration && (
                         <p className="text-xs text-red-500 mt-1">{fieldErrors.aiDuration}</p>
                       )}
                     </div>
                   )}
                </div>
                <div className="mt-3">
                  <label className={labelCls}>{t("workspace.quiz.aiConfig.examType")}</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiTimerMode(true)}
                      className={`text-left rounded-lg border px-3 py-2 transition-all ${aiTimerMode
                        ? (isDarkMode ? "border-blue-500 bg-blue-950/30 text-blue-300" : "border-blue-400 bg-blue-50 text-blue-700")
                        : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
                      }`}
                    >
                      <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeTimed")}</p>
                      <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintTimed")}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTimerMode(false)}
                      className={`text-left rounded-lg border px-3 py-2 transition-all ${!aiTimerMode
                        ? (isDarkMode ? "border-emerald-500 bg-emerald-950/25 text-emerald-300" : "border-emerald-400 bg-emerald-50 text-emerald-700")
                        : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
                      }`}
                    >
                      <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeSequential")}</p>
                      <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintSequential")}</p>
                    </button>
                  </div>
                  {!aiTimerMode && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>{t("workspace.quiz.aiConfig.easyDuration")} (s)</label>
                        <input
                          type="number"
                          className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                          value={aiEasyDuration}
                          onChange={(e) => {
                            setAiEasyDuration(normalizeIntegerInput(e.target.value));
                            setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                          }}
                          onBlur={() => {
                            if (!aiEasyDuration || Number(aiEasyDuration) <= 0) {
                              setAiEasyDuration(10);
                            }
                          }}
                          min={1}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t("workspace.quiz.aiConfig.mediumDuration")} (s)</label>
                        <input
                          type="number"
                          className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                          value={aiMediumDuration}
                          onChange={(e) => {
                            setAiMediumDuration(normalizeIntegerInput(e.target.value));
                            setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                          }}
                          onBlur={() => {
                            if (!aiMediumDuration || Number(aiMediumDuration) <= 0) {
                              setAiMediumDuration(20);
                            }
                          }}
                          min={1}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t("workspace.quiz.aiConfig.hardDuration")} (s)</label>
                        <input
                          type="number"
                          className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                          value={aiHardDuration}
                          onChange={(e) => {
                            setAiHardDuration(normalizeIntegerInput(e.target.value));
                            setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                          }}
                          onBlur={() => {
                            if (!aiHardDuration || Number(aiHardDuration) <= 0) {
                              setAiHardDuration(30);
                            }
                          }}
                          min={1}
                        />
                      </div>
                    </div>
                  )}
                  {fieldErrors.aiDurations && (
                    <p className="text-xs text-red-500 mt-2">{fieldErrors.aiDurations}</p>
                  )}
                </div>
             </div>

             {/* 4. Difficulty Configuration */}
             <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
               <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                  <Sliders className="w-4 h-4 text-amber-500"/> {t("workspace.quiz.aiConfig.difficultyLevel")}
               </h3>
               <div className="mb-3 flex items-center gap-2">
                 <input
                   type="checkbox"
                   checked={questionUnit}
                   disabled={selectedDifficultyId !== "CUSTOM"}
                   onChange={(e) => setQuestionUnit(e.target.checked)}
                   className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                 />
                   <span className={`text-xs ${isDarkMode?"text-slate-400":"text-gray-600"}`}>{t("workspace.quiz.aiConfig.difficultyUnitByCount")}</span>
               </div>
               <select className={selectCls} value={selectedDifficultyId} onChange={handleDifficultyChange}>
                  {difficultyDefs.map(d => (
                    <option key={d.id} value={d.id}>{d.difficultyName} ({d.easyRatio}-{d.mediumRatio}-{d.hardRatio})</option>
                  ))}
                  <option value="CUSTOM">{t("workspace.quiz.aiConfig.customSelfConfig")}</option>
               </select>

               {selectedDifficultyId === "CUSTOM" && (
                 <div className="mt-3 grid grid-cols-3 gap-2">
                    {["easy", "medium", "hard"].map(level => (
                      <div key={level}>
                        <label className={`text-[10px] uppercase font-bold mb-1 block ${isDarkMode?"text-slate-500":"text-gray-500"}`}>{level} ({questionUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"})</label>
                        <input
                          type="number"
                          className={inputCls}
                          value={customDifficulty[level]}
                          onChange={e => {
                            const raw = Math.max(0, Number(e.target.value) || 0);
                            const value = questionUnit ? Math.round(raw) : raw;
                            setCustomDifficulty(prev => ({ ...prev, [level]: value }));
                          }}
                        />
                      </div>
                    ))}
                 </div>
               )}
             </div>

             {/* 5. Question Types & Bloom Skills */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Question Types */}
                <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                   <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                      <Sparkles className="w-4 h-4 text-purple-500"/> {t("workspace.quiz.aiConfig.questionTypes")}
                   </h3>
                   <div className="mb-3 flex items-center gap-2">
                    <input type="checkbox" checked={questionTypeUnit} onChange={(e) => setQuestionTypeUnit(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className={`text-xs ${isDarkMode?"text-slate-400":"text-gray-600"}`}>{t("workspace.quiz.aiConfig.questionTypeUnitByCount")}</span>
                   </div>
                   {/* Chip toggles — click to select/deselect */}
                   <div className="flex flex-wrap gap-2 mb-3">
                     {qTypes.map((qt) => {
                       const isSelected = selectedQTypes.some((s) => s.questionTypeId === qt.questionTypeId);
                       return (
                         <button
                           key={qt.questionTypeId}
                           type="button"
                           onClick={() => {
                             if (isSelected) {
                               handleRemoveQType(qt.questionTypeId);
                             } else {
                               setSelectedQTypes((prev) => {
                                 const next = [...prev, { questionTypeId: qt.questionTypeId, ratio: 0, isLocked: false }];
                                 return distributeConfigValues(next, getTargetTotal(questionTypeUnit), questionTypeUnit);
                               });
                             }
                           }}
                           className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                             isSelected
                               ? isDarkMode ? "bg-blue-600/30 border-blue-500 text-blue-300" : "bg-blue-100 border-blue-400 text-blue-700"
                               : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                           }`}
                         >
                           {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                           {qt.questionType}
                         </button>
                       );
                     })}
                   </div>
                   {/* Ratio inputs for selected items */}
                   <div className="space-y-2">
                     {selectedQTypes.map((item) => {
                       const detail = qTypes.find((q) => q.questionTypeId === item.questionTypeId);
                       return (
                         <div key={item.questionTypeId} className={`flex items-center gap-2 text-xs p-2 rounded-md border ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                           <span className="flex-1 truncate" title={detail?.description}>{detail?.questionType || `Type #${item.questionTypeId}`}</span>
                           <input
                             type="number"
                             className={`w-16 p-1 text-center border rounded ${isDarkMode?"bg-slate-800 border-slate-700":"bg-white border-gray-200"}`}
                             value={item.ratio}
                             onChange={(e) => handleQTypeRatioChange(item.questionTypeId, e.target.value)}
                           />
                           <span>{questionTypeUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                           <button
                             type="button"
                             onClick={() => handleToggleQTypeLock(item.questionTypeId)}
                             className={`p-1 rounded ${item.isLocked ? "text-blue-500" : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                             title={item.isLocked ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                           >
                             {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                           </button>
                         </div>
                       );
                     })}
                   </div>
                </div>

                {/* Bloom Skills */}
                 <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
                   <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                      <BrainCircuit className="w-4 h-4 text-teal-500"/> {t("workspace.quiz.aiConfig.bloomSkills")}
                   </h3>
                   <div className="mb-3 flex items-center gap-2">
                     <input type="checkbox" checked={bloomUnit} onChange={(e) => setBloomUnit(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                     <span className={`text-xs ${isDarkMode?"text-slate-400":"text-gray-600"}`}>{t("workspace.quiz.aiConfig.bloomUnitByCount")}</span>
                   </div>
                   {/* Chip toggles — click to select/deselect */}
                   <div className="flex flex-wrap gap-2 mb-3">
                     {bloomSkills.map((bs) => {
                       const isSelected = selectedBloomSkills.some((s) => s.bloomId === bs.bloomId);
                       return (
                         <button
                           key={bs.bloomId}
                           type="button"
                           onClick={() => {
                             if (isSelected) {
                               handleRemoveBloom(bs.bloomId);
                             } else {
                               setSelectedBloomSkills((prev) => {
                                 const next = [...prev, { bloomId: bs.bloomId, ratio: 0, isLocked: false }];
                                 return distributeConfigValues(next, getTargetTotal(bloomUnit), bloomUnit);
                               });
                             }
                           }}
                           className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                             isSelected
                               ? isDarkMode ? "bg-teal-600/30 border-teal-500 text-teal-300" : "bg-teal-100 border-teal-400 text-teal-700"
                               : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                           }`}
                         >
                           {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                           {bs.bloomName}
                         </button>
                       );
                     })}
                   </div>
                   {/* Ratio inputs for selected items */}
                   <div className="space-y-2">
                     {selectedBloomSkills.map((item) => {
                       const detail = bloomSkills.find((b) => b.bloomId === item.bloomId);
                       return (
                         <div key={item.bloomId} className={`flex items-center gap-2 text-xs p-2 rounded-md border ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                           <span className="flex-1 truncate" title={detail?.description}>{detail?.bloomName || `Bloom #${item.bloomId}`}</span>
                           <input
                             type="number"
                             className={`w-16 p-1 text-center border rounded ${isDarkMode?"bg-slate-800 border-slate-700":"bg-white border-gray-200"}`}
                             value={item.ratio}
                             onChange={(e) => handleBloomRatioChange(item.bloomId, e.target.value)}
                           />
                           <span>{bloomUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                           <button
                             type="button"
                             onClick={() => handleToggleBloomLock(item.bloomId)}
                             className={`p-1 rounded ${item.isLocked ? "text-blue-500" : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                             title={item.isLocked ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                           >
                             {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                           </button>
                         </div>
                       );
                     })}
                   </div>
                </div>
             </div>

          </div>
        )}

      </div>

      {/* Nút hành động cố định dưới cùng */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.quiz.cancel")}
        </Button>
        {tab === "manual" && (
          <Button variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={submitting}
            className={`${isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("workspace.quiz.saveDraft")}
          </Button>
        )}
        <Button onClick={() => handleSubmit("ACTIVE")} disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
          {tab === "manual"
            ? (submitting ? t("workspace.quiz.creating") : t("workspace.quiz.createActive"))
            : (submitting ? t("workspace.quiz.generating") : t("workspace.quiz.generateAI"))
          }
        </Button>
      </div>

      {/* Dialog tạo nhanh Roadmap / Phase / Knowledge */}
      <QuickCreateDialog
        open={!!quickCreateType}
        onOpenChange={(val) => { if (!val) setQuickCreateType(null); }}
        type={quickCreateType || "roadmap"}
        isDarkMode={isDarkMode}
        createFn={getQuickCreateFn()}
        onCreated={handleQuickCreated}
      />
    </div>
  );
}

export default CreateQuizForm;
