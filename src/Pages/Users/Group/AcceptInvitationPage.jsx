import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { acceptInvitation } from '@/api/GroupAPI';
import { useToast } from '@/context/ToastContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const pendingInvitationRequests = new Map();

function acceptInvitationOnce(token) {
  if (!pendingInvitationRequests.has(token)) {
    const request = acceptInvitation(token).finally(() => {
      pendingInvitationRequests.delete(token);
    });
    pendingInvitationRequests.set(token, request);
  }

  return pendingInvitationRequests.get(token);
}

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('URL không hợp lệ. Vui lòng kiểm tra lại đường dẫn trong email.');
      return;
    }

    setLoading(true);
    setSuccess(false);
    setMessage('');

    let isActive = true;

    const processAccept = async () => {
      try {
        // Lời mời là thao tác one-time, cần dùng chung promise để tránh consume token 2 lần trong StrictMode.
        const response = await acceptInvitationOnce(token);
        if (!isActive) {
          return;
        }

        if (response?.statusCode === 200 || response?.statusCode === 0) {
          const successMessage = response?.message || 'Chấp nhận lời mời nhóm thành công!';
          setSuccess(true);
          setMessage(successMessage);
          showSuccess(successMessage);
        } else {
          const errorMessage = response?.message || 'Có lỗi xảy ra khi xác nhận lời mời.';
          setSuccess(false);
          setMessage(errorMessage);
          showError(errorMessage);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSuccess(false);
        const errMsg =
          error?.message ||
          error?.data?.message ||
          error?.response?.data?.message ||
          'Lời mời không hợp lệ, đã hết hạn, hoặc email này chưa được đăng ký tài khoản.';
        setMessage(errMsg);
        showError(errMsg);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    processAccept();

    return () => {
      isActive = false;
    };
  }, [token, showSuccess, showError]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-800">Đang xử lý lời mời...</h2>
            <p className="text-slate-500">Vui lòng chờ trong giây lát</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-20 h-20 text-green-500" />
            <h2 className="text-2xl font-bold text-slate-800">Thành công!</h2>
            <p className="text-slate-600">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
            <XCircle className="w-20 h-20 text-red-500" />
            <h2 className="text-2xl font-bold text-slate-800">Không thể tham gia</h2>
            <p className="text-slate-600 font-medium">{message}</p>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
              >
                Đăng ký tài khoản
              </button>
              <button
                onClick={() => navigate('/home')}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AcceptInvitationPage;
