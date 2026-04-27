import React from "react";
import { Calendar, Edit3, Loader2, Lock, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ProfileSettings({
  currentLang,
  editForm,
  isDarkMode,
  isEditing,
  onCancelEdit,
  onChangeEditForm,
  onChangePassword,
  onSaveProfile,
  onStartEdit,
  profile,
  saving,
}) {
  const { t } = useTranslation();

  const readonlyClassName = cn(
    "flex-1 rounded-xl px-4 py-2.5 text-sm",
    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700",
  );
  const inputClassName = cn(
    "flex-1",
    isDarkMode
      ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
      : "border-slate-300 bg-white",
  );
  const labelClassName = cn("flex items-center gap-2 sm:w-36", isDarkMode ? "text-slate-300" : "text-slate-700");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle>{t("profile.personalInfo")}</CardTitle>
          <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
            {t("profile.personalInfoDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Label className={labelClassName}>
              <Mail className="h-4 w-4 text-slate-400" />
              {t("profile.email")}
            </Label>
            <div className={readonlyClassName}>{profile.email || "-"}</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Label className={labelClassName}>
              <User className="h-4 w-4 text-slate-400" />
              {t("profile.fullName")}
            </Label>
            {isEditing ? (
              <Input
                value={editForm.fullName}
                onChange={(event) => onChangeEditForm({ fullName: event.target.value })}
                placeholder={t("profile.fullNamePlaceholder")}
                className={inputClassName}
              />
            ) : (
              <div className={readonlyClassName}>{profile.fullName || "-"}</div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Label className={labelClassName}>
              <Calendar className="h-4 w-4 text-slate-400" />
              {t("profile.birthday")}
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={editForm.birthday || ""}
                onChange={(event) => onChangeEditForm({ birthday: event.target.value })}
                className={inputClassName}
              />
            ) : (
              <div className={readonlyClassName}>
                {profile.birthday
                  ? new Date(profile.birthday).toLocaleDateString(currentLang === "vi" ? "vi-VN" : "en-US")
                  : "-"}
              </div>
            )}
          </div>

          <div className={cn("flex flex-wrap gap-3 border-t pt-4", isDarkMode ? "border-slate-800" : "border-slate-200")}>
            {isEditing ? (
              <>
                <Button
                  onClick={onSaveProfile}
                  disabled={saving}
                  className="min-w-[132px] bg-blue-600 text-white hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("profile.saving")}
                    </>
                  ) : (
                    t("profile.save")
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={saving}
                  className={cn("min-w-[100px]", isDarkMode && "border-slate-700 hover:bg-slate-800")}
                >
                  {t("profile.cancel")}
                </Button>
              </>
            ) : (
              <Button onClick={onStartEdit} className="min-w-[132px] bg-blue-600 text-white hover:bg-blue-700">
                <Edit3 className="mr-2 h-4 w-4" />
                {t("profile.edit")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle>{t("profile.security")}</CardTitle>
          <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
            {t("profile.securityDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onChangePassword}
            variant="outline"
            className={cn("min-w-[160px]", isDarkMode && "border-slate-700 hover:bg-slate-800")}
          >
            <Lock className="mr-2 h-4 w-4" />
            {t("profile.changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
