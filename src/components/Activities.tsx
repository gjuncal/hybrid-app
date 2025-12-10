import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Calendar, Plus, Users, ChevronDown, ChevronUp, Pencil, Save, X, Trash2, Download, LucideIcon } from 'lucide-react';

// Interfaces alinhadas com o backend
interface ParticipantPresence {
  id: number;
  nome: string;
  cpf: string;
  timestamp: string;
}

interface Activity {
  id: number;
  grupo: string;
  grupo_id?: number;
  subgrupo_id?: number;
  data: string;
  topico: string;
  responsavel?: string;
  pontos_por_participante: number;
  participantes: ParticipantPresence[];
}

interface SubGroup {
  id: number;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  grupo_id: number;
}

interface GroupNode {
  id: number;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  subgrupos: SubGroup[];
}

const ICONS: { [key: string]: LucideIcon } = {
  Users,
  Calendar,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Plus,
};

const IconComponent = ({ name }: { name: string }) => {
  const Icon = ICONS[name];
  return Icon ? <Icon className="h-4 w-4 mr-2" /> : null;
};

const formatDatetimeLocalValue = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const ActivityItem: React.FC<{ activity: Activity; onRefresh: () => void; groups: GroupNode[] }> = ({ activity, onRefresh, groups }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editData, setEditData] = useState({
    topico: activity.topico,
    grupo_id: activity.grupo_id ? String(activity.grupo_id) : '',
    subgrupo_id: activity.subgrupo_id ? String(activity.subgrupo_id) : '',
    data: formatDatetimeLocalValue(activity.data),
    responsavel: activity.responsavel || '',
    pontos_por_participante: activity.pontos_por_participante || 0,
  });

  const currentGroup = groups.find(g => g.id === activity.grupo_id) || groups.find(g => g.nome === activity.grupo);
  const currentSubGroup = currentGroup?.subgrupos?.find(s => s.id === activity.subgrupo_id);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'grupo_id') {
      setEditData(prev => ({ ...prev, grupo_id: value, subgrupo_id: '' }));
      return;
    }
    setEditData((prev) => ({
      ...prev,
      [name]: name === 'pontos_por_participante' ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        topico: editData.topico,
        grupo_id: editData.grupo_id ? Number(editData.grupo_id) : undefined,
        subgrupo_id: editData.subgrupo_id ? Number(editData.subgrupo_id) : undefined,
        responsavel: editData.responsavel || undefined,
        pontos_por_participante: editData.pontos_por_participante,
        data: editData.data ? new Date(editData.data).toISOString() : undefined,
      };
      await api.updateActivity(activity.id, payload);
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    const confirm = window.confirm('Remover este participante da atividade?');
    if (!confirm) return;
    setRemovingId(participantId);
    setError(null);
    try {
      await api.removeParticipantFromActivity(activity.id, participantId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover participante.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteActivity = async () => {
    const confirmed = window.confirm('Excluir esta atividade? Esta ação ajustará os pontos dos participantes e removerá presenças/inscrições associadas.');
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteActivity(activity.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir atividade.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center">
        <div className="flex-1 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          {!isEditing ? (
            <div>
              <p className="font-bold text-gray-800">{activity.topico}</p>
              <p className="text-sm text-gray-600 flex items-center">
                Grupo: {(currentGroup?.nome ?? activity.grupo)}{currentSubGroup ? ` | Subgrupo: ${currentSubGroup.nome}` : ''} | Data: {(/[Zz]|[+-]\d{2}:\d{2}$/.test(activity.data) ? new Date(activity.data) : new Date(activity.data + 'Z')).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                name="topico"
                value={editData.topico}
                onChange={handleChange}
                placeholder="Tópico da Atividade"
                className="p-2 border rounded"
              />
              <select name="grupo_id" value={editData.grupo_id} onChange={handleChange} className="p-2 border rounded">
                <option value="">Selecione o grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id.toString()}>{g.nome}</option>
                ))}
              </select>
              <select
                name="subgrupo_id"
                value={editData.subgrupo_id}
                onChange={handleChange}
                className="p-2 border rounded"
                disabled={!editData.grupo_id || ((groups.find(g => g.id === Number(editData.grupo_id))?.subgrupos?.length || 0) === 0)}
              >
                <option value="">Selecione o subgrupo (opcional)</option>
                {groups.find(g => g.id === Number(editData.grupo_id))?.subgrupos?.map(sub => (
                  <option key={sub.id} value={sub.id.toString()}>{sub.nome}</option>
                ))}
              </select>
              <input
                name="data"
                type="datetime-local"
                value={editData.data}
                onChange={handleChange}
                className="p-2 border rounded"
              />
              <input
                name="responsavel"
                value={editData.responsavel}
                onChange={handleChange}
                placeholder="Responsável (opcional)"
                className="p-2 border rounded"
              />
              <input
                name="pontos_por_participante"
                type="number"
                min={0}
                value={editData.pontos_por_participante}
                onChange={handleChange}
                placeholder="Pontos por participante"
                className="p-2 border rounded"
              />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-700">
            <Users className="h-4 w-4 mr-1" />
            <span>{activity.participantes.length}</span>
          </div>
          {!isEditing ? (
            <>
              <button
                className="p-2 rounded-md border hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsOpen(true); }}
                title="Editar atividade"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="p-2 rounded-md border hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); api.downloadPresenceExportByActivity(activity.id); }}
                title="Exportar presenças da atividade"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                className="p-2 rounded-md border hover:bg-red-50 text-red-600 disabled:opacity-50"
                onClick={(e) => { e.stopPropagation(); handleDeleteActivity(); }}
                disabled={deleting}
                title={deleting ? 'Excluindo...' : 'Excluir atividade'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving}
                title="Salvar alterações"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                className="p-2 rounded-md border hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setError(null); setEditData({
                  topico: activity.topico,
                  grupo_id: activity.grupo_id ? String(activity.grupo_id) : '',
                  subgrupo_id: activity.subgrupo_id ? String(activity.subgrupo_id) : '',
                  data: formatDatetimeLocalValue(activity.data),
                  responsavel: activity.responsavel || '',
                  pontos_por_participante: activity.pontos_por_participante || 0,
                }); }}
                title="Cancelar edição"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {isOpen ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      {isOpen && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold mb-2">Participantes Presentes:</h4>
          {activity.participantes.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {activity.participantes.map(p => (
                <li key={p.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{p.nome}</span>
                    <span className="ml-2 text-gray-500">{(/[Zz]|[+-]\d{2}:\d{2}$/.test(p.timestamp) ? new Date(p.timestamp) : new Date(p.timestamp + 'Z')).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                  </div>
                  <button
                    className="p-1.5 rounded-md border hover:bg-red-50 text-red-600"
                    onClick={() => handleRemoveParticipant(p.id)}
                    disabled={removingId === p.id}
                    title="Remover participante da atividade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhum participante registrou presença nesta atividade ainda.</p>
          )}
        </div>
      )}
    </li>
  );
};

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [groups, setGroups] = useState<GroupNode[]>([]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await api.getActivities();
      setActivities(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atividades.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.getGroups();
      setGroups(response || []);
    } catch (err) {
      console.error("Erro ao carregar grupos", err);
    }
  };


  useEffect(() => {
    fetchActivities();
    fetchGroups();
  }, []);

  const handleRefresh = () => {
    fetchActivities();
    fetchGroups();
  };

  if (isLoading) return <div className="text-center p-4">Carregando...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Erro: {error}</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Atividades</h1>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center shadow-md hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Atividade
        </button>
      </div>

      <ul className="space-y-4">
        {activities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} onRefresh={handleRefresh} groups={groups} />
        ))}
      </ul>

      {isCreateModalOpen && (
        <CreateActivityModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onActivityCreated={handleRefresh}
          groups={groups}
        />
      )}
    </div>
  );
};

export default Activities;

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: () => void;
  groups: GroupNode[];
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({ isOpen, onClose, onActivityCreated, groups }) => {
  const [newActivity, setNewActivity] = useState({
    topico: '',
    grupo_id: '',
    subgrupo_id: '',
    data: '',
    responsavel: '',
    pontos_por_participante: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'grupo_id') {
      setNewActivity(prev => ({ ...prev, grupo_id: value, subgrupo_id: '' }));
    } else {
      setNewActivity(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.topico || !newActivity.grupo_id || !newActivity.data) {
      setError('Preencha todos os campos obrigatórios: Tópico, Grupo e Data.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        topico: newActivity.topico,
        grupo_id: Number(newActivity.grupo_id),
        subgrupo_id: newActivity.subgrupo_id ? Number(newActivity.subgrupo_id) : undefined,
        pontos_por_participante: Number(newActivity.pontos_por_participante),
        data: new Date(newActivity.data).toISOString(),
        responsavel: newActivity.responsavel || undefined,
      };
      await api.createActivity(payload);
      onActivityCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar atividade.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Nova Atividade</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="topico"
            value={newActivity.topico}
            onChange={handleChange}
            placeholder="Tópico da Atividade"
            className="w-full p-2 border rounded"
            required
          />
          <select
            name="grupo_id"
            value={newActivity.grupo_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="" disabled>Selecione um grupo</option>
            {groups.map(g => (
              <option key={g.id} value={g.id.toString()}>{g.nome}</option>
            ))}
          </select>
          <select
            name="subgrupo_id"
            value={newActivity.subgrupo_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            disabled={!newActivity.grupo_id || ((groups.find(g => g.id === Number(newActivity.grupo_id))?.subgrupos?.length || 0) === 0)}
          >
            <option value="">Selecione o subgrupo (opcional)</option>
            {groups.find(g => g.id === Number(newActivity.grupo_id))?.subgrupos?.map(sub => (
              <option key={sub.id} value={sub.id.toString()}>{sub.nome}</option>
            ))}
          </select>
          <input
            name="data"
            type="datetime-local"
            value={newActivity.data}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
          <input
            name="responsavel"
            value={newActivity.responsavel}
            onChange={handleChange}
            placeholder="Responsável (opcional)"
            className="w-full p-2 border rounded"
          />
          <input
            name="pontos_por_participante"
            type="number"
            min={0}
            value={newActivity.pontos_por_participante}
            onChange={handleChange}
            placeholder="Pontos por participante"
            className="w-full p-2 border rounded"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-100">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};