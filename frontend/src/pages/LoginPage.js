import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Music, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      toast.success('Se o email existir, uma nova senha será enviada.');
      setShowForgot(false);
    } catch {
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#02040a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <Music className="w-8 h-8" style={{ color: '#FFD700' }} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            HarmonyVox
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>Treine seus naipes vocais</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleLogin} className="glass-card rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#94a3b8' }}>Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#94a3b8' }}>Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white placeholder:text-white/30 pr-12"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 font-bold uppercase tracking-wider text-black"
              style={{ background: '#FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.3)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setShowForgot(true)} className="hover:underline" style={{ color: '#FFD700' }} data-testid="forgot-password-link">
                Esqueci minha senha
              </button>
              <Link to="/register" className="hover:underline" style={{ color: '#FFD700' }} data-testid="register-link">
                Criar conta
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="glass-card rounded-xl p-8 space-y-6">
            <h2 className="text-xl font-bold" style={{ color: '#f8fafc', fontFamily: 'Playfair Display, serif' }}>Recuperar Senha</h2>
            <p className="text-sm" style={{ color: '#94a3b8' }}>Informe seu email e enviaremos uma nova senha temporária.</p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email" style={{ color: '#94a3b8' }}>Email</Label>
              <Input
                id="forgot-email"
                data-testid="forgot-email-input"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 font-bold text-black" style={{ background: '#FFD700' }} data-testid="forgot-submit-button">
              {loading ? 'Enviando...' : 'Enviar nova senha'}
            </Button>
            <button type="button" onClick={() => setShowForgot(false)} className="text-sm hover:underline block" style={{ color: '#FFD700' }}>
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
