import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, Music, Flame, DollarSign, LogOut, Shield, Menu, X } from 'lucide-react';
import Logo from '../../components/Logo';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#02040a' }}>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 lg:hidden" style={{ background: '#0a0c14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <Logo size="sm" />
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="admin-menu-toggle"
          className="p-2 rounded-lg" style={{ color: '#94a3b8' }}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} data-testid="sidebar-overlay" />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 flex-shrink-0 border-r flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: '#0a0c14', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="p-6">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => handleNav(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive(item) ? 'rgba(166,14,247,0.1)' : 'transparent',
                color: isActive(item) ? '#a60ef7' : '#94a3b8',
                borderLeft: isActive(item) ? '2px solid #a60ef7' : '2px solid transparent'
              }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={() => { logout(); navigate('/admin/login'); }} data-testid="admin-logout"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: '#94a3b8' }}>
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
