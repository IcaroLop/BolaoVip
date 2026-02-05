import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    console.error('[ErrorBoundary] getDerivedStateFromError:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] ❌❌❌ ERRO CAPTURADO:', {
      message: error.toString(),
      stack: errorInfo.componentStack
    });
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      console.error('[ErrorBoundary] ❌ Renderizando tela de erro porque hasError=true');
      return (
        <div style={{
          padding: '2rem',
          backgroundColor: '#1C2128',
          color: '#fff',
          borderRadius: '8px',
          margin: '1rem',
          border: '2px solid #FF6B6B'
        }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>⚠️ Erro ao Renderizar Página</h2>
          <p><strong>Mensagem:</strong> {this.state.error && this.state.error.toString()}</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', fontSize: '0.85rem' }}>
            <summary style={{ cursor: 'pointer', color: '#FFA' }}>Detalhes técnicos</summary>
            <code style={{ display: 'block', marginTop: '0.5rem', color: '#aaa' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </code>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00FF88',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
