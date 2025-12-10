import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { QrCode, CheckCircle, XCircle, AlertTriangle, CalendarPlus, RefreshCcw } from 'lucide-react';
import { formatCPF } from '../utils/cpfUtils';

// Interfaces para os tipos de dados
interface Activity {
  id: number;
  topico: string;
  data: string;
  grupo: string;
  grupo_id?: number;
  subgrupo_id?: number | null;
}

interface SubGroup { id: number; nome: string; grupo_id: number; }
interface Group { id: number; nome: string; subgrupos: SubGroup[]; }

interface VerifiedParticipant {
  nome: string;
  ja_participante: boolean;
}

interface FamilyMember {
  id: number;
  nome: string;
  posicao?: string;
  idade?: number;
}

export const AttendanceManager: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [cpf, setCpf] = useState('');
  const [verifiedParticipant, setVerifiedParticipant] = useState<VerifiedParticipant | null>(null);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [executorId, setExecutorId] = useState<number | null>(null);

  // QR Code state
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLargeOpen, setQrLargeOpen] = useState<boolean>(false);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  // Busca as atividades ao carregar o componente
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const data = await api.getActivities();
        setActivities(data || []);
        try {
          const grp = await api.getGroups();
          setGroups(Array.isArray(grp) ? grp : []);
        } catch {}
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar atividades.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, []);

  // Limpa o estado quando o CPF ou a atividade mudam
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setVerifiedParticipant(null);
  }, [cpf, selectedActivity]);

  // Clear QR timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  const scheduleRefresh = (expiresISO?: string) => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    // compute ms until 40s or slightly before expiration
    let delay = 40000; // 40s
    if (expiresISO) {
      const exp = /[Zz]|[+-]\d{2}:\d{2}$/.test(expiresISO) ? new Date(expiresISO) : new Date(expiresISO + 'Z');
      const msLeft = exp.getTime() - Date.now();
      delay = Math.max(2000, Math.min(40000, msLeft - 1000)); // refresh 1s before expiry
    }
    refreshTimer.current = window.setTimeout(() => {
      handleGenerateQR();
    }, delay);
  };

  const handleGenerateQR = async () => {
    if (!selectedActivity) {
      setError('Selecione uma atividade para gerar o QR Code.');
      return;
    }
    try {
      const res = await api.generateQRCode(parseInt(selectedActivity, 10));
      setQrImage(res.qr_code);
      setQrToken(res.token);
      setQrExpiresAt(res.expires_at);
      scheduleRefresh(res.expires_at);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar QR Code.');
    }
  };

  const handleVerifyCpf = async () => {
    const clean = cpf.replace(/\D/g, '');
    if (!clean) {
      setError('Por favor, insira um CPF.');
      return;
    }
    if (clean.length !== 11) {
      setError('CPF inválido.');
      return;
    }
    setIsVerifying(true);
    setError(null);
    setSuccess(null);
    
    // Debug: Verificar se o usuário está logado
    const token = localStorage.getItem('presenca_token');
    const user = localStorage.getItem('presenca_user');
    
    try {
      const result = await api.verifyCpfProtected(clean);
      if (result.encontrado) {
        setVerifiedParticipant({ nome: result.nome, ja_participante: result.ja_participante });
        setSuccess(result.message);
        try {
          const fam = await api.getFamilyByCpf(clean);
          const membros: FamilyMember[] = Array.isArray(fam.membros) ? fam.membros : [];
          setFamilyMembers(membros);
          setExecutorId(null); // default titular
        } catch {}
      } else {
        setError(result.message || 'CPF não encontrado.');
        setVerifiedParticipant(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar CPF.');
      setVerifiedParticipant(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedActivity || !verifiedParticipant) {
      setError('Selecione uma atividade e verifique um CPF primeiro.');
      return;
    }
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) {
      setError('CPF inválido.');
      return;
    }
    setIsRegistering(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.registerAttendanceWithExecutor(clean, parseInt(selectedActivity, 10), executorId === null ? undefined : executorId);
      setSuccess(result.message || 'Presença registrada com sucesso!');
      // Limpa os campos após o sucesso
      setCpf('');
      setVerifiedParticipant(null);
      setFamilyMembers([]);
      setExecutorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar presença.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Registrar Presença</h2>

      {/* Seletor de Atividade */}
      <div className="mb-6">
        <label htmlFor="activity-select" className="block text-sm font-medium text-gray-700 mb-2">1. Selecione a Atividade</label>
        <select
          id="activity-select"
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
          disabled={isLoading || activities.length === 0}
        >
          <option value="">{isLoading ? 'Carregando atividades...' : 'Selecione uma atividade'}</option>
          {activities.map((act) => {
            const g = groups.find(g => g.id === (act.grupo_id as any))?.nome || act.grupo;
            const sg = (() => {
              const grp = groups.find(g => g.id === (act.grupo_id as any));
              const sub = grp?.subgrupos?.find(s => s.id === (act.subgrupo_id as any));
              return sub?.nome ?? null;
            })();
            const when = (/[Zz]|[+-]\d{2}:\d{2}$/.test(act.data) ? new Date(act.data) : new Date(act.data + 'Z')).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            return (
              <option key={act.id} value={act.id}>
                {`${when} - ${act.topico} (${g}${sg ? ` • ${sg}` : ''})`}
              </option>
            );
          })}
        </select>
      </div>

      {/* QR Code Generator */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">2. Mostrar QR Code para os participantes</label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <button
            onClick={handleGenerateQR}
            disabled={!selectedActivity}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            <QrCode className="h-5 w-5" />
            Gerar/Atualizar QR Code
          </button>
          {qrExpiresAt && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Expira em: {(/[Zz]|[+-]\d{2}:\d{2}$/.test(qrExpiresAt!) ? new Date(qrExpiresAt!) : new Date(qrExpiresAt! + 'Z')).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </div>
          )}
        </div>
        {qrImage && (
          <div className="mt-4 flex flex-col items-center">
            <button className="border rounded-lg overflow-hidden" onClick={() => setQrLargeOpen(true)}>
              <img src={qrImage} alt="QR Code" className="w-60 h-60" />
            </button>
            <p className="text-xs text-gray-500 mt-2">Clique para ampliar. Atualiza ~40s.</p>
          </div>
        )}

        {qrLargeOpen && qrImage && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={() => setQrLargeOpen(false)}>
            <img src={qrImage} alt="QR Code" className="w-[28rem] h-[28rem] bg-white p-2 rounded" />
          </div>
        )}
      </div>

      {/* Verificação de CPF */}
      <div className="mb-6">
        <label htmlFor="cpf-input" className="block text-sm font-medium text-gray-700 mb-2">3. Verifique o CPF do Participante</label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            id="cpf-input"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            disabled={!selectedActivity}
            maxLength={14}
          />
          <button
            onClick={handleVerifyCpf}
            disabled={isVerifying || !selectedActivity}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition"
          >
            {isVerifying ? (
              'Verificando...'
            ) : (
              <>
                <QrCode className="h-5 w-5" />
                <span>Verificar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exibição de Status */}
      <div className="mb-6 min-h-[60px]">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg flex items-center"><XCircle className="h-5 w-5 mr-2" />{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-100 text-green-700 rounded-lg flex items-center"><CheckCircle className="h-5 w-5 mr-2" />{success}</div>
        )}
        {verifiedParticipant && !verifiedParticipant.ja_participante && (
          <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg flex items-center">Este participante ainda não está no sistema de presença. Cadastre-o primeiro.</div>
        )}
      </div>

      {/* Botão de Registro */}
      {/* Seleção de executor da presença */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quem está registrando?</label>
        <select
          value={executorId ?? ''}
          onChange={(e) => setExecutorId(e.target.value ? Number(e.target.value) : null)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={!verifiedParticipant}
        >
          <option value="">Titular{verifiedParticipant ? `: ${verifiedParticipant.nome}` : ''}</option>
          {familyMembers.map(m => (
            <option key={m.id} value={m.id}>{m.posicao ? `${m.posicao}: ` : ''}{m.nome}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleRegister}
        disabled={!verifiedParticipant || !verifiedParticipant.ja_participante || isRegistering}
        className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-transform transform active:scale-95 flex items-center justify-center gap-2"
      >
        {isRegistering ? (
          'Registrando...'
        ) : (
          <>
            <CalendarPlus className="h-5 w-5" />
            <span>Registrar Presença (Manual)</span>
          </>
        )}
      </button>
    </div>
  );
};