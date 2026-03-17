import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { Plus, Loader2, BadgeCheck, ArrowLeft, Save, Rocket, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFullQuiz } from "@/api/QuizAPI";
import { getRoadmapsByGroup, getPhasesByRoadmap, getKnowledgesByPhase, createRoadmap, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import { getMaterialsByWorkspace } from "@/api/MaterialAPI";
import { generateAIQuiz, getQuestionTypes, getDifficultyDefinitions, getBloomSkills } from "@/api/AIAPI";
import { getWorkspacesByUser } from "@/api/WorkspaceAPI";
import QuickCreateDialog from "@/Pages/Users/Individual/Workspace/Components/QuickCreateDialog";
import AIQuizTab from "./AIQuizTab";
import ManualQuizTab from "./ManualQuizTab";
import { buildAiQuizPayload, validateAiDistributions } from "./aiConfigUtils";

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
// Quiz luôn tạo ở context KNOWLEDGE
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

// Form tạo Quiz cho Group — hiển thị inline trong ChatPanel thay vì popup
function CreateQuizForm({ isDarkMode = false, onCreateQuiz, onBack, contextType: defaultContextType = "GROUP", contextId: defaultContextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [questionValidationErrors, setQuestionValidationErrors] = useState({});

  // Quiz luôn ở context KNOWLEDGE — không cần chọn
  const selectedContextType = FIXED_CONTEXT_TYPE;
  const [selectedContextId, setSelectedContextId] = useState("");
  const [attachToRoadmap, setAttachToRoadmap] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  // Dữ liệu cascade dropdown: roadmap → phase → knowledge (từ group hiện tại)
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

  // Tải danh sách roadmap từ group hiện tại
  const loadRoadmaps = useCallback(async () => {
    if (!defaultContextId) return;
    setContextLoading(true);
    try {
      const res = await getRoadmapsByGroup(defaultContextId, 0, 100);
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

  // Khi chọn roadmap — tải phases
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

  // Khi chọn phase — luôn tải knowledges (vì context = KNOWLEDGE)
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
    if (quickCreateType === "roadmap") return (data) => createRoadmap({ ...data, groupId: defaultContextId });
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

  // State cho tab AI
  const [aiName, setAiName] = useState("");
  // const [aiDifficulty, setAiDifficulty] = useState("medium"); // replaced by proper difficulty handling
  const [aiTotalQuestions, setAiTotalQuestions] = useState(10);
  const [aiDuration, setAiDuration] = useState(15);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuizIntent, setAiQuizIntent] = useState("REVIEW");
  const [aiTimerMode, setAiTimerMode] = useState(true);

  // AI Configuration States
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [difficultyDefs, setDifficultyDefs] = useState([]);
  const [selectedDifficultyId, setSelectedDifficultyId] = useState(""); // ID or "CUSTOM"
  const [customDifficulty, setCustomDifficulty] = useState({ easy: 30, medium: 40, hard: 30 });
  const [qTypes, setQTypes] = useState([]);
  const [selectedQTypes, setSelectedQTypes] = useState([]); // { questionTypeId, ratio }
  const [bloomSkills, setBloomSkills] = useState([]);
  const [selectedBloomSkills, setSelectedBloomSkills] = useState([]); // { bloomId, ratio }
  const [workspaceId, setWorkspaceId] = useState(null);
  const [questionTypeUnit, setQuestionTypeUnit] = useState(false); // false: %, true: count
  const [bloomUnit, setBloomUnit] = useState(false); // false: %, true: count
  const [questionUnit, setQuestionUnit] = useState(false); // false: %, true: count
  const [aiOutputLanguage, setAiOutputLanguage] = useState("Vietnamese");
  const prevQuestionTypeUnitRef = useRef(questionTypeUnit);
  const prevBloomUnitRef = useRef(bloomUnit);

  const getTargetTotal = (unitByCount) => (unitByCount ? Math.max(0, Number(aiTotalQuestions || 0)) : 100);

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
    const integerTotal = Math.max(0, Math.round(Number(total) || 0));
    const base = Math.floor(integerTotal / parts);
    const remainder = integerTotal - (base * parts);
    const values = Array(parts).fill(base);
    const indexes = shuffle(Array.from({ length: parts }, (_, i) => i));
    for (let i = 0; i < remainder; i += 1) {
      values[indexes[i]] += 1;
    }
    return values;
  };

  const redistributeConfigValues = (items, unitByCount) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const targetTotal = getTargetTotal(unitByCount);

    if (unitByCount) {
      const split = splitIntegerRandom(items.length, targetTotal);
      return items.map((item, idx) => ({ ...item, ratio: split[idx] || 0 }));
    }

    const base = Math.floor((targetTotal / items.length) * 100) / 100;
    const next = items.map((item) => ({ ...item, ratio: base }));
    const assigned = next.reduce((sum, item) => sum + (Number(item.ratio) || 0), 0);
    const delta = Math.round((targetTotal - assigned) * 100) / 100;
    const lastIndex = next.length - 1;
    if (lastIndex >= 0 && delta !== 0) {
      next[lastIndex] = {
        ...next[lastIndex],
        ratio: Math.max(0, Math.round((Number(next[lastIndex].ratio || 0) + delta) * 100) / 100),
      };
    }
    return next;
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

  const convertValuesByUnit = (items, fromUnitByCount, toUnitByCount) => {
    if (!Array.isArray(items) || items.length === 0 || fromUnitByCount === toUnitByCount) {
      return items;
    }

    const total = Math.max(1, Number(aiTotalQuestions || 0));
    const converted = items.map((item) => {
      const raw = Math.max(0, Number(item.ratio) || 0);
      let ratio = raw;

      if (!fromUnitByCount && toUnitByCount) {
        ratio = Math.ceil((raw / 100) * total);
      } else if (fromUnitByCount && !toUnitByCount) {
        ratio = Math.ceil(((raw / total) * 100) * 100) / 100;
      }

      return { ...item, ratio };
    });

    const targetTotal = toUnitByCount ? total : 100;
    const currentTotal = converted.reduce((sum, item) => sum + (Number(item.ratio) || 0), 0);
    if (currentTotal === targetTotal || converted.length === 0) return converted;

    const lastIndex = converted.length - 1;
    if (toUnitByCount) {
      const delta = Math.round(targetTotal - currentTotal);
      converted[lastIndex] = {
        ...converted[lastIndex],
        ratio: Math.max(0, Math.round((Number(converted[lastIndex].ratio) || 0) + delta)),
      };
    } else {
      const delta = Math.round((targetTotal - currentTotal) * 100) / 100;
      converted[lastIndex] = {
        ...converted[lastIndex],
        ratio: Math.max(0, Math.round(((Number(converted[lastIndex].ratio) || 0) + delta) * 100) / 100),
      };
    }

    return converted;
  };

  // Fetch metadata on AI tab active
  useEffect(() => {
    if (tab === "ai") {
      const fetchData = async () => {
        setLoadingMetadata(true);
        try {
          const resolveList = (res) => {
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.content)) return res.content;
            if (Array.isArray(res?.data?.content)) return res.data.content;
            return [];
          };

          // 1. Get Workspace ID
          let wsId = null;
          if (defaultContextType === "WORKSPACE" || defaultContextType === "GROUP") {
            wsId = Number(defaultContextId);
          } else {
            // Fetch users workspaces and pick first
            const wsRes = await getWorkspacesByUser(0, 5);
            const workspaces = resolveList(wsRes);
            if (workspaces.length > 0) {
              wsId = workspaces[0].workspaceId;
            }
          }
          setWorkspaceId(wsId);

          if (wsId) {
            // 2. Fetch Materials
            const matRes = await getMaterialsByWorkspace(wsId);
            setMaterials(resolveList(matRes));
          }

          // 3. Fetch Metadata
          const [qTypeRes, diffRes, bloomRes] = await Promise.all([
            getQuestionTypes(),
            getDifficultyDefinitions(),
            getBloomSkills()
          ]);
          const qTypeData = resolveList(qTypeRes);
          const diffData = resolveList(diffRes);
          const bloomData = resolveList(bloomRes);

          setQTypes(qTypeData);
          setDifficultyDefs(diffData);
          setBloomSkills(bloomData);
          
          if (diffData.length > 0) {
            // Default to first difficulty (normally EASY or MEDIUM) or one that is not CUSTOM
             const defaultDiff = diffData.find(d => d.difficultyName === "EASY") || diffData[0];
             setSelectedDifficultyId(defaultDiff.id);
          }
          
          if (qTypeData.length > 0) {
             // Select all by default or first few? Let's select Single Choice by default
             const singleChoice = qTypeData.find(q => q.questionType === "SINGLE_CHOICE");
             if (singleChoice) setSelectedQTypes([{ questionTypeId: singleChoice.questionTypeId, ratio: 100 }]);
          }

          if (bloomData.length > 0) {
             // Default bloom
             const remember = bloomData.find(b => b.bloomName === "REMEMBER");
             if (remember) setSelectedBloomSkills([{ bloomId: remember.bloomId, ratio: 100 }]);
          }

        } catch (e) {
          console.error("Failed to load AI config data", e);
        } finally {
          setLoadingMetadata(false);
        }
      };
      
      fetchData();
    }
  }, [tab, defaultContextType, defaultContextId]);

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

  const handleToggleMaterial = (id) => {
    setSelectedMaterialIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleQType = (id) => {
    setSelectedQTypes(prev => {
      const exists = prev.find(x => x.questionTypeId === id);
      if (exists) {
        const next = prev.filter(x => x.questionTypeId !== id);
        return redistributeConfigValues(next, questionTypeUnit);
      }
      const next = [...prev, { questionTypeId: id, ratio: 0 }];
      return redistributeConfigValues(next, questionTypeUnit);
    });
  };

  const handleQTypeRatioChange = (id, ratio) => {
    const raw = Math.max(0, Number(ratio) || 0);
    const parsed = questionTypeUnit ? Math.round(raw) : raw;
    setSelectedQTypes(prev => prev.map(x => x.questionTypeId === id ? { ...x, ratio: parsed } : x));
  };

  const handleToggleBloom = (id) => {
    setSelectedBloomSkills(prev => {
      const exists = prev.find(x => x.bloomId === id);
      if (exists) {
        const next = prev.filter(x => x.bloomId !== id);
        return redistributeConfigValues(next, bloomUnit);
      }
      const next = [...prev, { bloomId: id, ratio: 0 }];
      return redistributeConfigValues(next, bloomUnit);
    });
  };

  const handleBloomRatioChange = (id, ratio) => {
    const raw = Math.max(0, Number(ratio) || 0);
    const parsed = bloomUnit ? Math.round(raw) : raw;
    setSelectedBloomSkills(prev => prev.map(x => x.bloomId === id ? { ...x, ratio: parsed } : x));
  };

  useEffect(() => {
    if (prevQuestionTypeUnitRef.current !== questionTypeUnit) {
      const fromUnitByCount = prevQuestionTypeUnitRef.current;
      setSelectedQTypes((prev) => convertValuesByUnit(prev, fromUnitByCount, questionTypeUnit));
      prevQuestionTypeUnitRef.current = questionTypeUnit;
      return;
    }

    setSelectedQTypes((prev) => redistributeConfigValues(prev, questionTypeUnit));
  }, [questionTypeUnit, aiTotalQuestions]);

  useEffect(() => {
    if (prevBloomUnitRef.current !== bloomUnit) {
      const fromUnitByCount = prevBloomUnitRef.current;
      setSelectedBloomSkills((prev) => convertValuesByUnit(prev, fromUnitByCount, bloomUnit));
      prevBloomUnitRef.current = bloomUnit;
      return;
    }

    setSelectedBloomSkills((prev) => redistributeConfigValues(prev, bloomUnit));
  }, [bloomUnit, aiTotalQuestions]);

  // Wrapper recalculate với maxScore + strategy hiện tại
  const recalculate = (qs) => calculateScores(qs, maxScore, selectedStrategy);

  // Đổi chiến lược chia điểm
  const handleStrategyChange = (strategy) => {
    setSelectedStrategy(strategy);
    setQuestions((prev) => calculateScores(prev, maxScore, strategy));
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

  // Mở khóa điểm → quay về tự động
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

        // Validate phải chọn knowledge
        if (attachToRoadmap && !selectedContextId) {
          setError(t("workspace.quiz.validation.contextRequired"));
          setSubmitting(false);
          return;
        }

        const targetKnowledgeId = attachToRoadmap ? selectedContextId : null;

        const { errorMap, firstInvalidIndex } = findQuestionMissingCorrectAnswer(questions);
        if (firstInvalidIndex !== -1) {
          setQuestionValidationErrors(errorMap);
          setError(t("workspace.quiz.validation.correctAnswerRequired", { index: firstInvalidIndex + 1 }));
          scrollToQuestion(firstInvalidIndex);
          setSubmitting(false);
          return;
        }

        setQuestionValidationErrors({});

        // Gọi API tạo quiz hoàn chỉnh (multi-step: quiz → session → questions → answers)
        const result = await createFullQuiz({
          workspaceId: null,
          roadmapId: null,
          phaseId: null,
          knowledgeId: selectedContextType === 'KNOWLEDGE' ? targetKnowledgeId : null,
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
        if (!aiName.trim()) {
           setError(t("workspace.quiz.validation.nameRequired"));
           setSubmitting(false);
           return;
        }
        if (!Number.isFinite(aiTotalQuestions) || aiTotalQuestions <= 0) {
           setError(t("workspace.quiz.aiConfig.totalQuestions"));
           setSubmitting(false);
           return;
        }
        if (selectedMaterialIds.length === 0 && !aiPrompt.trim()) {
           setError(t("Please select at least one material or provide a prompt."));
           setSubmitting(false);
           return;
        }
        if (!workspaceId) {
            setError("Workspace ID not found.");
            setSubmitting(false);
            return;
        }

        const selectedDifficulty = difficultyDefs.find((d) => d.id === selectedDifficultyId);
        const difficultyRatios = selectedDifficultyId === "CUSTOM"
          ? {
              easy: Math.max(0, Number(customDifficulty.easy) || 0),
              medium: Math.max(0, Number(customDifficulty.medium) || 0),
              hard: Math.max(0, Number(customDifficulty.hard) || 0),
            }
          : {
              easy: Math.max(0, Number(selectedDifficulty?.easyRatio) || 0),
              medium: Math.max(0, Number(selectedDifficulty?.mediumRatio) || 0),
              hard: Math.max(0, Number(selectedDifficulty?.hardRatio) || 0),
            };

        const distributionError = validateAiDistributions({
          aiTotalQuestions,
          difficultyRatios,
          selectedQTypes,
          selectedBloomSkills,
          questionUnit,
          questionTypeUnit,
          bloomUnit,
        });

        if (distributionError) {
          setError(distributionError);
          setSubmitting(false);
          return;
        }

        const payload = buildAiQuizPayload({
          aiName,
          selectedMaterialIds,
          selectedDifficultyId,
          selectedDifficulty,
          difficultyRatios,
          aiDuration,
          workspaceId,
          aiTotalQuestions,
          aiPrompt,
          aiOutputLanguage,
          questionTypeUnit,
          selectedQTypes,
          bloomUnit,
          selectedBloomSkills,
          aiQuizIntent,
          questionUnit,
          aiTimerMode,
        });
        
        const result = await generateAIQuiz(payload);
        // Assuming result returns quizId or similar. The user mock response showed "quizId": 1
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

        {/* Tab chọn chế độ */}
        {/* <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.quiz.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.quiz.tabAI")}</button>
        </div> */}

        {tab === "manual" ? (
          <ManualQuizTab
            t={t}
            isDarkMode={isDarkMode}
            fontClass={fontClass}
            labelCls={labelCls}
            inputCls={inputCls}
            selectCls={selectCls}
            name={name}
            setName={setName}
            attachToRoadmap={attachToRoadmap}
            setAttachToRoadmap={setAttachToRoadmap}
            selectedRoadmapId={selectedRoadmapId}
            handleRoadmapSelect={handleRoadmapSelect}
            contextLoading={contextLoading}
            roadmaps={roadmaps}
            roadmapsLoaded={roadmapsLoaded}
            reloadRoadmaps={reloadRoadmaps}
            phases={phases}
            phasesLoaded={phasesLoaded}
            selectedPhaseId={selectedPhaseId}
            handlePhaseSelect={handlePhaseSelect}
            reloadPhases={reloadPhases}
            knowledges={knowledges}
            knowledgesLoaded={knowledgesLoaded}
            selectedContextId={selectedContextId}
            handleKnowledgeSelect={handleKnowledgeSelect}
            reloadKnowledges={reloadKnowledges}
            EmptyState={EmptyState}
            quizIntent={quizIntent}
            setQuizIntent={setQuizIntent}
            QUIZ_INTENTS={QUIZ_INTENTS}
            overallDifficulty={overallDifficulty}
            setOverallDifficulty={setOverallDifficulty}
            DIFFICULTY_LEVELS={DIFFICULTY_LEVELS}
            timerMode={timerMode}
            setTimerMode={setTimerMode}
            duration={duration}
            setDuration={setDuration}
            passingScore={passingScore}
            setPassingScore={setPassingScore}
            maxAttempt={maxAttempt}
            setMaxAttempt={setMaxAttempt}
            error={error}
            totalQuestions={totalQuestions}
            handleTotalQuestionsChange={handleTotalQuestionsChange}
            maxScore={maxScore}
            handleMaxScoreChange={handleMaxScoreChange}
            selectedStrategy={selectedStrategy}
            handleStrategyChange={handleStrategyChange}
            SCORING_STRATEGIES={SCORING_STRATEGIES}
            questions={questions}
            totalScoreDisplay={totalScoreDisplay}
            resetAllScores={resetAllScores}
            scrollToQuestion={scrollToQuestion}
            questionValidationErrors={questionValidationErrors}
            handlePointChange={handlePointChange}
            unlockedCount={unlockedCount}
            handleToggleLock={handleToggleLock}
            removeQuestion={removeQuestion}
            updateQuestion={updateQuestion}
            QUESTION_TYPES={QUESTION_TYPES}
            BLOOM_LEVELS={BLOOM_LEVELS}
            addAnswer={addAnswer}
            addQuestion={addQuestion}
          />
        ) : (
          <AIQuizTab
            t={t}
            isDarkMode={isDarkMode}
            labelCls={labelCls}
            inputCls={inputCls}
            selectCls={selectCls}
            aiName={aiName}
            setAiName={setAiName}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiQuizIntent={aiQuizIntent}
            setAiQuizIntent={setAiQuizIntent}
            quizIntents={QUIZ_INTENTS}
            aiOutputLanguage={aiOutputLanguage}
            setAiOutputLanguage={setAiOutputLanguage}
            loadingMetadata={loadingMetadata}
            materials={materials}
            selectedMaterialIds={selectedMaterialIds}
            onToggleMaterial={handleToggleMaterial}
            selectedDifficultyId={selectedDifficultyId}
            onDifficultyChange={handleDifficultyChange}
            difficultyDefs={difficultyDefs}
            customDifficulty={customDifficulty}
            setCustomDifficulty={setCustomDifficulty}
            questionUnit={questionUnit}
            setQuestionUnit={setQuestionUnit}
            questionTypeUnit={questionTypeUnit}
            setQuestionTypeUnit={setQuestionTypeUnit}
            qTypes={qTypes}
            selectedQTypes={selectedQTypes}
            onToggleQType={handleToggleQType}
            onQTypeRatioChange={handleQTypeRatioChange}
            bloomUnit={bloomUnit}
            setBloomUnit={setBloomUnit}
            bloomSkills={bloomSkills}
            selectedBloomSkills={selectedBloomSkills}
            onToggleBloom={handleToggleBloom}
            onBloomRatioChange={handleBloomRatioChange}
            aiTotalQuestions={aiTotalQuestions}
            setAiTotalQuestions={setAiTotalQuestions}
            aiTimerMode={aiTimerMode}
            setAiTimerMode={setAiTimerMode}
            aiDuration={aiDuration}
            setAiDuration={setAiDuration}
          />
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
