import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { FileText, Users, LogOut, Shield } from 'lucide-react';

export const Portal: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const isPresenceAllowed = user?.role === 'administrador' || user?.role === 'coordenador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Portal de Sistemas</h1>
                <p className="text-sm text-gray-600">GTA - Trabalho Técnico Social</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao Portal de Sistemas
          </h2>
          <p className="text-xl text-gray-600">
            Selecione o sistema que deseja acessar
          </p>
        </div>

        {/* System Cards */}
        <div className={isPresenceAllowed ? 'grid md:grid-cols-2 gap-8' : 'grid md:grid-cols-1 gap-8'}>
          {/* Questionário Socioeconômico */}
          <a
            href="/questionario"
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Questionário Socioeconômico
                </h3>
              </div>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              Sistema para preenchimento e gestão dos questionários socioeconômicos. 
              Cadastre e gerencie informações das famílias participantes do projeto.
            </p>
            <div className="mt-6 flex items-center text-green-600 font-medium">
              <span>Acessar Sistema</span>
              <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          {isPresenceAllowed &&
            <>
              {/* Sistema de Presença */}
              <Link
                to="/dashboard"
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
              >
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Controle de Presença
                    </h3>
                  </div>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Registre presença em atividades, gerencie participantes, visualize 
                  classificações e acompanhe o engajamento dos participantes.
                </p>
                <div className="mt-6 flex items-center text-blue-600 font-medium">
                  <span>Acessar Sistema</span>
                  <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </>
          }
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Informações Importantes
            </h4>
            <p className="text-gray-600">
              Ambos os sistemas estão integrados e compartilham informações dos participantes. 
              Use o questionário para cadastros iniciais e o sistema de presença para atividades.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};