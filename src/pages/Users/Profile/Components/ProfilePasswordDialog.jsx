import React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function PasswordField({
  isDarkMode,
  label,
  onChange,
  onToggle,
  placeholder,
  show,
  value,
}) {
  return (
    <div className="space-y-2">
      <Label className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            isDarkMode
              ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              : "border-slate-300 bg-white",
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700",
          )}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePasswordDialog({
  changingPassword,
  fontClass,
  isDarkMode,
  onCancel,
  onChangePasswordForm,
  onConfirm,
  onOpenChange,
  onTogglePassword,
  open,
  passwordForm,
  showPasswords,
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(fontClass, isDarkMode ? "border-slate-700 bg-slate-900 text-white" : "bg-white")}>
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-white" : "text-slate-900"}>
            {t("profile.changePassword")}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
            {t("profile.changePasswordDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <PasswordField
            isDarkMode={isDarkMode}
            label={t("profile.oldPassword")}
            value={passwordForm.oldPassword}
            show={showPasswords.old}
            placeholder="••••••••"
            onToggle={() => onTogglePassword("old")}
            onChange={(value) => onChangePasswordForm({ oldPassword: value })}
          />
          <PasswordField
            isDarkMode={isDarkMode}
            label={t("profile.newPassword")}
            value={passwordForm.newPassword}
            show={showPasswords.new}
            placeholder="••••••••"
            onToggle={() => onTogglePassword("new")}
            onChange={(value) => onChangePasswordForm({ newPassword: value })}
          />
          <PasswordField
            isDarkMode={isDarkMode}
            label={t("profile.confirmNewPassword")}
            value={passwordForm.confirmNewPassword}
            show={showPasswords.confirm}
            placeholder="••••••••"
            onToggle={() => onTogglePassword("confirm")}
            onChange={(value) => onChangePasswordForm({ confirmNewPassword: value })}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={changingPassword}
            className={cn("min-w-[100px]", isDarkMode && "border-slate-700 hover:bg-slate-800")}
          >
            {t("profile.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={changingPassword}
            className="min-w-[120px] bg-blue-600 text-white hover:bg-blue-700"
          >
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("profile.saving")}
              </>
            ) : (
              t("profile.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
