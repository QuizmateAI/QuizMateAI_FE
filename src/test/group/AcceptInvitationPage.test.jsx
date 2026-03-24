import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptInvitationPage from '@/Pages/Users/Group/AcceptInvitationPage';
import { acceptInvitation } from '@/api/GroupAPI';

const mockNavigate = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
let mockToken = 'invite-token';

vi.mock('@/api/GroupAPI', () => ({
  acceptInvitation: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
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

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = 'invite-token';
  });

  it('shows success and only accepts the invitation once in StrictMode', async () => {
    acceptInvitation.mockResolvedValue({
      statusCode: 200,
      message: 'Tham gia nhóm thành công!',
    });

    render(
      <StrictMode>
        <AcceptInvitationPage />
      </StrictMode>,
    );

    expect(await screen.findByText('Thành công!')).toBeInTheDocument();
    expect(screen.getByText('Tham gia nhóm thành công!')).toBeInTheDocument();

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledTimes(1);
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('Tham gia nhóm thành công!');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('shows invalid-url state when token is missing', async () => {
    mockToken = null;

    render(<AcceptInvitationPage />);

    expect(await screen.findByText('Không thể tham gia')).toBeInTheDocument();
    expect(
      screen.getByText('URL không hợp lệ. Vui lòng kiểm tra lại đường dẫn trong email.'),
    ).toBeInTheDocument();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });
});
