import React from 'react';
import { useAuth } from '../contexts/AppContext';

export const ParticipantEdit: React.FC = () => {
    const { user } = useAuth();
    return (
        <div>
            <h2>Editar Participante</h2>
            <p>Componente de edição. Acesso por: {user?.username}.</p>
            <p>(Implementação pendente para conectar com a API)</p>
        </div>
    );
};