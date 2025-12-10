import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AppContext';
import { api } from '../lib/api';
import { Users, Calendar as CalendarIcon, Activity as ActivityIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Interfaces para os dados da API
interface Activity {
  id: number;
  topico: string;
  grupo?: string | null;
  data: string;
  participantes: { id: number; nome?: string; cpf?: string; timestamp?: string }[];
}

interface DashboardStats {
  totalParticipantes: number;
  totalAtividades: number;
  totalPresencas: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(''); // Limpa erros anteriores
        // Faz as chamadas em paralelo para otimizar o carregamento
        const [participantsData, activitiesData, groupsData] = await Promise.all([
          api.getParticipants({ page: 1, page_size: 1 }),
          api.getActivities(),
          api.getGroups().catch(() => []),
        ]);

        // Calcula o total de presenças a partir das atividades
        const totalPresencas = activitiesData.reduce((acc: number, activity: Activity) => acc + (activity.participantes?.length || 0), 0);

        const totalParticipantes = (participantsData && typeof participantsData === 'object')
          ? (participantsData.total ?? (Array.isArray(participantsData.items) ? participantsData.items.length : 0))
          : (Array.isArray(participantsData) ? participantsData.length : 0);

        setStats({
          totalParticipantes: totalParticipantes,
          totalAtividades: activitiesData.length,
          totalPresencas: totalPresencas,
        });
        setActivities(activitiesData as Activity[]);
        setGroups(Array.isArray(groupsData) ? groupsData : []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do painel.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center p-10">Carregando painel...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Painel de Controle</h1>
        <p className="text-blue-100 mt-1">Bem-vindo de volta, {user?.username || 'usuário'}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Total de Participantes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total de Participantes</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.totalParticipantes ?? 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Card Atividades Realizadas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Atividades Realizadas</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.totalAtividades ?? 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Card Total de Presenças */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total de Presenças</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.totalPresencas ?? 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <ActivityIcon className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {activities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Distribuição de Atividades por Grupo</p>
                <p className="text-xl font-semibold text-gray-800">Grupos com mais atividades</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      const map = new Map<string, number>();
                      activities.forEach(a => {
                        const g = (a.grupo || 'Sem Grupo') as string;
                        map.set(g, (map.get(g) || 0) + 1);
                      });
                      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
                    })()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    padAngle={2}
                  >
                    {(() => {
                      const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#6366F1','#14B8A6','#F472B6','#22C55E','#EAB308'];
                      const map = new Map<string, number>();
                      activities.forEach(a => {
                        const g = (a.grupo || 'Sem Grupo') as string;
                        map.set(g, (map.get(g) || 0) + 1);
                      });
                      const data = Array.from(map.entries());
                      return data.map((_, idx) => <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />);
                    })()}
                  </Pie>
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload || !label) return null;
                    const groupName = String(label);
                    const subs = (() => {
                      const set = new Set<string>();
                      activities.forEach(a => {
                        if ((a.grupo || 'Sem Grupo') === groupName) {
                          const g = a.grupo_id ?? -1;
                          // Buscar nome de subgrupo a partir da atividade, se disponível no conjunto de atividades
                          const sgId = a.subgrupo_id ?? null;
                          if (sgId !== null) set.add(String(sgId));
                        }
                      });
                      return Array.from(set);
                    })();
                    return (
                      <div className="bg-white p-2 border rounded shadow text-sm">
                        <div className="font-semibold">{groupName}</div>
                        <div>{`${payload[0]?.value ?? 0} atividades`}</div>
                        <div className="text-gray-600">Subgrupos distintos: {subs.length || 0}</div>
                      </div>
                    );
                  }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Últimas Atividades</p>
                <p className="text-xl font-semibold text-gray-800">Resumo temporal</p>
              </div>
            </div>
            <div className="space-y-3">
              {(() => {
                const parseDate = (d: string) => (/([Zz]|[+-]\d{2}:\d{2})$/.test(d) ? new Date(d) : new Date(d + 'Z'));
                const sorted = [...activities].sort((a,b) => parseDate(b.data).getTime() - parseDate(a.data).getTime());
                const overall = sorted[0];
                const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
                const groupLast = (() => {
                  const map = new Map<string, Date>();
                  activities.forEach(a => {
                    const g = (a.grupo || 'Sem Grupo') as string;
                    const dt = parseDate(a.data);
                    const cur = map.get(g);
                    if (!cur || dt > cur) map.set(g, dt);
                  });
                  return Array.from(map.entries()).sort((a,b) => b[1].getTime() - a[1].getTime());
                })();
                return (
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-500">Última atividade geral</p>
                      <p className="font-medium text-gray-800">{overall ? `${overall.topico} • ${fmt(parseDate(overall.data))}` : '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupLast.slice(0,6).map(([g, d]) => (
                        <div key={g} className="p-3 border rounded-lg">
                          <p className="text-sm text-gray-500">{g}</p>
                          <p className="font-medium text-gray-800">{fmt(d)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Top Atividades por Presenças</p>
              <p className="text-xl font-semibold text-gray-800">Maior comparecimento</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const arr = [...activities].map(a => ({ name: a.topico || (a.grupo || 'Atividade'), value: (a.participantes?.length || 0), grupo: a.grupo || null, grupo_id: a.grupo_id ?? null, subgrupo_id: a.subgrupo_id ?? null }));
                  arr.sort((a,b) => b.value - a.value);
                  return arr.slice(0, 5);
                })()}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="bg-white p-2 border rounded shadow text-sm">
                      <div className="font-semibold">{p.name}</div>
                      <div>{`${p.value} presenças`}</div>
                      <div className="text-gray-600">Grupo: {p.grupo ?? '-'}</div>
                      <div className="text-gray-600">Subgrupo: {(() => {
                        const g = groups?.find(x => x.id === (p.grupo_id ?? -1));
                        const sub = g?.subgrupos?.find((s: any) => s.id === (p.subgrupo_id ?? -1));
                        return sub?.nome ?? p.subgrupo_id ?? '-';
                      })()}</div>
                    </div>
                  );
                }} />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Exportações Rápidas (Admin) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Exportações</p>
            <p className="text-xl font-semibold text-gray-800">Baixar planilhas (Excel)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(['participantes','atividades','presencas','inscricoes','ranking'] as const).map(key => (
            <button key={key} onClick={() => api.downloadPresenceExport(key)} className="px-4 py-3 border rounded-lg hover:bg-gray-50 text-sm font-medium">
              {(() => {
                const labels: Record<string,string> = {
                  participantes: 'Presença: Participantes',
                  atividades: 'Presença: Atividades',
                  presencas: 'Presença: Registros de Presença',
                  inscricoes: 'Presença: Inscrições em Atividades',
                  ranking: 'Presença: Ranking de Pontos',
                };
                return labels[key] || key;
              })()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};