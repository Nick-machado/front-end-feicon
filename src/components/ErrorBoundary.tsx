import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-hm-bg-soft text-hm-gray-700 flex items-center justify-center p-4">
          <div className="max-w-lg bg-hm-white rounded border border-red-300 p-8 shadow-md">
            <h1 className="font-display text-2xl font-bold text-red-600 mb-4 uppercase">
              ⚠️ Erro na Aplicação
            </h1>
            <p className="text-hm-gray-400 mb-4">
              Ocorreu um erro inesperado:
            </p>
            <div className="bg-red-50 border border-red-200 p-3 rounded mb-6">
              <code className="text-red-600 text-sm break-words">
                {this.state.error?.message || 'Erro desconhecido'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-hm-green text-hm-black rounded font-btn font-600 text-sm uppercase tracking-wide hover:bg-hm-green-hover transition"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
