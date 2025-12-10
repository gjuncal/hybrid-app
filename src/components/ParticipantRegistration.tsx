import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserPlus, Search, CheckCircle, XCircle } from 'lucide-react';
import { formatCPF, validateCPF } from '../utils/cpfUtils';

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

// Interface para os dados do formulário
interface FormData {
  cpf: string;
  name: string;
  age: string;
  whatsapp: string;
  nucleus: string;
  grupo_id: string;
  subgrupo_id: string;
}

export const ParticipantRegistration: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({ cpf: '', name: '', age: '', whatsapp: '', nucleus: '', grupo_id: '', subgrupo_id: '' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCpfVerified, setIsCpfVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const fetched: Group[] = await api.getGroups();
        setGroups(fetched);
      } catch (error) {
        console.error("Failed to fetch groups", error);
        // Optionally, set an error state to show in the UI
      }
    };

    fetchGroups();
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
    setIsCpfVerified(false);
    setVerificationStatus(null);
    setSubmitStatus(null);
    setFormData(prev => ({ ...prev, name: '', age: '', whatsapp: '', nucleus: '', grupo_id: '', subgrupo_id: '' }));
  };

  const handleVerifyCpf = async () => {
    if (!formData.cpf) {
      setVerificationStatus({ type: 'error', message: 'Por favor, insira um CPF para verificar.' });
      return;
    }
    if (!validateCPF(formData.cpf)) {
      setVerificationStatus({ type: 'error', message: 'CPF inválido. Por favor, verifique o formato.' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Usa o CPF já formatado no input
            const result = await api.verifyCpfProtected(formData.cpf.replace(/[^\d]/g, ''));
      if (result.encontrado) {
        if (result.ja_participante) {
          setVerificationStatus({ type: 'error', message: 'Este CPF já está cadastrado no sistema de presença.' });
          setIsCpfVerified(false);
        } else {
          setVerificationStatus({ type: 'success', message: `CPF encontrado! Nome: ${result.nome}. Por favor, complete o cadastro.` });
          setFormData(prev => ({
            ...prev,
            name: result.nome,
            age: result.idade !== undefined && result.idade !== null ? String(result.idade) : '',
            nucleus: result.nucleo || ''
          }));
          setIsCpfVerified(true);
          // Fallback: obter idade e whatsapp formatado a partir da família (se disponível)
          try {
            const fam = await api.getFamilyByCpf(formData.cpf.replace(/[^\d]/g,''));
            const membros: any[] = Array.isArray(fam.membros) ? fam.membros : [];
            const titular = membros.find(m => (m.posicao || '').toLowerCase().includes('responsavel')) || membros[0];
            const idade = String(titular?.idade ?? '')
            setFormData(prev => ({ ...prev, age: prev.age || idade }));
          } catch {}
        }
      } else {
        setVerificationStatus({ type: 'error', message: 'CPF não encontrado na base de dados socioeconômica. Não é possível cadastrar.' });
        setIsCpfVerified(false);
      }
    } catch (err) {
      setVerificationStatus({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao verificar CPF.' });
      setIsCpfVerified(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'grupo_id') {
      setFormData(prev => ({ ...prev, grupo_id: value, subgrupo_id: '' }));
    } else if (name === 'whatsapp') {
      const digits = value.replace(/\D/g,'').slice(0,11);
      const formatted = digits.length >= 11
        ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
        : digits.length > 6
          ? `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
          : digits.length > 2
            ? `(${digits.slice(0,2)}) ${digits.slice(2)}`
            : digits;
      setFormData(prev => ({ ...prev, whatsapp: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCpfVerified) {
      setSubmitStatus({ type: 'error', message: 'Verifique o CPF antes de registrar.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const payload: any = {
        name: formData.name,
        cpf: formData.cpf.replace(/[^\d]/g, ''),
        age: parseInt(formData.age, 10),
        nucleus: formData.nucleus || undefined,
        whatsapp: formData.whatsapp || undefined,
      };

      if (formData.subgrupo_id) {
        payload.subgrupo_id = Number(formData.subgrupo_id);
        payload.grupo_id = Number(formData.grupo_id);
      } else if (formData.grupo_id) {
        payload.grupo_id = Number(formData.grupo_id);
      }

      const result = await api.addParticipant(payload);
      setSubmitStatus({ type: 'success', message: `Participante ${result.nome} cadastrado com sucesso!` });
      // Limpa o formulário
      setFormData({ cpf: '', name: '', age: '', whatsapp: '', nucleus: '', grupo_id: '', subgrupo_id: '' });
      setIsCpfVerified(false);
      setVerificationStatus(null);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao cadastrar participante.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><UserPlus className="mr-3"/>Cadastro de Novo Participante</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção de Verificação de CPF */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">1. Verifique o CPF</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleCpfChange}
              placeholder="Digite o CPF"
              className="flex-grow p-3 border border-gray-300 rounded-lg"
            />
            <button type="button" onClick={handleVerifyCpf} disabled={isSubmitting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400">
              <Search className="h-5 w-5"/> <span>Verificar</span>
            </button>
          </div>
          {verificationStatus && (
            <div className={`mt-3 p-3 rounded-lg text-sm flex items-center ${verificationStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {verificationStatus.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2"/> : <XCircle className="h-5 w-5 mr-2"/>}
              {verificationStatus.message}
            </div>
          )}
        </div>

        {/* Seção de Detalhes do Cadastro (só aparece após verificação) */}
        {isCpfVerified && (
          <div className="p-4 border rounded-lg bg-blue-50 space-y-4">
             <h3 className="font-semibold text-gray-800">2. Complete os dados do participante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-gray-100" readOnly />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">Idade</label>
                <input type="number" id="age" name="age" value={formData.age} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
              </div>
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input type="text" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
              </div>
              <div>
                <label htmlFor="nucleus" className="block text-sm font-medium text-gray-700">Núcleo</label>
                <input type="text" id="nucleus" name="nucleus" value={formData.nucleus} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
              </div>
              <div>
                <label htmlFor="grupo_id" className="block text-sm font-medium text-gray-700">Grupo</label>
                <select id="grupo_id" name="grupo_id" value={formData.grupo_id} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required>
                  <option value="">Selecione um grupo</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id.toString()}>{group.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subgrupo_id" className="block text-sm font-medium text-gray-700">Subgrupo (opcional)</label>
                <select id="subgrupo_id" name="subgrupo_id" value={formData.subgrupo_id} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" disabled={!formData.grupo_id || ((groups.find(g => g.id === Number(formData.grupo_id))?.subgrupos?.length || 0) === 0)}>
                  <option value="">Selecione um subgrupo (opcional)</option>
                  {groups.find(g => g.id === Number(formData.grupo_id))?.subgrupos?.map(subgroup => (
                    <option key={subgroup.id} value={subgroup.id.toString()}>{subgroup.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de Status do Envio */}
        {submitStatus && (
            <div className={`p-3 rounded-lg text-sm flex items-center ${submitStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {submitStatus.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2"/> : <XCircle className="h-5 w-5 mr-2"/>}
                {submitStatus.message}
            </div>
        )}

        <button type="submit" disabled={!isCpfVerified || isSubmitting} className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-transform transform active:scale-95">
          {isSubmitting ? 'Registrando...' : 'Cadastrar Participante'}
        </button>
      </form>
    </div>
  );
};