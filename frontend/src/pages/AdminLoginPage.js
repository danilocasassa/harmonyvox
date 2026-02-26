import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Bem-vindo, Admin!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#02040a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <Shield className="w-8 h-8" style={{ color: '#FFD700' }} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            Painel Admin
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email" style={{ color: '#94a3b8' }}>Email</Label>
            <Input
              id="admin-email"
              data-testid="admin-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vocallayers.com"
              required
              className="h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" style={{ color: '#94a3b8' }}>Senha</Label>
            <div className="relative">
              <Input
                id="admin-password"
                data-testid="admin-login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha admin"
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
            data-testid="admin-login-submit"
            disabled={loading}
            className="w-full h-12 font-bold uppercase tracking-wider text-black"
            style={{ background: '#FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.3)' }}
          >
            {loading ? 'Entrando...' : 'Entrar como Admin'}
          </Button>
        </form>
      </div>
    </div>
  );
}
