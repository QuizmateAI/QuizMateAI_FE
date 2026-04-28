import {
  Banknote,
  Bot,
  Coins,
  Cpu,
  CreditCard,
  Globe2,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  Settings2,
  Shield,
  Users,
  UsersRound,
} from 'lucide-react';

export const SUPER_ADMIN_MENU_SECTIONS = [
  {
    id: 'overview',
    labelKey: 'sidebarSections.overview',
    defaultLabel: 'Overview',
    items: [
      {
        id: 'dashboard',
        labelKey: 'sidebar.dashboard',
        defaultLabel: 'Dashboard',
        icon: LayoutDashboard,
        to: '/super-admin',
        matchPrefix: false,
      },
    ],
  },
  {
    id: 'workspace',
    labelKey: 'sidebarSections.workspace',
    defaultLabel: 'Workspace',
    items: [
      {
        id: 'users',
        labelKey: 'sidebar.users',
        defaultLabel: 'Users',
        icon: Users,
        to: '/super-admin/users',
        matchPrefix: true,
      },
      {
        id: 'groups',
        labelKey: 'sidebar.groups',
        defaultLabel: 'Groups',
        icon: UsersRound,
        to: '/super-admin/groups',
        matchPrefix: true,
      },
      {
        id: 'community-quizzes',
        labelKey: 'sidebar.communityQuizzes',
        defaultLabel: 'Community Quizzes',
        icon: Globe2,
        to: '/super-admin/community-quizzes',
        matchPrefix: true,
      },
    ],
  },
  {
    id: 'commerce',
    labelKey: 'sidebarSections.commerce',
    defaultLabel: 'Commerce',
    items: [
      {
        id: 'plans',
        labelKey: 'sidebar.subscriptions',
        defaultLabel: 'Subscription Plans',
        icon: CreditCard,
        to: '/super-admin/plans',
        matchPrefix: true,
      },
      {
        id: 'credits',
        labelKey: 'sidebar.creditPackages',
        defaultLabel: 'Credit Packages',
        icon: Coins,
        to: '/super-admin/credits',
        matchPrefix: true,
      },
      {
        id: 'payments',
        labelKey: 'sidebar.payments',
        defaultLabel: 'Payments',
        icon: Banknote,
        to: '/super-admin/payments',
        matchPrefix: true,
      },
    ],
  },
  {
    id: 'access-control',
    labelKey: 'sidebarSections.accessControl',
    defaultLabel: 'Access Control',
    items: [
      {
        id: 'admins',
        labelKey: 'sidebar.adminAccounts',
        defaultLabel: 'Admin Accounts',
        icon: Shield,
        to: '/super-admin/admins',
        matchPrefix: true,
      },
      {
        id: 'rbac',
        labelKey: 'sidebar.rbac',
        defaultLabel: 'RBAC',
        icon: KeyRound,
        to: '/super-admin/rbac',
        matchPrefix: true,
      },
    ],
  },
  {
    id: 'ai-governance',
    labelKey: 'sidebarSections.aiGovernance',
    defaultLabel: 'AI Governance',
    items: [
      {
        id: 'ai-providers',
        labelKey: 'sidebar.aiProviders',
        defaultLabel: 'AI Providers',
        icon: Cpu,
        to: '/super-admin/ai-providers',
        matchPrefix: true,
      },
      {
        id: 'ai-models',
        labelKey: 'sidebar.aiModels',
        defaultLabel: 'AI Models',
        icon: Cpu,
        to: '/super-admin/ai-models',
        matchPrefix: true,
      },
      {
        id: 'ai-costs',
        labelKey: 'sidebar.aiCosts',
        defaultLabel: 'AI Costs',
        icon: ReceiptText,
        to: '/super-admin/ai-costs',
        matchPrefix: true,
      },
      {
        id: 'ai-audit',
        labelKey: 'sidebar.aiAudit',
        defaultLabel: 'AI Audit Logs',
        icon: Bot,
        to: '/super-admin/ai-audit',
        matchPrefix: true,
      },
      {
        id: 'ai-action-policies',
        labelKey: 'sidebar.aiActionPolicies',
        defaultLabel: 'Action Policies',
        icon: Cpu,
        to: '/super-admin/ai-action-policies',
        matchPrefix: true,
      },
    ],
  },
  {
    id: 'platform',
    labelKey: 'sidebarSections.platformConfig',
    defaultLabel: 'Platform',
    items: [
      {
        id: 'system-settings',
        labelKey: 'sidebar.systemSettings',
        defaultLabel: 'System Settings',
        icon: Settings2,
        to: '/super-admin/system-settings',
        matchPrefix: true,
      },
      {
        id: 'feedbacks',
        labelKey: 'sidebar.feedback',
        defaultLabel: 'Feedback',
        icon: MessageSquareText,
        to: '/super-admin/feedbacks',
        matchPrefix: true,
      },
    ],
  },
];

const FEEDBACK_SUBROUTE_LABELS = {
  forms: 'Forms',
  tickets: 'Tickets',
  activity: 'Response Activity',
};

const DETAIL_LABELS = {
  users: 'User Detail',
  groups: 'Group Detail',
};

export function isSuperAdminItemActive(item, pathname) {
  if (!pathname || !item?.to) return false;
  if (pathname === item.to) return true;
  if (item.matchPrefix && pathname.startsWith(`${item.to}/`)) return true;
  return false;
}

export function findSuperAdminNavMeta(pathname) {
  for (const section of SUPER_ADMIN_MENU_SECTIONS) {
    for (const item of section.items) {
      if (isSuperAdminItemActive(item, pathname)) {
        return { section, item };
      }
    }
  }

  return {
    section: SUPER_ADMIN_MENU_SECTIONS[0],
    item: SUPER_ADMIN_MENU_SECTIONS[0].items[0],
  };
}

function getExtraCrumb(pathname) {
  if (pathname.startsWith('/super-admin/feedbacks/')) {
    const leaf = pathname.split('/').filter(Boolean).at(-1);
    return FEEDBACK_SUBROUTE_LABELS[leaf] || null;
  }

  if (pathname.startsWith('/super-admin/users/')) {
    return DETAIL_LABELS.users;
  }

  if (pathname.startsWith('/super-admin/groups/')) {
    return DETAIL_LABELS.groups;
  }

  return null;
}

export function getSuperAdminPageMeta(pathname, t) {
  const { section, item } = findSuperAdminNavMeta(pathname);
  const sectionLabel = t(section.labelKey, section.defaultLabel);
  const itemLabel = t(item.labelKey, item.defaultLabel);
  const extraLabel = getExtraCrumb(pathname);
  const breadcrumbs = ['Super Admin'];

  if (section.id !== 'overview') {
    breadcrumbs.push(sectionLabel);
  }

  breadcrumbs.push(itemLabel);

  if (extraLabel && extraLabel !== itemLabel) {
    breadcrumbs.push(extraLabel);
  }

  return {
    section,
    item,
    sectionLabel,
    title: extraLabel || itemLabel,
    breadcrumbs,
  };
}
