import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Music, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conta');
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
            Criar Conta
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>Junte-se ao Vocal Layers</p>
        </div>

        <form onSubmit={handleRegister} className="glass-card rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: '#94a3b8' }}>Nome</Label>
            <Input
              id="name"
              data-testid="register-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: '#94a3b8' }}>Email</Label>
            <Input
              id="email"
              data-testid="register-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: '#94a3b8' }}>Senha</Label>
            <div className="relative">
              <Input
                id="password"
                data-testid="register-password-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
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
            data-testid="register-submit-button"
            disabled={loading}
            className="w-full h-12 font-bold uppercase tracking-wider text-black"
            style={{ background: '#FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.3)' }}
          >
            {loading ? 'Criando...' : 'Criar Conta'}
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="hover:underline" style={{ color: '#FFD700' }} data-testid="back-to-login-link">
              Já tem conta? Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
