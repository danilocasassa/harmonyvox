import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Check } from 'lucide-react';
import Logo from '../components/Logo';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [planType, setPlanType] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/plans`).then(r => r.json()).then(setPlans).catch(() => {});
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan_type: planType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro');
      localStorage.setItem('vl_token', data.token);
      toast.success('Conta criada com sucesso!');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#02040a' }}>
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" />
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            Criar Conta
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>Junte-se ao HarmonyVox</p>
        </div>

        <form onSubmit={handleRegister} className="glass-card rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: '#94a3b8' }}>Nome</Label>
            <Input id="name" data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome" required className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: '#94a3b8' }}>Email</Label>
            <Input id="email" data-testid="register-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" required className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: '#94a3b8' }}>Senha</Label>
            <div className="relative">
              <Input id="password" data-testid="register-password-input" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
                className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white placeholder:text-white/30 pr-12" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Plan selection */}
          <div className="space-y-2">
            <Label style={{ color: '#94a3b8' }}>Plano</Label>
            <div className="grid grid-cols-3 gap-2">
              {(plans.length > 0 ? plans : [
                { id: 'monthly', label: 'Mensal', total_price: 29.90 },
                { id: 'semester', label: 'Semestral', total_price: 179.40 },
                { id: 'annual', label: 'Anual', total_price: 358.80 },
              ]).map(plan => (
                <button key={plan.id} type="button" data-testid={`plan-${plan.id}`}
                  onClick={() => setPlanType(plan.id)}
                  className="relative p-3 rounded-xl text-center transition-all"
                  style={{
                    background: planType === plan.id ? 'rgba(166,14,247,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${planType === plan.id ? 'rgba(166,14,247,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                  {planType === plan.id && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#a60ef7' }}>
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <p className="text-xs font-medium mb-1" style={{ color: planType === plan.id ? '#a60ef7' : '#94a3b8' }}>{plan.label}</p>
                  <p className="text-sm font-bold" style={{ color: '#f8fafc' }}>R$ {plan.total_price?.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" data-testid="register-submit-button" disabled={loading}
            className="w-full h-12 font-bold uppercase tracking-wider text-black"
            style={{ background: '#a60ef7', boxShadow: '0 0 15px rgba(166,14,247,0.3)' }}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="hover:underline" style={{ color: '#a60ef7' }} data-testid="back-to-login-link">
              Já tem conta? Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
