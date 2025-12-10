import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, CheckCircle, AlertCircle, X, MessageCircle, PiggyBank, Leaf, Briefcase, HardHat } from 'lucide-react';
import { validateCPF, formatCPF } from '../utils/cpfUtils';
import { api } from '../lib/api';

interface LandingActivity {
  id: number;
  nome: string;
  data: string;
}

export const LandingPage: React.FC = () => {
  const [activities, setActivities] = useState<LandingActivity[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    cpf: '',
    activityId: ''
  });
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'verifying'>('idle');
  const [message, setMessage] = useState('');
  const [verifiedParticipant, setVerifiedParticipant] = useState<{ cadastro_id: number; nome: string; } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activitiesData, groupsData] = await Promise.all([
          api.getPublicActivities(),
          api.getGroups(), // Assuming this method exists
        ]);
        setActivities(activitiesData);
        setGroups(groupsData);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setMessage("Não foi possível carregar as atividades e grupos.");
        setStatus('error');
      }
    };
    fetchData();
  }, []);

  const handleVerifyCpf = async () => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (!cleanCpf) {
      setMessage('Por favor, digite um CPF.');
      setStatus('error');
      return;
    }
    if (!validateCPF(cleanCpf)) {
      setMessage('CPF inválido.');
      setStatus('error');
      return;
    }
    setStatus('verifying');
    setMessage('Verificando CPF...');
    try {
      // Usa o CPF já formatado no input
      const response = await api.verifyParticipant(cleanCpf);
      if (response.found) {
        setVerifiedParticipant(response.participant);
        setStatus('idle');
        setMessage(`Olá, ${response.participant.nome}! CPF verificado.`);
      } else {
        setStatus('error');
        setMessage(response.message);
        setVerifiedParticipant(null);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro ao verificar CPF.');
      setVerifiedParticipant(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedParticipant || !formData.activityId) {
      setStatus('error');
      setMessage('Por favor, verifique seu CPF e selecione uma atividade.');
      return;
    }

    setStatus('verifying');
    setMessage('Registrando presença...');
    try {
      await api.registerPresence(verifiedParticipant.cadastro_id, parseInt(formData.activityId));
      setStatus('success');
      setMessage('Presença registrada com sucesso!');
      
      setTimeout(() => {
        setShowModal(false);
        setStatus('idle');
        setMessage('');
        setFormData({ cpf: '', activityId: '' });
        setVerifiedParticipant(null);
      }, 3000);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro ao registrar presença.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const maskedValue = name === 'cpf' ? formatCPF(value) : value;
    setFormData(prev => ({ ...prev, [name]: maskedValue }));
    if (status !== 'idle' && status !== 'verifying') {
      setStatus('idle');
      setMessage('');
    }
    if (name === 'cpf') {
        setVerifiedParticipant(null);
    }
  };

  // Mapeamento de ícones do grupo
  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageCircle': return <MessageCircle className="h-8 w-8" />;
      case 'PiggyBank': return <PiggyBank className="h-8 w-8" />;
      case 'Leaf': return <Leaf className="h-8 w-8" />;
      case 'Briefcase': return <Briefcase className="h-8 w-8" />;
      case 'HardHat': return <HardHat className="h-8 w-8" />;
      default: return <CheckCircle className="h-8 w-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">GTA Presença</h1>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Área Administrativa
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Registro de Presença
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Marque sua presença nas atividades da Copa do Povo.
          </p>
          <div className="mt-8">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CheckCircle className="h-6 w-6 mr-3" />
              Registrar Minha Presença
            </button>
          </div>
        </div>
        
        {/* Grupos disponíveis */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Nossos Grupos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map(group => (
              <div key={group.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" 
                    style={{ backgroundColor: group.color }}
                  >
                    <div className="text-white">
                      {getGroupIcon(group.icon)}
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">{group.name}</h4>
                  <p className="text-gray-600">{group.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Registrar Presença</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-gray-200">
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                status === 'success' ? 'bg-green-100 text-green-800' : 
                status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="flex-1 block w-full rounded-none rounded-l-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="000.000.000-00"
                    disabled={!!verifiedParticipant}
                    maxLength={14}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCpf}
                    disabled={!!verifiedParticipant || status === 'verifying'}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-r-md disabled:opacity-50"
                  >
                    Verificar
                  </button>
                </div>
              </div>
              
              {verifiedParticipant && (
                 <div>
                    <label htmlFor="activityId" className="block text-sm font-medium text-gray-700">Atividade</label>
                    <select
                      id="activityId"
                      name="activityId"
                      value={formData.activityId}
                      onChange={handleInputChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Selecione a atividade</option>
                      {activities.map(activity => (
                        <option key={activity.id} value={activity.id}>{activity.nome}</option>
                      ))}
                    </select>
                </div>
              )}

              <button
                type="submit"
                disabled={!verifiedParticipant || !formData.activityId || status === 'verifying'}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Confirmar Presença
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};