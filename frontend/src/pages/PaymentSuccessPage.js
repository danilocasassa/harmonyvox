import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) pollStatus(0);
    else setStatus('error');
  }, [sessionId]);

  const pollStatus = async (attempt) => {
    if (attempt >= 5) {
      setStatus('timeout');
      return;
    }
    try {
      const API = process.env.REACT_APP_BACKEND_URL + '/api';
      const res = await fetch(`${API}/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.payment_status === 'paid') {
        setStatus('success');
        await refreshUser();
        toast.success('Pagamento confirmado!');
      } else if (data.status === 'expired') {
        setStatus('error');
      } else {
        setTimeout(() => pollStatus(attempt + 1), 2000);
      }
    } catch {
      setTimeout(() => pollStatus(attempt + 1), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#02040a' }}>
      <div className="glass-card rounded-xl p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#FFD700' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Processando...</h2>
            <p style={{ color: '#94a3b8' }}>Verificando seu pagamento.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Pagamento Confirmado!</h2>
            <p className="mb-6" style={{ color: '#94a3b8' }}>Sua assinatura foi renovada por mais 30 dias.</p>
            <Button onClick={() => navigate('/')} data-testid="payment-go-home" className="h-12 font-bold text-black px-8" style={{ background: '#FFD700' }}>
              Ir para Repertório
            </Button>
          </>
        )}
        {(status === 'error' || status === 'timeout') && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
              {status === 'timeout' ? 'Tempo Esgotado' : 'Erro no Pagamento'}
            </h2>
            <p className="mb-6" style={{ color: '#94a3b8' }}>
              {status === 'timeout' ? 'O status do pagamento não pôde ser verificado. Verifique seu email.' : 'O pagamento não foi concluído.'}
            </p>
            <Button onClick={() => navigate('/profile')} data-testid="payment-go-profile" className="h-12 font-bold text-black px-8" style={{ background: '#FFD700' }}>
              Voltar ao Perfil
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
