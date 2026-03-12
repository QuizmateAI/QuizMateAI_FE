import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';

function SystemConfigManagement() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800">
          <Settings2 className="w-12 h-12 text-slate-500 dark:text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          {t('systemConfig.removedTitle', 'Cấu hình học tập đã được đơn giản hóa')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {t('systemConfig.removedDesc', 'Domain, Knowledge, Scheme, Level đã được loại bỏ. Người dùng cấu hình trực tiếp qua mô tả tài liệu, trình độ và mục tiêu trong Workspace.')}
        </p>
      </div>
    </div>
  );
}

export default SystemConfigManagement;
