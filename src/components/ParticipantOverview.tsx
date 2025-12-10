import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

type Participant = {
  id: number;
  nome: string;
  cpf: string;
  idade?: number;
  nucleo?: string;
  whatsapp?: string;
  grupo?: string;
  grupo_id?: number | null;
  subgrupo_id?: number | null;
  pontos?: number;
  registered_at?: string | null;
};

type Resumo = {
  total_atividades: number;
  pontos_totais: number;
  ultimo_comparecimento: string | null;
  grupos_distintos: number;
};

type GrupoResumo = {
  grupo: string | null;
  subgrupo_id: number | null;
  subgrupo?: string | null;
  atividades: number;
};

// Update AtividadeItem type
type AtividadeItem = {
  id: number | null;
  data: string | null;
  topico: string | null;
  grupo: string | null;
  grupo_id: number | null;
  subgrupo_id: number | null;
  pontos_ganhos: number;
  timestamp: string | null;
  executado_por?: {
    tipo: 'titular' | 'familiar';
    nome?: string;
    posicao?: number;
  };
};



type SubGroup = { id: number; nome: string; descricao?: string; imagem_url?: string; grupo_id: number };
type Group = { id: number; nome: string; descricao?: string; imagem_url?: string; subgrupos: SubGroup[] };

const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
};

const ParticipantOverview: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<{ participant: Participant; resumo: Resumo; grupos_participados: GrupoResumo[]; atividades: AtividadeItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState<number | ''>('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState<Partial<Participant & { grupo_id?: number | null; subgrupo_id?: number | null }>>({});
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const opts: { from_date?: string; to_date?: string; limit?: number } = {};
        if (fromDate) opts.from_date = fromDate;
        if (toDate) opts.to_date = toDate;
        if (typeof limit === 'number') opts.limit = limit;
        const payload = await api.getParticipantDetails(Number(id), opts);
        setData(payload);
        try {
          const gs = await api.getGroups();
          setGroups(Array.isArray(gs) ? gs : []);
        } catch { }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do participante.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, fromDate, toDate, limit]);

  const participant = data?.participant;
  const resumo = data?.resumo;
  const grupos = data?.grupos_participados || [];
  const atividades = data?.atividades || [];

  const canFilter = useMemo(() => !!data, [data]);

  useEffect(() => {
    if (participant) {
      setForm({
        nome: participant.nome,
        cpf: participant.cpf,
        idade: participant.idade ?? undefined,
        nucleo: participant.nucleo ?? undefined,
        whatsapp: participant.whatsapp ?? undefined,
        grupo: participant.grupo ?? undefined,
        grupo_id: participant.grupo_id ?? undefined,
        subgrupo_id: participant.subgrupo_id ?? undefined,
      });
    }
  }, [participant]);

  if (loading) return <div>Carregando dados do participante...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!participant || !resumo) return <div>Participante não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Overview do Participante</h2>
        <Link to="/participants" className="text-blue-600">Voltar</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Dados Cadastrais</h3>
            <div className="flex gap-2">
              {!editMode && (
                <button onClick={() => { setEditMode(true); setSuccessMsg(''); }} className="px-3 py-1.5 border rounded-lg text-sm">Editar</button>
              )}
              {editMode && (
                <>
                  <button disabled={saving} onClick={async () => {
                    try {
                      setSaving(true);
                      setSuccessMsg('');
                      const updates: any = {};
                      if (form.nome !== undefined) updates.nome = form.nome;
                      if (form.cpf !== undefined) updates.cpf = form.cpf;
                      if (form.idade !== undefined) updates.idade = form.idade;
                      if (form.nucleo !== undefined) updates.nucleo = form.nucleo;
                      if (form.whatsapp !== undefined) updates.whatsapp = form.whatsapp;
                      if (form.grupo !== undefined) updates.grupo = form.grupo;
                      if (form.grupo_id !== undefined) updates.grupo_id = form.grupo_id;
                      if (form.subgrupo_id !== undefined) updates.subgrupo_id = form.subgrupo_id;
                      await api.updateParticipant(Number(id), updates);
                      const refreshed = await api.getParticipantDetails(Number(id));
                      setData(refreshed);
                      setEditMode(false);
                      setSuccessMsg('Dados atualizados com sucesso.');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
                    } finally {
                      setSaving(false);
                    }
                  }} className="px-3 py-1.5 border rounded-lg text-sm bg-blue-600 text-white">Salvar</button>
                  <button disabled={saving} onClick={() => {
                    setEditMode(false); setForm({
                      nome: participant.nome,
                      cpf: participant.cpf,
                      idade: participant.idade ?? undefined,
                      nucleo: participant.nucleo ?? undefined,
                      whatsapp: participant.whatsapp ?? undefined,
                      grupo: participant.grupo ?? undefined,
                      grupo_id: participant.grupo_id ?? undefined,
                      subgrupo_id: participant.subgrupo_id ?? undefined,
                    });
                  }} className="px-3 py-1.5 border rounded-lg text-sm">Cancelar</button>
                </>
              )}
            </div>
          </div>
          {successMsg && <div className="mb-3 text-green-600 text-sm">{successMsg}</div>}
          {!editMode ? (
            <div className="space-y-2 text-gray-700">
              <div><span className="font-medium">Nome:</span> {participant.nome}</div>
              <div><span className="font-medium">CPF:</span> {participant.cpf}</div>
              <div><span className="font-medium">Núcleo:</span> {participant.nucleo || '-'}</div>
              <div><span className="font-medium">WhatsApp:</span> {participant.whatsapp || '-'}</div>
              <div><span className="font-medium">Grupo original:</span> {participant.grupo || '-'}</div>
              <div><span className="font-medium">Subgrupo original:</span> {(() => {
                const g = groups.find(x => x.id === (participant.grupo_id ?? -1));
                const sub = g?.subgrupos?.find(s => s.id === (participant.subgrupo_id ?? -1));
                return sub?.nome ?? participant.subgrupo_id ?? '-';
              })()}</div>
              <div><span className="font-medium">Registrado em:</span> {formatDate(participant.registered_at)}</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Nome</label>
                  <input className="w-full border rounded px-2 py-1.5" value={form.nome ?? ''} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">CPF</label>
                  <input className="w-full border rounded px-2 py-1.5" value={form.cpf ?? ''} onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const f = v.replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setForm({ ...form, cpf: f });
                  }} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Núcleo</label>
                  <input className="w-full border rounded px-2 py-1.5" value={form.nucleo ?? ''} onChange={e => setForm({ ...form, nucleo: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">WhatsApp</label>
                  <input className="w-full border rounded px-2 py-1.5" value={form.whatsapp ?? ''} onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const f = v.length <= 10
                      ? v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1)$2-$3')
                      : v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1)$2-$3');
                    setForm({ ...form, whatsapp: f });
                  }} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Idade</label>
                  <input type="number" className="w-full border rounded px-2 py-1.5" value={form.idade ?? ''} onChange={e => setForm({ ...form, idade: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Grupo</label>
                  <select className="w-full border rounded px-2 py-1.5" value={form.grupo_id ?? ''}
                    onChange={e => {
                      const gid = e.target.value ? Number(e.target.value) : undefined;
                      const g = groups.find(x => x.id === gid);
                      setForm({ ...form, grupo_id: gid, grupo: g?.nome, subgrupo_id: undefined });
                    }}>
                    <option value="">Selecione...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const g = groups.find(x => x.id === (form.grupo_id ?? -1));
                  const subs = g?.subgrupos || [];
                  if (!g || subs.length === 0) return null;
                  return (
                    <div>
                      <label className="text-sm text-gray-600">Subgrupo</label>
                      <select className="w-full border rounded px-2 py-1.5" value={form.subgrupo_id ?? ''}
                        onChange={e => setForm({ ...form, subgrupo_id: e.target.value ? Number(e.target.value) : undefined })}>
                        <option value="">Selecione...</option>
                        {subs.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
              <div className="text-sm text-gray-500">Registrado em: {formatDate(participant.registered_at)} (não editável)</div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Atividades</div>
              <div className="text-2xl font-bold">{resumo.total_atividades}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Pontos</div>
              <div className="text-2xl font-bold">{resumo.pontos_totais}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Último comparecimento</div>
              <div className="text-sm">{formatDate(resumo.ultimo_comparecimento)}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Grupos distintos</div>
              <div className="text-2xl font-bold">{resumo.grupos_distintos}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Atividades</h3>
          {canFilter && (
            <div className="flex flex-wrap gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded px-2 py-1" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded px-2 py-1" />
              <input type="number" placeholder="Limite" value={limit} onChange={e => setLimit(e.target.value ? Number(e.target.value) : '')} className="border rounded px-2 py-1 w-24" />
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-2">Data</th>
                <th className="p-2">Tópico</th>
                <th className="p-2">Grupo</th>
                <th className="p-2">Subgrupo</th>
                <th className="p-2">Registrado por</th>
                <th className="p-2">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map((a, i) => (
                <tr key={`${a.id}-${i}`} className="border-t">
                  <td className="p-2">{formatDate(a.data || a.timestamp)}</td>
                  <td className="p-2">{a.topico || '-'}</td>
                  <td className="p-2">{a.grupo || '-'}</td>
                  <td className="p-2">{(() => {
                    const g = groups.find(x => x.id === (a.grupo_id ?? -1));
                    const sub = g?.subgrupos?.find(s => s.id === (a.subgrupo_id ?? -1));
                    return sub?.nome ?? a.subgrupo_id ?? '-';
                  })()}</td>
                  <td className="p-2">
                    {a.executado_por?.tipo === 'familiar'
                      ? (a.executado_por.nome || 'Membro da Família')
                      : 'Titular'}
                  </td>
                  <td className="p-2">{a.pontos_ganhos}</td>
                </tr>
              ))}
              {atividades.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={6}>Nenhuma atividade no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Participação por Grupo/Subgrupo</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-2">Grupo</th>
                <th className="p-2">Subgrupo</th>
                <th className="p-2">Atividades</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => (
                <tr key={`${g.grupo}-${g.subgrupo_id}-${i}`} className="border-t">
                  <td className="p-2">{g.grupo || '-'}</td>
                  <td className="p-2">{g.subgrupo ?? g.subgrupo_id ?? '-'}</td>
                  <td className="p-2">{g.atividades}</td>
                </tr>
              ))}
              {grupos.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={3}>Nenhuma participação registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParticipantOverview;