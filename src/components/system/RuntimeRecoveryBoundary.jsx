import { Component } from 'react';
import { tryScheduleRuntimeRecovery } from '@/lib/runtimeRecovery';

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const styles = {
  root: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    overflow: 'hidden',
    background:
      'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.18) 0%, rgba(2, 6, 23, 0) 55%), radial-gradient(ellipse at bottom, rgba(99, 102, 241, 0.12) 0%, rgba(2, 6, 23, 0) 60%), #020617',
    color: '#f8fafc',
    fontFamily: FONT_STACK,
  },
  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '480px',
    height: '480px',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0) 65%)',
    filter: 'blur(40px)',
    pointerEvents: 'none',
    animation: 'qm-rec-pulse 4s ease-in-out infinite',
  },
  panel: {
    position: 'relative',
    width: '100%',
    maxWidth: '440px',
    boxSizing: 'border-box',
    padding: '40px 32px',
    borderRadius: '20px',
    border: '1px solid rgba(59, 130, 246, 0.18)',
    background:
      'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%)',
    boxShadow:
      '0 25px 60px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  brandMark: {
    position: 'relative',
    width: '76px',
    height: '76px',
    borderRadius: '22px',
    background:
      'linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.05em',
    fontFamily: FONT_STACK,
    boxShadow:
      '0 10px 30px -8px rgba(59, 130, 246, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)',
    animation: 'qm-rec-float 3.6s ease-in-out infinite',
  },
  wordmark: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    backgroundImage:
      'linear-gradient(90deg, #93c5fd 0%, #ffffff 50%, #93c5fd 100%)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    animation: 'qm-rec-shimmer 3s linear infinite',
  },
  dotsRow: {
    display: 'flex',
    gap: '10px',
    margin: '2px 0 0 0',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#3b82f6',
    boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)',
    animation: 'qm-rec-bounce 1.4s ease-in-out infinite both',
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1.45,
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: 1.55,
    maxWidth: '320px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 22px',
    borderRadius: '12px',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    background:
      'linear-gradient(180deg, rgba(59, 130, 246, 0.18) 0%, rgba(37, 99, 235, 0.14) 100%)',
    color: '#dbeafe',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.01em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'transform 120ms ease, background-color 120ms ease',
  },
  errorBlock: {
    margin: '8px 0 0 0',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(244, 63, 94, 0.25)',
    background: 'rgba(2, 6, 23, 0.7)',
    fontSize: '11px',
    color: '#fecaca',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    maxHeight: '160px',
  },
};

const KEYFRAMES = `
@keyframes qm-rec-pulse {
  0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.95); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
}
@keyframes qm-rec-shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes qm-rec-bounce {
  0%, 80%, 100% { transform: translateY(0) scale(0.7); opacity: 0.45; }
  40% { transform: translateY(-8px) scale(1); opacity: 1; }
}
@keyframes qm-rec-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

export function RuntimeRecoveryScreen({
  error = null,
  isReloading = false,
  onReload = null,
}) {
  const title = isReloading
    ? 'Đang tải lại QuizMate AI...'
    : 'QuizMate AI đang khôi phục lại...';
  const subtitle = isReloading
    ? 'Sắp xong rồi, bạn đừng đóng tab nhé!'
    : 'Xin chờ một lát nhé. Nếu lâu quá, bạn có thể bấm “Tải lại ngay”.';
  const actionLabel = 'Tải lại ngay';

  return (
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>
      <div style={styles.glow} aria-hidden="true" />
      <div style={styles.panel}>
        <div style={styles.brandMark} aria-hidden="true">
          Q
        </div>
        <h1 style={styles.wordmark}>QuizMate AI</h1>
        <div style={styles.dotsRow} role="status" aria-label="Đang tải">
          <span style={{ ...styles.dot, animationDelay: '0s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.16s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.32s' }} />
        </div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{subtitle}</p>
        {!isReloading ? (
          <button type="button" onClick={onReload} style={styles.button}>
            {actionLabel}
          </button>
        ) : null}
        {import.meta.env.DEV && error ? (
          <pre style={styles.errorBlock}>
            {String(error?.stack || error?.message || error)}
          </pre>
        ) : null}
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
