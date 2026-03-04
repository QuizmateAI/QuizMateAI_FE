import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, FolderTree, Search } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import AdminPagination from '@/Pages/Admin/components/AdminPagination';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTopic } from '@/hooks/useTopic';
import { useToast } from '@/context/ToastContext';

const PAGE_SIZE = 10;

function TopicManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const { topics, topicsLoading, fetchTopics, createTopic, createField } = useTopic();
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicCode, setNewTopicCode] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [newFieldTitle, setNewFieldTitle] = useState('');
  const [newFieldCode, setNewFieldCode] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [fieldQuery, setFieldQuery] = useState('');
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  const [fieldSubmitting, setFieldSubmitting] = useState(false);
  const [topicPage, setTopicPage] = useState(0);
  const [fieldPage, setFieldPage] = useState(0);
  const [error, setError] = useState('');

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const sortedTopics = useMemo(() => {
    const list = Array.isArray(topics) ? [...topics] : [];
    return list.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')));
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const q = String(topicQuery || '').trim().toLowerCase();
    if (!q) return sortedTopics;
    return sortedTopics.filter((topic) => String(topic?.title || '').toLowerCase().includes(q));
  }, [sortedTopics, topicQuery]);

  const allFields = useMemo(() => {
    return sortedTopics.flatMap((topic) => {
      const fields = Array.isArray(topic.fields) ? topic.fields : [];
      return fields.map((field) => ({
        ...field,
        topicId: topic.topicId,
        topicTitle: topic.title,
      }));
    });
  }, [sortedTopics]);

  const visibleFields = useMemo(() => {
    const topicId = Number(selectedTopicId);
    const base = topicId ? allFields.filter((field) => Number(field.topicId) === topicId) : allFields;
    const q = String(fieldQuery || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter((field) => {
      return (
        String(field?.title || '').toLowerCase().includes(q) ||
        String(field?.topicTitle || '').toLowerCase().includes(q)
      );
    });
  }, [allFields, selectedTopicId, fieldQuery]);

  useEffect(() => {
    setTopicPage(0);
  }, [topicQuery]);

  useEffect(() => {
    setFieldPage(0);
  }, [fieldQuery, selectedTopicId]);

  const topicTotalPages = useMemo(() => Math.ceil(filteredTopics.length / PAGE_SIZE), [filteredTopics.length]);
  const fieldTotalPages = useMemo(() => Math.ceil(visibleFields.length / PAGE_SIZE), [visibleFields.length]);

  useEffect(() => {
    const maxPage = Math.max(0, topicTotalPages - 1);
    if (topicPage > maxPage) {
      setTopicPage(maxPage);
    }
  }, [topicPage, topicTotalPages]);

  useEffect(() => {
    const maxPage = Math.max(0, fieldTotalPages - 1);
    if (fieldPage > maxPage) {
      setFieldPage(maxPage);
    }
  }, [fieldPage, fieldTotalPages]);

  const pagedTopics = useMemo(() => {
    const start = topicPage * PAGE_SIZE;
    return filteredTopics.slice(start, start + PAGE_SIZE);
  }, [filteredTopics, topicPage]);

  const pagedFields = useMemo(() => {
    const start = fieldPage * PAGE_SIZE;
    return visibleFields.slice(start, start + PAGE_SIZE);
  }, [visibleFields, fieldPage]);

  const handleCreateTopic = async () => {
    const title = newTopicTitle.trim();
    if (!title) {
      const msg = t('topicManagement.topicNameRequired');
      setError(msg);
      showError(msg);
      return;
    }

    setTopicSubmitting(true);
    setError('');
    try {
      const created = await createTopic(title, newTopicCode);
      if (created?.topicId != null) {
        setSelectedTopicId(String(created.topicId));
      }
      setNewTopicTitle('');
      setNewTopicCode('');
      showSuccess(t('topicManagement.topicCreated'));
    } catch (err) {
      const msg = err?.message || t('topicManagement.topicCreateError');
      setError(msg);
      showError(msg);
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleCreateField = async () => {
    const topicId = Number(selectedTopicId);
    const title = newFieldTitle.trim();

    if (!topicId) {
      const msg = t('topicManagement.selectTopicFirst');
      setError(msg);
      showError(msg);
      return;
    }
    if (!title) {
      const msg = t('topicManagement.fieldNameRequired');
      setError(msg);
      showError(msg);
      return;
    }

    setFieldSubmitting(true);
    setError('');
    try {
      await createField(topicId, title, newFieldCode);
      setNewFieldTitle('');
      setNewFieldCode('');
      showSuccess(t('topicManagement.fieldCreated'));
    } catch (err) {
      const msg = err?.message || t('topicManagement.fieldCreateError');
      setError(msg);
      showError(msg);
    } finally {
      setFieldSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('topicManagement.title')}
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
            {t('topicManagement.desc')}
          </p>
        </div>
        <Button
          onClick={fetchTopics}
          disabled={topicsLoading}
          variant="outline"
          className={`rounded-xl ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${topicsLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <Card className={`border rounded-[24px] h-full flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <CardTitle className={`flex items-center justify-between gap-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-500" />
                {t('topicManagement.topics')}
              </span>
              <Badge className="rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-none">
                {sortedTopics.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder={t('topicManagement.topicTitlePlaceholder')}
                className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
              />
              <Input
                value={newTopicCode}
                onChange={(e) => setNewTopicCode(e.target.value)}
                placeholder={t('topicManagement.codePlaceholder')}
                className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
              />
              <Button
                onClick={handleCreateTopic}
                disabled={topicSubmitting}
                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all"
              >
                {topicSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="ml-2">{t('topicManagement.createTopic')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <Input
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  placeholder={t('topicManagement.searchTopics')}
                  className={`h-11 rounded-xl pl-10 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
                />
              </div>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className={`h-11 rounded-xl border px-3 text-sm outline-none transition-colors ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">{t('topicManagement.allTopics')}</option>
                {sortedTopics.map((topic) => (
                  <option key={topic.topicId} value={topic.topicId}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border overflow-hidden flex-1">
              <Table className="table-fixed">
                <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                  <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <TableHead className="w-24 font-bold text-slate-500 text-left">{t('topicManagement.table.id')}</TableHead>
                    <TableHead className="font-bold text-slate-500 text-left">{t('topicManagement.table.topic')}</TableHead>
                    <TableHead className="w-40 font-bold text-slate-500 text-right">{t('topicManagement.table.fieldsCount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTopics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-slate-400">
                        {t('topicManagement.noTopics')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedTopics.map((topic) => {
                      const fields = Array.isArray(topic.fields) ? topic.fields : [];
                      const active = String(selectedTopicId || '') === String(topic.topicId);
                      return (
                        <TableRow
                          key={topic.topicId}
                          onClick={() => setSelectedTopicId(String(topic.topicId))}
                          className={
                            `border-b cursor-pointer transition-colors ${
                              isDarkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'
                            } ${
                              active ? (isDarkMode ? 'bg-slate-800/80' : 'bg-blue-50') : ''
                            }`
                          }
                        >
                          <TableCell className="text-left font-mono text-blue-600 dark:text-blue-400">{topic.topicId}</TableCell>
                          <TableCell className={`text-left font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {topic.title}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-none">
                              {fields.length}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-auto">
              <AdminPagination
                currentPage={topicPage}
                totalPages={topicTotalPages}
                totalElements={filteredTopics.length}
                pageSize={PAGE_SIZE}
                onPageChange={setTopicPage}
                onPageSizeChange={() => {}}
                hidePageSize
                isDarkMode={isDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`border rounded-[24px] h-full flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <CardTitle className={`flex items-center justify-between gap-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-500" />
                {t('topicManagement.fields')}
              </span>
              <Badge className="rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-none">
                {visibleFields.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={newFieldTitle}
                onChange={(e) => setNewFieldTitle(e.target.value)}
                placeholder={t('topicManagement.fieldTitlePlaceholder')}
                className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
              />
              <Input
                value={newFieldCode}
                onChange={(e) => setNewFieldCode(e.target.value)}
                placeholder={t('topicManagement.codePlaceholder')}
                className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
              />
              <Button
                onClick={handleCreateField}
                disabled={fieldSubmitting}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all"
              >
                {fieldSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="ml-2">{t('topicManagement.createField')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <Input
                  value={fieldQuery}
                  onChange={(e) => setFieldQuery(e.target.value)}
                  placeholder={selectedTopicId ? t('topicManagement.searchFieldsInTopic') : t('topicManagement.searchFields')}
                  className={`h-11 rounded-xl pl-10 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
                />
              </div>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className={`h-11 rounded-xl border px-3 text-sm outline-none transition-colors ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">{t('topicManagement.selectTopic')}</option>
                {sortedTopics.map((topic) => (
                  <option key={topic.topicId} value={topic.topicId}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border overflow-hidden flex-1">
              <Table className="table-fixed">
                <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                  <TableRow className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <TableHead className="w-24 font-bold text-slate-500 text-left">{t('topicManagement.table.id')}</TableHead>
                    <TableHead className="font-bold text-slate-500 text-left">{t('topicManagement.table.field')}</TableHead>
                    <TableHead className="font-bold text-slate-500 text-left">{t('topicManagement.table.topic')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                      </TableCell>
                    </TableRow>
                  ) : visibleFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-slate-400">
                        {t('topicManagement.noFields')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedFields.map((field) => (
                      <TableRow
                        key={`${field.topicId}-${field.fieldId}`}
                        className={`border-b transition-colors ${
                          isDarkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <TableCell className="text-left font-mono text-emerald-600 dark:text-emerald-400">{field.fieldId}</TableCell>
                        <TableCell className={`text-left font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {field.title}
                        </TableCell>
                        <TableCell className={`text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {field.topicTitle}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-auto">
              <AdminPagination
                currentPage={fieldPage}
                totalPages={fieldTotalPages}
                totalElements={visibleFields.length}
                pageSize={PAGE_SIZE}
                onPageChange={setFieldPage}
                onPageSizeChange={() => {}}
                hidePageSize
                isDarkMode={isDarkMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TopicManagement;
