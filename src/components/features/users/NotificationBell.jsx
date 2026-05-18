import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";

function formatRelativeTime(iso, t) {
  if (!iso) return "";
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return "";
  const diffSeconds = (Date.now() - target) / 1000;
  if (diffSeconds < 60) return t("notification.relativeTime.justNow");
  if (diffSeconds < 3600) {
    return t("notification.relativeTime.minutesAgo", { count: Math.floor(diffSeconds / 60) });
  }
  if (diffSeconds < 86400) {
    return t("notification.relativeTime.hoursAgo", { count: Math.floor(diffSeconds / 3600) });
  }
  if (diffSeconds < 7 * 86400) {
    return t("notification.relativeTime.daysAgo", { count: Math.floor(diffSeconds / 86400) });
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// BE đang trả `link` theo style `/group/{id}/...` nhưng FE dùng `/group-workspaces/{id}`.
// Map ở đây để dropdown nhảy đúng vào trang group hiện tại; nếu BE không gửi link,
// fallback theo workspaceId. Nếu hoàn toàn không có data thì trả null → không navigate.
function resolveNotificationHref(notification) {
  if (!notification) return null;
  const rawLink = typeof notification.link === "string" ? notification.link.trim() : "";
  if (rawLink) {
    if (rawLink.startsWith("/group/")) {
      return rawLink.replace(/^\/group\//, "/group-workspaces/");
    }
    return rawLink;
  }
  const workspaceId = Number(notification.workspaceId);
  if (Number.isFinite(workspaceId) && workspaceId > 0) {
    return `/group-workspaces/${workspaceId}`;
  }
  return null;
}

function formatUnreadBadge(count) {
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

function NotificationItemRow({ item, onSelect, isDarkMode, t }) {
  const isUnread = !item?.readAt;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "w-full text-left px-4 py-3 flex gap-3 border-b transition-colors",
        isDarkMode
          ? "border-slate-800 hover:bg-slate-800/60"
          : "border-gray-100 hover:bg-gray-50",
        isUnread && (isDarkMode ? "bg-slate-900" : "bg-blue-50/40"),
      )}
    >
      <span
        className={cn(
          "mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full",
          isUnread ? "bg-blue-500" : "bg-transparent",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm",
              isUnread ? "font-semibold" : "font-medium",
              isDarkMode ? "text-slate-100" : "text-gray-900",
            )}
          >
            {item?.title || t("notification.fallbackTitle")}
          </p>
          <span className={cn("flex-shrink-0 text-xs", isDarkMode ? "text-slate-500" : "text-gray-400")}>
            {formatRelativeTime(item?.createdAt, t)}
          </span>
        </div>
        {item?.body ? (
          <p className={cn("mt-0.5 line-clamp-2 text-sm", isDarkMode ? "text-slate-400" : "text-gray-600")}>
            {item.body}
          </p>
        ) : null}
        {item?.workspaceName ? (
          <p className={cn("mt-1 text-xs", isDarkMode ? "text-slate-500" : "text-gray-500")}>
            {item.workspaceName}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function NotificationBell({ isDarkMode = false }) {
  const { t } = useTranslation();
  const navigate = useNavigateWithLoading();
  const {
    items,
    unreadCount,
    isLoading,
    isLoadingMore,
    isAuthenticated,
    hasMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Tải page 0 lần đầu mở dropdown — tránh fetch eager khi user không quan tâm.
  useEffect(() => {
    if (!isOpen) return;
    void refresh();
  }, [isOpen, refresh]);

  // Click ra ngoài để đóng (cùng pattern với UserProfilePopover).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleSelectItem = useCallback(async (item) => {
    if (!item) return;
    setIsOpen(false);
    try {
      if (!item.readAt) {
        await markAsRead(item.notificationId);
      }
    } catch {
      /* lỗi mark-as-read đã được context log; vẫn cho navigate */
    }
    const href = resolveNotificationHref(item);
    if (href) navigate(href);
  }, [markAsRead, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch {
      /* lỗi đã log; UI giữ optimistic rồi rollback trong context */
    }
  }, [markAllAsRead]);

  if (!isAuthenticated) return null;

  const badge = formatUnreadBadge(unreadCount);
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("notification.title")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          "relative w-9 h-9 rounded-full flex items-center justify-center border transition-colors",
          isDarkMode
            ? "border-transparent hover:border-blue-400 text-slate-200 hover:bg-slate-900"
            : "border-transparent hover:border-blue-400 text-gray-700 hover:bg-gray-100",
        )}
      >
        <Bell className="w-5 h-5" />
        {badge ? (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center",
              "bg-red-500 text-white",
            )}
            aria-label={t("notification.unreadCountLabel", { count: unreadCount })}
          >
            {badge}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={cn(
            "absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-xl overflow-hidden z-40",
            isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-800",
          )}
          role="menu"
        >
          <div
            className={cn(
              "px-4 py-3 flex items-center justify-between gap-3 border-b",
              isDarkMode ? "border-slate-800" : "border-gray-100",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bell className={cn("w-4 h-4 flex-shrink-0", isDarkMode ? "text-slate-300" : "text-gray-600")} />
              <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-slate-100" : "text-gray-900")}>
                {t("notification.title")}
              </p>
              {unreadCount > 0 ? (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600",
                )}>
                  {unreadCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className={cn(
                  "text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors",
                  unreadCount === 0
                    ? (isDarkMode ? "text-slate-600 cursor-not-allowed" : "text-gray-400 cursor-not-allowed")
                    : (isDarkMode ? "text-blue-300 hover:bg-slate-800" : "text-blue-600 hover:bg-blue-50"),
                )}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t("notification.markAllRead")}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "p-1 rounded-full",
                  isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500",
                )}
                aria-label={t("notification.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && !hasItems ? (
              <div className={cn("flex items-center justify-center gap-2 py-10", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("notification.loading")}</span>
              </div>
            ) : null}

            {!isLoading && !hasItems && !error ? (
              <div className={cn("flex flex-col items-center justify-center gap-2 py-10 px-6 text-center", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                <BellOff className="w-8 h-8" aria-hidden="true" />
                <p className={cn("text-sm font-medium", isDarkMode ? "text-slate-300" : "text-gray-700")}>
                  {t("notification.empty.title")}
                </p>
                <p className="text-xs">{t("notification.empty.body")}</p>
              </div>
            ) : null}

            {error && !hasItems ? (
              <div className={cn("flex flex-col items-center gap-2 py-8 px-6 text-center text-sm", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                <p>{t("notification.error")}</p>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium",
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
                  )}
                >
                  {t("notification.retry")}
                </button>
              </div>
            ) : null}

            {hasItems ? (
              <div>
                {items.map((item) => (
                  <NotificationItemRow
                    key={item.notificationId}
                    item={item}
                    onSelect={handleSelectItem}
                    isDarkMode={isDarkMode}
                    t={t}
                  />
                ))}
                {hasMore ? (
                  <div className="px-4 py-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => loadMore()}
                      disabled={isLoadingMore}
                      className={cn(
                        "text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors",
                        isDarkMode
                          ? "text-blue-300 hover:bg-slate-800 disabled:text-slate-600"
                          : "text-blue-600 hover:bg-blue-50 disabled:text-gray-400",
                      )}
                    >
                      {isLoadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{t("notification.loadMore")}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
