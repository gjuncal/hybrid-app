import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { api } from '../lib/api';

interface RankingItem {
    posicao: number;
    nome: string;
    pontos: number;
}

export const Ranking: React.FC = () => {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        const data = await api.getRanking();
        setRanking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar o ranking.');
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-600">{position}</span>;
  };

  if (loading) return <div>Carregando ranking...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ranking por Pontos</h2>
      <div className="space-y-3">
        {ranking.map((item) => (
          <div key={item.posicao} className="p-4 border rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 text-center mr-4">{getRankIcon(item.posicao)}</div>
              <p className="font-medium">{item.nome}</p>
            </div>
            <p className="font-bold text-blue-600">{item.pontos} pontos</p>
          </div>
        ))}
      </div>
    </div>
  );
};