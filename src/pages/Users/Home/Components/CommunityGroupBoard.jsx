import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  ClipboardCopy,
  Compass,
  FileText,
  Layers3,
  Loader2,
  MessageSquareText,
  ShieldPlus,
  Target,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import ListSpinner from "@/components/ui/ListSpinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGroupLearningMode, formatGroupRole } from "@/pages/Users/Group/utils/groupDisplay";

function truncateText(value, maxLength = 100) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trim()}…`;
}

function formatDateLabel(value, locale) {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function buildCapacitySummary(group, t) {
  const limit = Number(group?.memberSeatLimit);
  const active = Number(group?.activeMemberCount ?? group?.memberCount ?? 0);
  const pending = Number(group?.pendingInvitationCount ?? 0);
  const remaining = Number(group?.remainingSeatCount ?? 0);

  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  return t("home.groupHub.capacitySummary", {
    active,
    pending,
    remaining,
    limit,
  });
}

function getSectionLabels(group, t) {
  const sections = [
    {
      key: "discussion",
      label: t("home.groupHub.sections.discussion"),
      Icon: MessageSquareText,
    },
    {
      key: "materials",
      label: t("home.groupHub.sections.materials"),
      Icon: FileText,
    },
    {
      key: "quiz",
      label: t("home.groupHub.sections.quiz"),
      Icon: BookOpen,
    },
  ];

  if (group?.roadmapEnabled) {
    sections.unshift({
      key: "roadmap",
      label: t("home.groupHub.sections.roadmap"),
      Icon: Compass,
    });
  }

  if (group?.examName) {
    sections.push({
      key: "mockTest",
      label: t("home.groupHub.sections.mockTest"),
      Icon: Target,
    });
  }

  return sections;
}

function getPillTone(tone, isDarkMode) {
  const tones = {
    neutral: isDarkMode
      ? "bg-slate-900 text-slate-300 ring-1 ring-inset ring-slate-800"
      : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    blue: isDarkMode
      ? "bg-blue-500/12 text-blue-200 ring-1 ring-inset ring-blue-400/20"
      : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    emerald: isDarkMode
      ? "bg-emerald-500/12 text-emerald-200 ring-1 ring-inset ring-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    amber: isDarkMode
      ? "bg-amber-500/12 text-amber-200 ring-1 ring-inset ring-amber-400/20"
      : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    violet: isDarkMode
      ? "bg-violet-500/12 text-violet-200 ring-1 ring-inset ring-violet-400/20"
      : "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    cyan: isDarkMode
      ? "bg-cyan-500/12 text-cyan-200 ring-1 ring-inset ring-cyan-400/20"
      : "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200",
  };

  return tones[tone] || tones.neutral;
}

function getSectionTone(key) {
  if (key === "roadmap") return "violet";
  if (key === "discussion") return "cyan";
  if (key === "materials") return "amber";
  if (key === "quiz") return "blue";
  if (key === "mockTest") return "emerald";
  return "neutral";
}

function MetaPill({ icon: Icon, children, isDarkMode, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${getPillTone(tone, isDarkMode)}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </span>
  );
}

function DetailRow({ label, value, isDarkMode }) {
  if (!value) return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        isDarkMode
          ? "border-slate-800 bg-slate-950/80"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <p className={`text-[11px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}

// === BE CONTRACT FE đang giả định (cập nhật khi BE confirm) ===========
// Shape mở rộng cho `GroupResponse` (ở /api/group/public, /workspace/me, ...):
//   {
//     workspaceId: number;
//     groupName: string;
//     ...existing fields...
//     isPublic: boolean;                                  // (legacy, vẫn chấp nhận)
//     joinPolicy?: 'FREE' | 'REQUEST_APPROVAL';           // mới — phân biệt 2 loại public
//     groupCode?: string;                                 // mới — 12 ký tự alnum, unique toàn hệ thống
//     myJoinRequestStatus?: 'PENDING'                     // mới — viewer's request state với group này
//                          | 'APPROVED' | 'REJECTED' | 'CANCELLED';
//   }
// Note BE generate `groupCode`: BE phải đảm bảo unique (DB constraint), 12 ký
// tự alphanumeric (FE chỉ format display, không validate uniqueness). Search
// theo `groupCode` exact-match (case-insensitive, strip non-alnum) là sufficient.
// =====================================================================

// Group code BE gen 12 ký tự unique — display format: `XXXX-XXXX-XXXX` (4-4-4)
// để dễ đọc/copy. Regex linh hoạt: BE có thể dùng alphanumeric upper, BE
// implementation decide; FE chỉ format khi display, value lưu nguyên bản 12 ký tự.
function formatGroupCode(rawCode) {
  const code = String(rawCode || "").replace(/[^A-Za-z0-9]/g, "");
  if (code.length !== 12) return rawCode || "";
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

// Detect input pattern khả nghi là group code (12 chữ/số liền, có thể có dấu
// gạch ngang xen kẽ do user copy-paste lại). Dùng để hint cho BE search rằng
// đây có thể là code lookup; BE quyết định strategy (exact match vs fuzzy).
function looksLikeGroupCode(rawInput) {
  const cleaned = String(rawInput || "").replace(/[^A-Za-z0-9]/g, "");
  return cleaned.length === 12;
}

// Resolve join flow theo `joinPolicy` mới của BE; fallback `isPublic` boolean
// legacy nếu BE chưa trả `joinPolicy`. Khi BE add field xong, FE tự nhận diện.
//  - REQUEST_APPROVAL → mở dialog xin duyệt
//  - FREE             → join trực tiếp (legacy isPublic=true)
//  - Không có policy + isPublic=false → request flow (legacy private)
function resolveJoinFlow(group) {
  const policy = String(group?.joinPolicy || "").toUpperCase();
  if (policy === "REQUEST_APPROVAL") return "request";
  if (policy === "FREE") return "free";
  // Legacy: chỉ có boolean isPublic
  if (group?.isPublic === false) return "request";
  return "free";
}

function CommunityGroupBoard({
  groups = [],
  loading,
  searchQuery = "",
  isDarkMode,
  onJoinGroup,
  onRequestJoinGroup,
  onOpenGroup,
  onCreateGroup,
  joiningWorkspaceId = null,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "en" ? "en" : "vi";
  const locale = currentLang === "en" ? "en-US" : "vi-VN";
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Copy group code → clipboard với feedback ngắn 1.5s.
  const handleCopyCode = useCallback(async (event, group) => {
    event?.stopPropagation?.();
    const rawCode = String(group?.groupCode || "").trim();
    if (!rawCode || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopiedCodeId(group?.workspaceId);
      setTimeout(() => {
        setCopiedCodeId((current) => (current === group?.workspaceId ? null : current));
      }, 1500);
    } catch {
      /* ignore — fallback: user select text manually */
    }
  }, []);

  const filteredGroups = useMemo(() => {
    const trimmed = deferredSearchQuery.trim();
    if (!trimmed) {
      return groups;
    }

    const q = trimmed.toLowerCase();
    // Nếu input giống groupCode 12 ký tự — match exact (case-insensitive,
    // bỏ qua dấu gạch ngang user paste vào). BE sẽ là source of truth khi
    // adopt /search endpoint, FE filter giữ làm fallback nhanh.
    const looksLikeCode = looksLikeGroupCode(trimmed);
    const normalizedCode = trimmed.replace(/[^A-Za-z0-9]/g, "").toLowerCase();

    return groups.filter((group) => {
      if (looksLikeCode && group?.groupCode) {
        const storedCode = String(group.groupCode).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
        if (storedCode === normalizedCode) return true;
      }
      const haystack = [
        group?.groupName,
        group?.description,
        group?.domain,
        group?.knowledge,
        group?.examName,
        group?.groupLearningGoal,
        group?.groupCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [deferredSearchQuery, groups]);

  if (loading) {
    return (
      <section>
        <ListSpinner variant="section" />
      </section>
    );
  }

  const selectedLearningMode = formatGroupLearningMode(selectedGroup?.learningMode, currentLang);
  const selectedDefaultRole = formatGroupRole(selectedGroup?.defaultRoleOnJoin, currentLang);
  const selectedCreatedAt = formatDateLabel(selectedGroup?.createdAt, locale);
  const selectedSections = selectedGroup ? getSectionLabels(selectedGroup, t) : [];
  const selectedCapacitySummary = buildCapacitySummary(selectedGroup, t);

  return (
    <>
      <section
        className={`overflow-hidden rounded-[28px] border ${
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        }`}
      >
        <div className="px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
              <p className={`text-[11px] uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {t("home.groupHub.eyebrow")}
              </p>
              <h2 className={`mt-2 text-xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {t("home.groupHub.title")}
              </h2>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("home.groupHub.subtitle")}
              </p>
            </div>

            <Button
              type="button"
              onClick={onCreateGroup}
              className="h-10 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700"
            >
              <ShieldPlus className="mr-2 h-4 w-4" />
              {t("home.actions.createGroup")}
            </Button>
          </div>

          <div className="mt-5">
            {filteredGroups.length === 0 && groups.length === 0 ? (
              <div
                className={`rounded-[24px] border border-dashed px-5 py-8 ${
                  isDarkMode
                    ? "border-slate-800 bg-slate-950/60 text-slate-400"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {t("home.groupHub.emptyTitle")}
                </p>
                <p className="mt-2 text-sm leading-6">{t("home.groupHub.emptyDescription")}</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div
                className={`rounded-[24px] border border-dashed px-5 py-8 ${
                  isDarkMode
                    ? "border-slate-800 bg-slate-950/60 text-slate-400"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {t("home.search.noResults")}
                </p>
                <p className="mt-2 text-sm leading-6">{t("home.groupHub.noResultsDescription")}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredGroups.map((group) => {
                  const learningModeLabel = formatGroupLearningMode(group?.learningMode, currentLang);
                  const description = group?.description || group?.groupLearningGoal || group?.knowledge;
                  const isJoining = joiningWorkspaceId === group?.workspaceId;
                  // BE 2 model:
                  //   - mới: joinPolicy ∈ {FREE, REQUEST_APPROVAL}
                  //   - cũ:  chỉ có isPublic boolean
                  // resolveJoinFlow chọn route dispatch; với REQUEST_APPROVAL,
                  // bỏ qua `joinable=false` (BE có thể đánh dấu để chặn /join,
                  // nhưng /join-request vẫn hợp lệ).
                  const joinFlow = resolveJoinFlow(group);
                  const isRequestFlow = joinFlow === 'request';
                  const hasPendingRequest = String(group?.myJoinRequestStatus || '').toUpperCase() === 'PENDING';
                  const isJoinDisabled = !group?.joined && !group?.joinable && !isRequestFlow;
                  const groupCode = group?.groupCode || null;
                  const isCodeCopied = copiedCodeId === group?.workspaceId;
                  const capacitySummary = buildCapacitySummary(group, t);

                  return (
                    <button
                      key={group.workspaceId}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className={`rounded-[24px] border p-4 text-left transition-all ${
                        isDarkMode
                          ? "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                              isDarkMode ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"
                            }`}>
                              <Users className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {group.groupName}
                              </p>
                              <p className={`mt-0.5 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                                {group?.createdByFullName || group?.createdByUsername || t("home.groupHub.public")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {group?.joined ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode
                              ? "bg-slate-800 text-slate-300 ring-1 ring-inset ring-slate-700"
                              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                          }`}>
                            {t("home.groupHub.joined")}
                          </span>
                        ) : isJoinDisabled ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode
                              ? "bg-amber-500/12 text-amber-200 ring-1 ring-inset ring-amber-400/20"
                              : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                          }`}>
                            {t("home.groupHub.full")}
                          </span>
                        ) : isRequestFlow ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode
                              ? "bg-violet-500/12 text-violet-200 ring-1 ring-inset ring-violet-400/20"
                              : "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200"
                          }`}>
                            {t("home.groupHub.requireApproval")}
                          </span>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode
                              ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          }`}>
                            {t("home.groupHub.public")}
                          </span>
                        )}
                      </div>

                      <p className={`mt-4 line-clamp-2 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                        {truncateText(description || t("home.groupHub.emptyCardDescription"), 96)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <MetaPill icon={Users} isDarkMode={isDarkMode}>
                        {group.memberCount ?? 0} {t("home.labels.membersUnit")}
                      </MetaPill>
                      {group?.domain ? (
                          <MetaPill icon={Compass} isDarkMode={isDarkMode} tone="blue">
                            {group.domain}
                          </MetaPill>
                        ) : null}
                      {learningModeLabel ? (
                          <MetaPill icon={Layers3} isDarkMode={isDarkMode} tone="violet">
                            {learningModeLabel}
                          </MetaPill>
                        ) : null}
                      </div>

                      {capacitySummary ? (
                        <p className={`mt-3 text-xs leading-5 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          {capacitySummary}
                        </p>
                      ) : null}

                      {groupCode ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(event) => handleCopyCode(event, group)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleCopyCode(event, group);
                            }
                          }}
                          aria-label={t("home.groupHub.groupCode.copyAria", { code: formatGroupCode(groupCode) })}
                          className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] cursor-pointer transition-colors ${
                            isDarkMode
                              ? "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-blue-500 hover:text-blue-300"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700"
                          }`}
                        >
                          {isCodeCopied ? (
                            <ClipboardCheck className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <ClipboardCopy className="h-3 w-3 opacity-60" />
                          )}
                          <span className="tracking-wider">{formatGroupCode(groupCode)}</span>
                          {isCodeCopied ? (
                            <span className={`ml-1 text-[10px] font-sans ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              {t("home.groupHub.groupCode.copied")}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                        <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          {t("home.groupHub.viewDetails")}
                        </span>
                        <Button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (group?.joined) {
                              onOpenGroup?.(group);
                              return;
                            }
                            if (isJoinDisabled || hasPendingRequest) {
                              return;
                            }
                            if (isRequestFlow) {
                              onRequestJoinGroup?.(group);
                              return;
                            }
                            onJoinGroup?.(group);
                          }}
                          disabled={isJoining || isJoinDisabled || hasPendingRequest}
                          className={`h-9 rounded-full px-4 text-sm ${
                            group?.joined
                              ? isDarkMode
                                ? "bg-slate-800 text-white hover:bg-slate-700"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                              : (isJoinDisabled || hasPendingRequest)
                                ? isDarkMode
                                  ? "bg-slate-800 text-slate-500"
                                  : "bg-slate-200 text-slate-400"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
                          {group?.joined
                            ? t("home.group.viewWorkspace")
                            : hasPendingRequest
                              ? t("home.groupHub.requestPending")
                              : isJoinDisabled
                                ? t("home.groupHub.full")
                                : isRequestFlow
                                  ? t("home.groupHub.requestJoin")
                                  : t("home.groupHub.join")}
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedGroup)} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent
          className={`max-h-[85vh] overflow-y-auto border sm:max-w-[760px] ${
            isDarkMode ? "border-slate-800 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className={isDarkMode ? "text-white" : "text-slate-900"}>
                {selectedGroup?.groupName}
              </DialogTitle>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isDarkMode
                  ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              }`}>
                {t("home.groupHub.public")}
              </span>
            </div>
            <DialogDescription className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
              {selectedGroup?.description || t("home.groupHub.emptyCardDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <MetaPill icon={Users} isDarkMode={isDarkMode}>
                {selectedGroup?.memberCount ?? 0} {t("home.labels.membersUnit")}
              </MetaPill>
              {selectedGroup?.domain ? (
                <MetaPill icon={Compass} isDarkMode={isDarkMode} tone="blue">
                  {selectedGroup.domain}
                </MetaPill>
              ) : null}
              {selectedLearningMode ? (
                <MetaPill icon={Layers3} isDarkMode={isDarkMode} tone="violet">
                  {selectedLearningMode}
                </MetaPill>
              ) : null}
              {selectedGroup?.examName ? (
                <MetaPill icon={Target} isDarkMode={isDarkMode} tone="emerald">
                  {selectedGroup.examName}
                </MetaPill>
              ) : null}
              {selectedDefaultRole ? (
                <MetaPill icon={ShieldPlus} isDarkMode={isDarkMode} tone="amber">
                  {selectedDefaultRole}
                </MetaPill>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label={t("home.groupHub.labels.goal")} value={selectedGroup?.groupLearningGoal} isDarkMode={isDarkMode} />
              <DetailRow label={t("home.groupHub.labels.focus")} value={selectedGroup?.knowledge} isDarkMode={isDarkMode} />
              <DetailRow label={t("home.groupHub.labels.rules")} value={selectedGroup?.rules} isDarkMode={isDarkMode} />
              <DetailRow label={t("home.groupHub.labels.capacity")} value={selectedCapacitySummary} isDarkMode={isDarkMode} />
              <DetailRow
                label={t("home.groupHub.labels.meta")}
                value={[
                  selectedGroup?.createdByFullName || selectedGroup?.createdByUsername
                    ? t("home.groupHub.createdBy", {
                        owner: selectedGroup?.createdByFullName || selectedGroup?.createdByUsername,
                      })
                    : null,
                  selectedCreatedAt,
                ].filter(Boolean).join(" • ")}
                isDarkMode={isDarkMode}
              />
            </div>

            <div>
              <p className={`text-[11px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {t("home.groupHub.sectionsTitle")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSections.map(({ key, label, Icon }) => (
                  <MetaPill key={key} icon={Icon} isDarkMode={isDarkMode} tone={getSectionTone(key)}>
                    {label}
                  </MetaPill>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedGroup(null)}
              className={`rounded-full ${
                isDarkMode
                  ? "border-slate-700 text-slate-200 hover:bg-slate-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t("common.cancel")}
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!selectedGroup) return;
                  const group = selectedGroup;
                  setSelectedGroup(null);
                  onOpenGroup?.(group);
                }}
                disabled={!selectedGroup?.joined}
                className={`rounded-full ${
                  isDarkMode
                    ? "border-slate-700 text-slate-200 hover:bg-slate-900"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {t("home.group.viewWorkspace")}
              </Button>
              {(() => {
                // Áp dụng cùng logic joinFlow như card list — đảm bảo UI dialog
                // và card luôn nhất quán về flow dispatch (FREE vs REQUEST_APPROVAL).
                const detailJoinFlow = resolveJoinFlow(selectedGroup);
                const detailIsRequest = detailJoinFlow === 'request';
                const detailHasPending = String(selectedGroup?.myJoinRequestStatus || '').toUpperCase() === 'PENDING';
                const detailDisabled = !selectedGroup?.joined && !selectedGroup?.joinable && !detailIsRequest;
                const detailIsLoading = joiningWorkspaceId === selectedGroup?.workspaceId;
                return (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedGroup) return;
                      const group = selectedGroup;
                      if (group?.joined) {
                        setSelectedGroup(null);
                        onOpenGroup?.(group);
                        return;
                      }
                      if (detailDisabled || detailHasPending) return;
                      setSelectedGroup(null);
                      if (detailIsRequest) {
                        onRequestJoinGroup?.(group);
                        return;
                      }
                      onJoinGroup?.(group);
                    }}
                    disabled={detailIsLoading || detailDisabled || detailHasPending}
                    className={`rounded-full ${
                      (detailDisabled || detailHasPending)
                        ? isDarkMode
                          ? "bg-slate-800 text-slate-500"
                          : "bg-slate-200 text-slate-400"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {detailIsLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                    )}
                    {selectedGroup?.joined
                      ? t("home.group.viewWorkspace")
                      : detailHasPending
                        ? t("home.groupHub.requestPending")
                        : detailDisabled
                          ? t("home.groupHub.full")
                          : detailIsRequest
                            ? t("home.groupHub.requestJoin")
                            : t("home.groupHub.join")}
                  </Button>
                );
              })()}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CommunityGroupBoard;
