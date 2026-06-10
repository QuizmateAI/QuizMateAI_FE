import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Copy,
  ExternalLink,
  FileText,
  Award,
  Search,
  Save,
  HelpCircle,
  FileText as FileIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/context/ToastContext';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import {
  getShowcaseItems,
  addShowcaseItem,
  updateShowcaseItem,
  deleteShowcaseItem,
  reorderShowcaseItems
} from '@/api/GroupShowcaseAPI';
import { getQuizzesByScope } from '@/api/QuizAPI';
import { getMaterialsByWorkspace } from '@/api/MaterialAPI';

const resolveShowcaseItemId = (item) => item?.showcaseItemId ?? item?.id ?? null;

const resolveResourceId = (resource, type) => {
  if (!resource) return null;
  if (type === 'QUIZ') return resource.quizId ?? resource.id ?? null;
  if (type === 'MATERIAL') return resource.materialId ?? resource.id ?? null;
  return resource.id ?? null;
};

const buildQuotaSummary = (items, quota) => {
  const countByType = quota?.countByType ?? {};
  const limitByType = quota?.limitByType ?? {};

  const quizCount = countByType.QUIZ ?? items.filter((i) => i.resourceType === 'QUIZ').length;
  const materialCount = countByType.MATERIAL ?? items.filter((i) => i.resourceType === 'MATERIAL').length;

  return {
    quizCount,
    quizLimit: limitByType.QUIZ ?? 5,
    materialCount,
    materialLimit: limitByType.MATERIAL ?? 5,
  };
};

export default function GroupShowcaseTab({ isDarkMode, workspaceId }) {
  const { showSuccess, showError } = useToast();

  // State lists
  const [items, setItems] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  // Modal / dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit headline state
  const [editingId, setEditingId] = useState(null);
  const [editingHeadline, setEditingHeadline] = useState('');
  const [isUpdatingHeadline, setIsUpdatingHeadline] = useState(false);

  // Dialog search / resource fetch states
  const [activeDialogTab, setActiveDialogTab] = useState('QUIZ'); // 'QUIZ' or 'MATERIAL'
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogQuizzes, setDialogQuizzes] = useState([]);
  const [dialogMaterials, setDialogMaterials] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Fetch showcase items
  const fetchShowcaseData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getShowcaseItems(workspaceId);
      const data = unwrapApiData(res);
      if (data) {
        // Handle direct array or nested object structure
        const itemList = Array.isArray(data) ? data : data.showcaseItems || data.items || [];
        setItems(itemList.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
        setQuota(
          data?.countByType || data?.limitByType
            ? { countByType: data.countByType, limitByType: data.limitByType }
            : data?.quota || null
        );
      }
      setHasOrderChanged(false);
    } catch (err) {
      console.error(err);
      showError('Không thể tải danh sách Showcase. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, showError]);

  useEffect(() => {
    if (workspaceId) {
      fetchShowcaseData();
    }
  }, [workspaceId, fetchShowcaseData]);

  // Quota computations — BE trả countByType/limitByType theo ShowcaseResourceType
  const quotaSummary = useMemo(() => buildQuotaSummary(items, quota), [items, quota]);

  // Move item up / down
  const moveItem = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    setItems(updated);
    setHasOrderChanged(true);
  };

  // Save display order
  const handleSaveOrder = async () => {
    try {
      setIsSavingOrder(true);
      const payload = items.map((item, idx) => ({
        showcaseItemId: resolveShowcaseItemId(item),
        displayOrder: idx + 1,
      }));
      await reorderShowcaseItems(workspaceId, payload);
      showSuccess('Cập nhật thứ tự hiển thị thành công!');
      setHasOrderChanged(false);
      fetchShowcaseData();
    } catch (err) {
      console.error(err);
      showError('Lưu thứ tự thất bại. Vui lòng thử lại.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Headline Edit triggers
  const startEditHeadline = (item) => {
    setEditingId(resolveShowcaseItemId(item));
    setEditingHeadline(item.headline || '');
  };

  const cancelEditHeadline = () => {
    setEditingId(null);
    setEditingHeadline('');
  };

  const handleSaveHeadline = async (itemId) => {
    try {
      setIsUpdatingHeadline(true);
      await updateShowcaseItem(workspaceId, itemId, { headline: editingHeadline.trim() });
      showSuccess('Cập nhật tiêu đề phụ thành công!');
      setEditingId(null);
      fetchShowcaseData();
    } catch (err) {
      console.error(err);
      showError('Không thể cập nhật tiêu đề phụ.');
    } finally {
      setIsUpdatingHeadline(false);
    }
  };

  // Delete item handlers
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      setIsDeleting(true);
      await deleteShowcaseItem(workspaceId, resolveShowcaseItemId(deleteConfirmItem));
      showSuccess('Đã xóa tài nguyên khỏi Showcase.');
      setDeleteConfirmItem(null);
      fetchShowcaseData();
    } catch (err) {
      console.error(err);
      showError('Xóa tài nguyên thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load quizzes and materials available in workspace
  const loadWorkspaceResources = useCallback(async () => {
    try {
      setLoadingResources(true);
      const [quizRes, matRes] = await Promise.all([
        getQuizzesByScope('WORKSPACE', Number(workspaceId)),
        getMaterialsByWorkspace(workspaceId)
      ]);

      const quizzes = unwrapApiList(quizRes);
      const materials = unwrapApiList(matRes);

      setDialogQuizzes(quizzes);
      setDialogMaterials(materials);
    } catch (err) {
      console.error(err);
      showError('Không thể tải tài nguyên của Workspace.');
    } finally {
      setLoadingResources(false);
    }
  }, [workspaceId, showError]);

  // Open add dialog and prefetch resources
  const handleOpenAddDialog = () => {
    setIsAddOpen(true);
    setSearchQuery('');
    loadWorkspaceResources();
  };

  // Check if resource is already showcased
  const isShowcased = (resourceId, type) => {
    return items.some((item) => String(item.resourceId) === String(resourceId) && item.resourceType === type);
  };

  // Add resource to showcase
  const handleAddResource = async (resourceId, type) => {
    if (resourceId == null) {
      showError('Không xác định được tài nguyên. Vui lòng tải lại danh sách và thử lại.');
      return;
    }

    const limit = type === 'QUIZ' ? quotaSummary.quizLimit : quotaSummary.materialLimit;
    const count = type === 'QUIZ' ? quotaSummary.quizCount : quotaSummary.materialCount;

    if (count >= limit) {
      showError(`Đã đạt giới hạn số lượng bài Showcase cho loại này (${limit}).`);
      return;
    }

    try {
      await addShowcaseItem(workspaceId, resourceId, type);
      showSuccess('Đã thêm tài nguyên vào Showcase!');
      fetchShowcaseData();
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.message
        || err?.response?.data?.message
        || err?.response?.data?.detail
        || 'Không thể thêm vào Showcase. Có thể đã trùng lặp hoặc hết quota.';
      showError(errMsg);
    }
  };

  // Filter resources based on search query and showcase state
  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (activeDialogTab === 'QUIZ') {
      return dialogQuizzes.filter((q) => {
        const title = (q.title || '').toLowerCase();
        return title.includes(query);
      });
    } else {
      return dialogMaterials.filter((m) => {
        const name = (m.name || m.title || '').toLowerCase();
        return name.includes(query);
      });
    }
  }, [activeDialogTab, searchQuery, dialogQuizzes, dialogMaterials]);

  // Copy public link helper
  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/group-showcase/${workspaceId}`;
    navigator.clipboard.writeText(publicUrl);
    showSuccess('Đã sao chép liên kết Showcase công khai vào bộ nhớ tạm!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner and Settings info */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/60 border-slate-800' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Cấu hình Showcase Công khai
              </h2>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-2xl`}>
              Showcase cho phép bạn trưng bày công khai các bài trắc nghiệm làm thử và tài liệu học tập của nhóm.
              Khách ghé thăm có thể tải tài liệu và thi thử trắc nghiệm mà không cần đăng nhập tài khoản.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Link</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/group-showcase/${workspaceId}`, '_blank')}
              className="flex items-center gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Xem Preview</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quota meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white shadow-sm'}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Bài trắc nghiệm làm thử
              </span>
              <Badge variant={quotaSummary.quizCount >= quotaSummary.quizLimit ? 'destructive' : 'secondary'}>
                {quotaSummary.quizCount} / {quotaSummary.quizLimit}
              </Badge>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (quotaSummary.quizCount / quotaSummary.quizLimit) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Cho phép khách hàng thử sức với tối đa {quotaSummary.quizLimit} bài trắc nghiệm.
            </p>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white shadow-sm'}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Tài liệu học tập
              </span>
              <Badge variant={quotaSummary.materialCount >= quotaSummary.materialLimit ? 'destructive' : 'secondary'}>
                {quotaSummary.materialCount} / {quotaSummary.materialLimit}
              </Badge>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (quotaSummary.materialCount / quotaSummary.materialLimit) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Cho phép khách hàng xem và tải tối đa {quotaSummary.materialLimit} tài liệu bài học.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Items Manager */}
      <Card className={isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white shadow-sm'}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Danh sách Tài nguyên trưng bày</CardTitle>
            <CardDescription>
              Kéo hoặc dùng phím di chuyển để sắp xếp thứ tự hiển thị ưu tiên.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {hasOrderChanged && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thứ tự</span>
              </Button>
            )}
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm mới</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm text-slate-500">Đang tải danh sách Showcase...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Chưa có tài nguyên nào được Showcase</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                Hãy click nút "Thêm mới" bên trên để chia sẻ công khai tài liệu hoặc bài trắc nghiệm học thử đầu tiên của bạn.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => {
                const isQuiz = item.resourceType === 'QUIZ';
                const name = isQuiz
                  ? item.quiz?.title || 'Bài trắc nghiệm không tên'
                  : item.material?.name || item.material?.title || 'Tài liệu không tên';

                const typeBadge = isQuiz ? (
                  <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 hover:bg-blue-100">
                    Trắc nghiệm
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100">
                    Tài liệu
                  </Badge>
                );

                const showcaseItemId = resolveShowcaseItemId(item);
                const isEditing = editingId === showcaseItemId;

                return (
                  <div
                    key={showcaseItemId ?? `${item.resourceType}-${item.resourceId}`}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isDarkMode 
                        ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-900' 
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Reorder actions */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveItem(index, 'up')}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition ${
                            index === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500'
                          }`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(index, 'down')}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition ${
                            index === items.length - 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500'
                          }`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Icon */}
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isQuiz 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {isQuiz ? <Award className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>

                      {/* Resource details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {name}
                          </span>
                          {typeBadge}
                        </div>

                        {/* Headline */}
                        <div className="mt-1 flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full max-w-md">
                              <Input
                                value={editingHeadline}
                                onChange={(e) => setEditingHeadline(e.target.value)}
                                placeholder="Tiêu đề phụ / Lời giới thiệu..."
                                className="h-7 text-xs bg-white dark:bg-slate-950"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveHeadline(showcaseItemId);
                                  if (e.key === 'Escape') cancelEditHeadline();
                                }}
                              />
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                onClick={() => handleSaveHeadline(showcaseItemId)}
                                disabled={isUpdatingHeadline}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 text-slate-500 hover:bg-slate-200"
                                onClick={cancelEditHeadline}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} truncate max-w-lg`}>
                                {item.headline || 'Chưa thêm mô tả nổi bật'}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditHeadline(item)}
                                className="text-slate-400 hover:text-blue-500 transition"
                                title="Chỉnh sửa mô tả nổi bật"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteConfirmItem(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Thêm tài nguyên */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className={`max-w-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle>Thêm tài nguyên vào Showcase</DialogTitle>
            <DialogDescription>
              Chọn các bài trắc nghiệm hoặc tài liệu hiện có trong Workspace này để chia sẻ công khai.
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Tabs */}
          <div className="flex border-b dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={() => {
                setActiveDialogTab('QUIZ');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center transition-all ${
                activeDialogTab === 'QUIZ'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Bài trắc nghiệm
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDialogTab('MATERIAL');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 text-center transition-all ${
                activeDialogTab === 'MATERIAL'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Tài liệu bài học
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeDialogTab === 'QUIZ'
                  ? 'Tìm kiếm trắc nghiệm theo tên...'
                  : 'Tìm kiếm tài liệu học tập...'
              }
              className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Dialog list content */}
          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 mt-2 min-h-[120px]">
            {loadingResources ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-xs text-slate-500">Đang tải danh sách tài nguyên...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                <HelpCircle className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-1.5" />
                <p className="text-xs font-semibold">Không tìm thấy tài nguyên nào</p>
                <p className="text-[11px] mt-0.5">Không có tài nguyên khả dụng hoặc không khớp với tìm kiếm.</p>
              </div>
            ) : (
              filteredResources.map((res) => {
                const resourceId = resolveResourceId(res, activeDialogTab);
                const title = activeDialogTab === 'QUIZ' ? res.title : res.title || res.name;
                const alreadyShowcased = resourceId != null && isShowcased(resourceId, activeDialogTab);

                return (
                  <div
                    key={resourceId ?? `${activeDialogTab}-${title}`}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${
                        activeDialogTab === 'QUIZ' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {activeDialogTab === 'QUIZ' ? <Award className="h-3.5 w-3.5" /> : <FileIcon className="h-3.5 w-3.5" />}
                      </div>
                      <span className="truncate font-medium pr-2">
                        {title}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={alreadyShowcased ? 'ghost' : 'default'}
                      disabled={alreadyShowcased || resourceId == null}
                      className={alreadyShowcased || resourceId == null ? 'text-slate-400 dark:text-slate-600' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                      onClick={() => handleAddResource(resourceId, activeDialogTab)}
                    >
                      {alreadyShowcased ? 'Đã thêm' : 'Thêm'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Hủy bỏ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Xác nhận xóa */}
      <Dialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <DialogContent className={`max-w-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa Showcase</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gỡ bỏ "{deleteConfirmItem?.quiz?.title || deleteConfirmItem?.material?.name || deleteConfirmItem?.material?.title || 'tài nguyên này'}" khỏi Showcase không?
              <br />
              <span className="text-red-500 text-xs mt-1 block">Khách ghé thăm sẽ không còn nhìn thấy tài nguyên này trên trang public nữa.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmItem(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteItem}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang gỡ...' : 'Gỡ bỏ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
