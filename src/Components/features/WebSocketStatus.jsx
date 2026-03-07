import React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Component hiển thị trạng thái kết nối WebSocket
 * @param {boolean} isConnected - Trạng thái kết nối
 * @param {boolean} isDarkMode - Chế độ tối
 * @param {boolean} compact - Chế độ thu gọn (chỉ hiện icon)
 */
function WebSocketStatus({ isConnected = false, isDarkMode = false, compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
          isConnected
            ? isDarkMode
              ? "bg-emerald-950/50 text-emerald-400"
              : "bg-emerald-50 text-emerald-600"
            : isDarkMode
            ? "bg-slate-800 text-slate-500"
            : "bg-gray-100 text-gray-400"
        }`}
        title={isConnected ? t("workspace.wsConnected") : t("workspace.wsDisconnected")}
      >
        {isConnected ? (
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
        isConnected
          ? isDarkMode
            ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
          : isDarkMode
          ? "bg-slate-800/50 border-slate-700 text-slate-400"
          : "bg-gray-50 border-gray-200 text-gray-500"
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-medium">{t("workspace.wsConnected")}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-medium">{t("workspace.wsDisconnected")}</span>
        </>
      )}
    </div>
  );
}

export default WebSocketStatus;
