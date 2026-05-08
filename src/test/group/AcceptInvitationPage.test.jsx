import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptInvitationPage from '@/pages/Users/Group/AcceptInvitationPage';
import { acceptInvitation, previewInvitation } from '@/api/GroupAPI';
import { __resetForTests, setAccessToken } from '@/utils/tokenStorage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
  Trans: ({ defaults = '', values = {} }) => {
    const resolvedText = Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value ?? '')),
      defaults,
    ).replace(/<\/?\d+>/g, '');

    return resolvedText;
  },
}));

const mockNavigate = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockShowInfo = vi.fn();

let mockToken = 'invite-token';

function toBase64Url(value) {
  return window.btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createMockJwt(email) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({ sub: email }));
  return `${header}.${payload}.signature`;
}

vi.mock('@/api/GroupAPI', () => ({
  acceptInvitation: vi.fn(),
  previewInvitation: vi.fn(),
}));

vi.mock('@/api/Authentication', () => ({
  logout: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: mockShowInfo,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(mockToken ? `token=${mockToken}` : '')],
  };
});

const invitationPreview = {
  workspaceId: 77,
  groupName: 'IELTS Sprint Team',
  groupDescription: 'Nhóm học IELTS speaking và reading.',
  invitedEmail: 'member@example.com',
  invitedByFullName: 'Thanh Nguyen',
  invitedByUsername: 'thanh.lead',
  domain: 'IELTS',
  learningMode: 'STUDY_NEW',
  knowledge: 'Reading, Writing',
  groupLearningGoal: 'Band 7.0',
  status: 'PENDING',
  expiredDate: '2026-04-05T10:30:00Z',
};

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = 'invite-token';
    window.localStorage.clear();
    window.sessionStorage.clear();
    __resetForTests();
  });

  it('shows invalid invitation state when token is missing', async () => {
    mockToken = null;

    render(<AcceptInvitationPage />);

    expect(await screen.findByText('Unable to open the invitation')).toBeInTheDocument();
    expect(screen.getByText('The invitation link is invalid. Please double-check your email.')).toBeInTheDocument();
    expect(previewInvitation).not.toHaveBeenCalled();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('loads preview data and asks unauthenticated users to log in before confirming', async () => {
    previewInvitation.mockResolvedValue({ data: invitationPreview });

    render(<AcceptInvitationPage />);

    expect(await screen.findByRole('button', { name: 'Sign in to confirm' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IELTS Sprint Team' })).toBeInTheDocument();
    expect(screen.getByText('Study new topics')).toBeInTheDocument();
    expect(previewInvitation).toHaveBeenCalledWith('invite-token');
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('accepts the invitation for the matching account and redirects to the group workspace', async () => {
    setAccessToken(createMockJwt('member@example.com'));
    window.localStorage.setItem('user', JSON.stringify({
      userID: 5,
      username: 'member',
      email: 'member@example.com',
    }));

    previewInvitation.mockResolvedValue({ data: invitationPreview });
    acceptInvitation.mockResolvedValue({
      message: 'Chào mừng bạn đã tham gia nhóm!',
      data: {
        ...invitationPreview,
        invitationStatus: 'ACCEPTED',
        memberRole: 'MEMBER',
        joinedAt: '2026-03-27T09:30:00Z',
      },
    });

    render(<AcceptInvitationPage />);

    const confirmButton = await screen.findByRole('button', { name: 'Confirm and join group' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledTimes(1);
    });

    expect(window.sessionStorage.getItem('group-invite-welcome:77')).toContain('IELTS Sprint Team');
    expect(mockNavigate).toHaveBeenCalledWith('/group-workspaces/77?welcome=1', { replace: true });
    expect(mockShowSuccess).toHaveBeenCalledWith('Chào mừng bạn đã tham gia nhóm!');
  });

  it('shows mismatch state when the stored user email differs from the JWT email', async () => {
    setAccessToken(createMockJwt('ngoctbse183713@fpt.edu.vn'));
    window.localStorage.setItem('user', JSON.stringify({
      userID: 5,
      username: 'member',
      email: 'member@example.com',
    }));

    previewInvitation.mockResolvedValue({ data: invitationPreview });

    render(<AcceptInvitationPage />);

    expect(await screen.findByText(/You are signed in to the wrong account/i)).toBeInTheDocument();
    expect(screen.getByText(/ngoctbse183713@fpt\.edu\.vn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with the correct email/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm and join group' })).not.toBeInTheDocument();
  });
});
