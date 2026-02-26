import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Music, Flame, DollarSign, LogOut, Shield } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Usuários', icon: Users },
  { path: '/admin/songs', label: 'Músicas', icon: Music },
  { path: '/admin/warmup', label: 'Warm Up', icon: Flame },
  { path: '/admin/pricing', label: 'Preços', icon: DollarSign },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#02040a' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r flex flex-col" style={{ background: '#0a0c14', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="p-6 flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: '#FFD700' }} />
          <span className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive(item) ? 'rgba(255,215,0,0.1)' : 'transparent',
                color: isActive(item) ? '#FFD700' : '#94a3b8',
                borderLeft: isActive(item) ? '2px solid #FFD700' : '2px solid transparent'
              }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            data-testid="admin-logout"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: '#94a3b8' }}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
