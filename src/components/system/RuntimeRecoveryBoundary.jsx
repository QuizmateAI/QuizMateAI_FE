import { Component } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { tryScheduleRuntimeRecovery } from '@/lib/runtimeRecovery';

export function RuntimeRecoveryScreen({
  error = null,
  isReloading = false,
  onReload = null,
}) {
  const title = isReloading
    ? 'Dang khoi phuc ung dung...'
    : 'Ung dung vua gap loi tai tai nguyen';
  const description = isReloading
    ? 'Trang dang duoc tai lai de dong bo lai phien ban moi nhat.'
    : 'Mot chunk giao dien hoac module tai cham/that bai tren server. Tai lai thuong se vao lai binh thuong.';
  const actionLabel = isReloading ? 'Dang tai lai...' : 'Tai lai ngay';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <LoadingSpinner />
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="text-sm leading-6 text-slate-300">{description}</p>
            {!isReloading ? (
              <button
                type="button"
                onClick={onReload}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                {actionLabel}
              </button>
            ) : (
              <p className="text-xs text-slate-400">{actionLabel}</p>
            )}
            {import.meta.env.DEV && error ? (
              <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-rose-200">
                {String(error?.stack || error?.message || error)}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

class RuntimeRecoveryBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isReloading: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    const isReloading = tryScheduleRuntimeRecovery(error);

    if (isReloading !== this.state.isReloading) {
      this.setState({ isReloading });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <RuntimeRecoveryScreen
          error={this.state.error}
          isReloading={this.state.isReloading}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

export default RuntimeRecoveryBoundary;
