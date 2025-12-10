import React from 'react';
import { useAuth } from '../contexts/AppContext';

export const ParticipantSearch: React.FC = () => {
  const { user } = useAuth();
  return (
    <div>
        <h2>Busca de Participantes</h2>
        <p>Acesso por: {user?.username}.</p>
        <p>(Implementação pendente para conectar com a API)</p>
    </div>
  );
};