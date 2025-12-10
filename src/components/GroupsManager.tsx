import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Layers, Plus, Pencil, Save, X, Trash2, Download } from 'lucide-react';

// Interfaces to reflect the new database schema
interface SubGroup {
  id: number;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  grupo_id: number;
}

interface Group {
  id: number;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  subgrupos: SubGroup[];
}

// --- Main Component ---
const GroupsManager: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all groups and their subgroups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar grupos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // --- Render Loading and Error States ---
  if (loading) return <div className="text-center p-10">Carregando grupos...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Erro: {error}</div>;

  // --- Render Main Component ---
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Layers className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Grupos e Subgrupos</h1>
            <p className="text-sm text-gray-600">Organize grupos temáticos e seus subgrupos</p>
          </div>
        </div>
      </div>

      <CreateGroupForm onGroupCreated={fetchGroups} />

      <div className="space-y-4">
        {groups.map(group => (
          <GroupCard key={group.id} group={group} onUpdate={fetchGroups} />
        ))}
      </div>
    </div>
  );
};

// --- Create Group Form ---
const CreateGroupForm: React.FC<{ onGroupCreated: () => void }> = ({ onGroupCreated }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGroup({ nome, descricao });
      setNome('');
      setDescricao('');
      onGroupCreated();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Criar Novo Grupo Temático</h2>
      <input
        type="text"
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome do Grupo"
        className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <textarea
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        placeholder="Descrição"
        className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" className="button btn-secondary inline-flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Criar Grupo
      </button>
    </form>
  );
};

// --- Group Card ---
const GroupCard: React.FC<{ group: Group; onUpdate: () => void }> = ({ group, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGroup, setEditedGroup] = useState({ ...group });

  const handleUpdate = async () => {
    try {
      await api.updateGroup(group.id, { nome: editedGroup.nome, descricao: editedGroup.descricao });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o grupo "${group.nome}"?`)) {
      try {
        await api.deleteGroup(group.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editedGroup.nome}
            onChange={e => setEditedGroup({ ...editedGroup, nome: e.target.value })}
            className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={editedGroup.descricao || ''}
            onChange={e => setEditedGroup({ ...editedGroup, descricao: e.target.value })}
            className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleUpdate} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm">
              <Save className="h-4 w-4" />
              Salvar
            </button>
            <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{group.nome}</h2>
            <p className="text-gray-600 mt-1">{group.descricao}</p>
          </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button onClick={() => api.downloadPresenceExportByGroup(group.id)} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-100">
            <Download className="h-4 w-4" />
            Exportar Presenças do Grupo
          </button>
          <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
        </div>
      )}
      <div className="mt-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Subgrupos</h3>
        <CreateSubGroupForm groupId={group.id} onSubGroupCreated={onUpdate} />
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {group.subgrupos.map(sub => (
            <SubGroupItem key={sub.id} subGroup={sub} onUpdate={onUpdate} />
          ))}
        </ul>
      </div>
    </div>
  );
};

// --- Create SubGroup Form ---
const CreateSubGroupForm: React.FC<{ groupId: number; onSubGroupCreated: () => void }> = ({ groupId, onSubGroupCreated }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSubGroup({ nome, descricao, grupo_id: groupId });
      setNome('');
      setDescricao('');
      onSubGroupCreated();
    } catch (error) {
      console.error('Failed to create subgroup:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 border rounded-lg space-y-3 mt-2">
      <input
        type="text"
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome do Subgrupo"
        className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <textarea
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        placeholder="Descrição"
        className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" className="button btn-secondary inline-flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Criar Subgrupo
      </button>
    </form>
  );
};

// --- SubGroup Item ---
const SubGroupItem: React.FC<{ subGroup: SubGroup; onUpdate: () => void }> = ({ subGroup, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubGroup, setEditedSubGroup] = useState({ ...subGroup });

  const handleUpdate = async () => {
    try {
      await api.updateSubGroup(subGroup.id, { nome: editedSubGroup.nome, descricao: editedSubGroup.descricao });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update subgroup:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o subgrupo "${subGroup.nome}"?`)) {
      try {
        await api.deleteSubGroup(subGroup.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete subgroup:', error);
      }
    }
  };

  return (
    <li className="bg-white p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow flex justify-between items-start">
      {isEditing ? (
        <div className="flex-grow space-y-3">
          <input
            type="text"
            value={editedSubGroup.nome}
            onChange={e => setEditedSubGroup({ ...editedSubGroup, nome: e.target.value })}
            className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={editedSubGroup.descricao || ''}
            onChange={e => setEditedSubGroup({ ...editedSubGroup, descricao: e.target.value })}
            className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleUpdate} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              <Save className="h-4 w-4" />
              Salvar
            </button>
            <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-semibold text-gray-900">{subGroup.nome}</p>
          <p className="text-gray-600">{subGroup.descricao}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => setIsEditing(!isEditing)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">
          <Pencil className="h-4 w-4" />
          Editar
        </button>
        <button onClick={() => api.downloadPresenceExportBySubGroup(subGroup.id)} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-100">
          <Download className="h-4 w-4" />
          Exportar Presenças
        </button>
        <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg">
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      </div>
    </li>
  );
};

export default GroupsManager;