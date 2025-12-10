import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// A interface da API não é mais necessária aqui, pois o contexto não fará chamadas diretas.
// import { api } from '../services/api'; 

// Define a estrutura do objeto de usuário
interface User {
  username: string;
  role: 'administrador' | 'coordenador' | 'cadastrador' | null;
}

// Define a estrutura do contexto de autenticação
interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean; // Para saber quando a verificação inicial de auth terminou
}

// Cria o contexto
const AppContext = createContext<AppContextType | undefined>(undefined);

// Cria o Provedor do Contexto
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Começa como true

  // Hook para verificar o estado de autenticação ao carregar a aplicação
  useEffect(() => {
    // Tenta carregar dados do usuário do localStorage ao iniciar
    const storedToken = localStorage.getItem('presenca_token');
    const storedUser = localStorage.getItem('presenca_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Valida expiração do JWT no cliente para evitar 401 desnecessários
        const base64Url = (storedToken.split('.')[1] || '');
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(base64);
        const payload = JSON.parse(payloadJson);
        const expMs = (payload && payload.exp ? payload.exp * 1000 : 0);
        if (expMs && Date.now() < expMs) {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          // Token expirado
          logout();
        }
      } catch (error) {
        console.error("Falha ao processar token/usuário armazenado", error);
        // Se houver erro, limpa os dados inválidos
        logout();
      }
    }
    // Finaliza o carregamento, permitindo que a aplicação renderize
    setIsLoading(false);
  }, []);

  // Função de login: salva o token e os dados do usuário
  const login = (token: string, userData: User) => {
    localStorage.setItem('presenca_token', token);
    localStorage.setItem('presenca_user', JSON.stringify(userData));

    // Sync with legacy app keys
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
  };

  // Função de logout: remove os dados de autenticação
  const logout = () => {
    localStorage.removeItem('presenca_token');
    localStorage.removeItem('presenca_user');

    // Clear legacy app keys
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    setUser(null);
    setIsAuthenticated(false);
    // Force server-side logout to clear cookies
    window.location.href = '/logout';
  };

  // Fornece o estado e as funções para os componentes filhos
  return (
    <AppContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook customizado para consumir o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AppProvider');
  }
  return context;
};
