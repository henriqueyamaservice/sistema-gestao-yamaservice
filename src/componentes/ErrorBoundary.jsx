import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          margin: '20px auto',
          maxWidth: '600px',
          backgroundColor: '#1e293b',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Alerta de Exibição no Módulo
          </h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '12px', wordBreak: 'break-word', color: '#fca5a5' }}>
            <strong>Detalhe do Erro:</strong> {this.state.error?.toString() || 'Erro desconhecido.'}
          </p>
          {this.state.errorInfo && (
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              overflowX: 'auto',
              maxHeight: '250px',
              whiteSpace: 'pre-wrap',
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '16px',
              backgroundColor: '#ff6b00',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 Recarregar Módulo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
