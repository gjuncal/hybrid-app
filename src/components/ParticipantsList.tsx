import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { api } from '../lib/api';

interface Participant {
  id: number;
  cpf: string;
  nome: string;
}

const ParticipantsList: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveTerm, setEffectiveTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const data = await api.getParticipants({ page, page_size: pageSize, q: effectiveTerm.trim() || undefined });
        const items: Participant[] = Array.isArray(data) ? data : (data.items || []);
        setParticipants(items);
        setFilteredParticipants(items);
        setHasMore(!Array.isArray(data) ? !!data.has_more : items.length >= pageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar participantes.');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [page, pageSize, effectiveTerm]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEffectiveTerm(searchTerm);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Lista de Participantes</h2>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border rounded-lg mb-4"
        />

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando lista de participantes...</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                className="button btn-secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >Anterior</button>
              <span>Página {page}</span>
              <button
                className="button btn-secondary"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || loading}
              >Próxima</button>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ml-4 border rounded px-2 py-1"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={80}>80</option>
              </select>
            </div>
            <div className="space-y-3">
              {filteredParticipants.map(participant => (
                <Link key={participant.id} to={`/participants/${participant.id}`} className="block">
                  <div className="p-3 sm:p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{participant.nome}</p>
                      <p className="text-sm text-gray-500 break-words">CPF: {participant.cpf}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default ParticipantsList;
