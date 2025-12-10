import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { Home, LogOut, Calendar as CalendarIcon, Users, UserPlus, Trophy, QrCode, ArrowLeft, Menu, X, Layers } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter'; // Supondo que este componente exista

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink: React.FC<{ to: string; icon: React.ElementType; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => (
  <li>
    <Link to={to} onClick={onClick} className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
      <Icon className="mr-3 h-5 w-5" /> {label}
    </Link>
  </li>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Renderiza o layout completo para usuários autenticados
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex md:w-64 bg-white shadow-md flex-col flex-shrink-0">
          <div className="p-6 text-center border-b">
            <h1 className="text-xl font-bold text-blue-600">GTA Presença</h1>
            <p className="text-sm text-gray-500 mt-1">Bem-vindo, {user?.username}</p>
          </div>
          <nav className="flex-grow p-4">
            <ul className="space-y-2">
              <NavLink to="/portal" icon={ArrowLeft} label="Voltar ao Portal" />
              <NavLink to="/dashboard" icon={Home} label="Dashboard" />
              <NavLink to="/register-attendance" icon={QrCode} label="Registrar Presença" />
              <NavLink to="/register-participant" icon={UserPlus} label="Cadastrar Participante" />
              <NavLink to="/activities" icon={CalendarIcon} label="Atividades" />
              <NavLink to="/groups" icon={Layers} label="Grupos Temáticos" />
              <NavLink to="/participants" icon={Users} label="Lista de Participantes" />
              <NavLink to="/ranking" icon={Trophy} label="Ranking" />
            </ul>
          </nav>
          <div className="p-4 border-t">
            <button onClick={handleLogout} className="flex items-center w-full p-3 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
              <LogOut className="mr-3" /> Sair
            </button>
          </div>
        </aside>

        {/* Drawer Mobile */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeMobileMenu} aria-hidden="true"></div>
            <div className="relative h-full w-72 bg-white shadow-2xl p-4">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-blue-600">GTA Presença</h2>
                  <p className="text-xs text-gray-500">{user?.username}</p>
                </div>
                <button aria-label="Fechar menu" className="p-2 rounded-md hover:bg-gray-100" onClick={closeMobileMenu}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="overflow-y-auto">
                <ul className="space-y-2">
                  <NavLink to="/portal" icon={ArrowLeft} label="Voltar ao Portal" onClick={closeMobileMenu} />
                  <NavLink to="/dashboard" icon={Home} label="Dashboard" onClick={closeMobileMenu} />
                  <NavLink to="/register-attendance" icon={QrCode} label="Registrar Presença" onClick={closeMobileMenu} />
                  <NavLink to="/register-participant" icon={UserPlus} label="Cadastrar Participante" onClick={closeMobileMenu} />
                  <NavLink to="/activities" icon={CalendarIcon} label="Atividades" onClick={closeMobileMenu} />
                  <NavLink to="/groups" icon={Layers} label="Grupos Temáticos" onClick={closeMobileMenu} />
                  <NavLink to="/participants" icon={Users} label="Lista de Participantes" onClick={closeMobileMenu} />
                  <NavLink to="/ranking" icon={Trophy} label="Ranking" onClick={closeMobileMenu} />
                </ul>
              </nav>
              <div className="pt-4 border-t mt-4">
                <button onClick={handleLogout} className="flex items-center w-full p-3 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                  <LogOut className="mr-3" /> Sair
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm p-4 flex items-center justify-between md:justify-end">
            {/* Botão de Menu Mobile */}
            <button
              className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
              <span>Menu</span>
            </button>
            <NotificationCenter />
          </header>
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Para páginas públicas como Login e LandingPage, renderiza apenas o conteúdo
  return <>{children}</>;
};