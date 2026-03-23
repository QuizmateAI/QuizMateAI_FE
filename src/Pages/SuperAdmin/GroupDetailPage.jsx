import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, UsersRound, LayoutDashboard, Users, ListChecks,
  Activity, CreditCard, User,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import ListSpinner from '@/Components/ui/ListSpinner';
import {
  getGroupDetail,
  getGroupSubscription,
  getGroupLogs,
} from '@/api/ManagementSystemAPI';
import { getRoadmapsByWorkspace } from '@/api/RoadmapAPI';

const TABS = [
  { id: 'overview', labelKey: 'groupDetail.tabs.overview', icon: LayoutDashboard },
  { id: 'members', labelKey: 'groupDetail.tabs.members', icon: Users },
  { id: 'content', labelKey: 'groupDetail.tabs.content', icon: ListChecks },
  { id: 'logs', labelKey: 'groupDetail.tabs.logs', icon: Activity },
  { id: 'subscription', labelKey: 'groupDetail.tabs.subscription', icon: CreditCard },
];

function GroupDetailPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeTab, setActiveTab] = useState('overview');
  const [group, setGroup] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const fetchGroup = async () => {
    try {
      const res = await getGroupDetail(workspaceId);
      setGroup(res?.data ?? res);
    } catch (err) {
      setError(err?.message || 'Không thể tải thông tin nhóm');
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await getGroupSubscription(workspaceId);
      setSubscription(res?.data ?? res);
    } catch (err) {
      console.error('Fetch subscription:', err);
      setSubscription(null);
    }
  };

  const fetchRoadmaps = async () => {
    try {
      const res = await getRoadmapsByWorkspace(workspaceId, 0, 50);
      const data = res?.data ?? res;
      const list = data?.content ?? (Array.isArray(data) ? data : []);
      setRoadmaps(list);
    } catch (err) {
      console.error('Fetch roadmaps:', err);
      setRoadmaps([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await getGroupLogs(workspaceId);
      const data = res?.data ?? res;
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch logs:', err);
      setLogs([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      fetchGroup().finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [workspaceId]);

  useEffect(() => {
    if (!group) return;
    const timer = setTimeout(() => {
      if (activeTab === 'overview') {
        fetchSubscription();
        fetchRoadmaps();
      } else if (activeTab === 'content') fetchRoadmaps();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'subscription') fetchSubscription();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, group]);

  if (loading || !group) {
    return (
      <div className={`min-h-[400px] ${fontClass}`}>
        <ListSpinner variant="section" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {error && (
        <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Header + Tabs + Content - đồng bộ với UserDetailPage */}
      <Card className={`border shadow-sm rounded-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${basePath}/groups`)}
              className="rounded-lg shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                <UsersRound className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {group.groupName || group.name}
                </h1>
                <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {group.description ? group.description : `${t('groupDetail.leader')}: ${group.createdByFullName || group.createdByUsername || '-'}`}
                </p>
                <Badge className={`mt-1 inline-block bg-blue-100 text-blue-700 dark:bg-blue-900/30`}>
                  {group.memberCount ?? group.members?.length ?? 0} {t('groupDetail.members')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg h-8 text-xs ${activeTab === tab.id ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                {t(tab.labelKey)}
              </Button>
            ))}
          </div>
        </div>
        <CardContent className="p-4 pt-6">
          {activeTab === 'overview' && (
            <div className="flex flex-wrap gap-3">
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('groupDetail.membersCount')}</p>
                <p className="text-xl font-bold">{group.memberCount ?? group.members?.length ?? 0}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('groupDetail.roadmapsCount')}</p>
                <p className="text-xl font-bold">{roadmaps.length}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('groupDetail.subscription')}</p>
                <p className="text-base font-semibold">{subscription?.plan?.planName ?? t('groupDetail.noPlan')}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('groupDetail.createdAt')}</p>
                <p className="text-sm">{formatDate(group.createdAt)}</p>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              {(!group.members || group.members.length === 0) ? (
                <p className="text-slate-400 text-center py-8">{t('groupDetail.noMembers')}</p>
              ) : (
                group.members.map((m) => {
                  const role = (m.role || '').toUpperCase();
                  const roleColorClass =
                    role === 'LEADER'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : role === 'CONTRIBUTOR'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                  return (
                    <div
                      key={m.groupMemberId ?? m.userId}
                      className={`rounded-xl border grid grid-cols-[40px_1fr] gap-3 p-4 items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {m.fullName || m.username}
                          {m.email && (
                            <span className={`font-normal ml-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              • {m.email}
                            </span>
                          )}
                        </p>
                        <Badge className={`mt-1 text-xs font-medium ${roleColorClass}`}>
                          {m.role}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('groupDetail.roadmaps')}
              </h3>
              {roadmaps.length === 0 ? (
                <p className="text-slate-400 py-8">{t('groupDetail.noRoadmaps')}</p>
              ) : (
                <div className="space-y-2">
                  {roadmaps.map((r) => (
                    <div
                      key={r.roadmapId}
                      className={`p-4 rounded-xl flex items-center gap-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}
                    >
                      <ListChecks className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {r.title || r.roadmapName}
                        </p>
                        {r.description && (
                          <p className="text-sm text-slate-500">{r.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t('groupDetail.noLogs')}</p>
              ) : (
                logs.map((log, i) => {
                  const action = (log.action || log.actionType || '').toUpperCase();
                  const actionColor =
                    action === 'SEND_INVITATION' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                    action === 'MEMBER_JOINED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                    action.includes('LEAVE') || action.includes('REMOVE') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
                  return (
                    <div
                      key={log.logId ?? i}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge className={`shrink-0 font-medium ${actionColor}`}>
                          {log.action || log.actionType}
                        </Badge>
                        {(log.description || log.actorEmail || log.resource) && (
                          <p className={`text-sm min-w-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {log.description || log.actorEmail || log.resource}
                          </p>
                        )}
                      </div>
                      <p className={`text-xs shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDate(log.logTime || log.timestamp || log.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {!subscription ? (
                <p className="text-slate-400 text-center py-8">{t('groupDetail.noSubscription')}</p>
              ) : (
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {subscription.plan?.planName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">{t('groupDetail.status')}</p>
                      <p className="font-medium">{subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('groupDetail.endDate')}</p>
                      <p className="font-medium">{formatDate(subscription.endDate)}</p>
                    </div>
                    {subscription.plan?.price != null && (
                      <div>
                        <p className="text-slate-500">{t('groupDetail.price')}</p>
                        <p className="font-medium">{subscription.plan.price?.toLocaleString('vi-VN')} VNĐ</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GroupDetailPage;
