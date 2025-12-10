import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-gray-200">
                <Bell className="h-6 w-6 text-gray-600" />
            </button>
            {/* A lógica do dropdown de notificações pode ser adicionada aqui */}
        </div>
    );
};