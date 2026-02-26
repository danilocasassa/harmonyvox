import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { DollarSign, AlertTriangle } from 'lucide-react';

export default function AdminPricing() {
  const [price, setPrice] = useState('29.90');
  const [applyToAll, setApplyToAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadPricing(); }, []);

  const loadPricing = async () => {
    try {
      const res = await axiosAuth().get('/admin/pricing');
      setPrice(res.data.current_price?.toString() || '29.90');
      setApplyToAll(res.data.apply_to_all || false);
    } catch { toast.error('Erro ao carregar preços'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    setSaving(true);
    try {
      await axiosAuth().put('/admin/pricing', { price: priceVal, apply_to_all: applyToAll });
      toast.success('Preço atualizado!');
    } catch { toast.error('Erro ao atualizar preço'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Configuração de Preços</h1>

      <div className="glass-card rounded-xl p-8 max-w-lg space-y-8">
        <div className="space-y-2">
          <Label style={{ color: '#94a3b8' }}>Preço Mensal (R$)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#FFD700' }} />
            <Input
              data-testid="admin-price-input"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-10 h-12 bg-black/20 border-white/10 focus:border-[#FFD700] text-white text-lg font-bold"
            />
          </div>
        </div>

        <div className="p-4 rounded-lg space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm" style={{ color: '#f8fafc' }}>Aplicar para todos os usuários</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {applyToAll
                  ? 'O novo preço será aplicado a TODOS os usuários existentes e novos.'
                  : 'O novo preço será aplicado apenas para NOVOS usuários. Usuários existentes mantêm o valor atual.'
                }
              </p>
            </div>
            <Switch
              checked={applyToAll}
              onCheckedChange={setApplyToAll}
              data-testid="admin-price-apply-all"
            />
          </div>
          {applyToAll && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-xs" style={{ color: '#ef4444' }}>
                Atenção: Todos os usuários passarão a pagar R$ {parseFloat(price || 0).toFixed(2)} na próxima renovação.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          data-testid="admin-save-pricing-btn"
          className="w-full h-12 font-bold text-black"
          style={{ background: '#FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.3)' }}
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </div>
    </div>
  );
}
