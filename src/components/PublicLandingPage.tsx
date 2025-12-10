import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CheckCircle, AlertCircle, X, Calendar, Users, ArrowRight, Shield, MessageCircle, PiggyBank, Leaf, Briefcase, HardHat, QrCode } from 'lucide-react';
import { validateCPF } from '../utils/cpfUtils';
import { api } from '../lib/api';

interface PublicActivity {
  id: number;
  nome: string;
  data: string;
  grupo: string;
  grupo_id?: number | null;
  subgrupo_id?: number | null;
  responsavel?: string;
}

interface RegistrationData {
  cpf: string;
  nome: string;
  whatsapp: string;
  grupo_interesse: string;
  atividade_id: number;
}

export const PublicLandingPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'activity' | 'cpf' | 'whatsapp' | 'success'>('activity');
  const [formData, setFormData] = useState<RegistrationData>({
    cpf: '',
    nome: '',
    whatsapp: '',
    grupo_interesse: '',
    atividade_id: 0
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<PublicActivity | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicActivities();
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await api.getPublicGroups();
      setGroups(data);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  const fetchPublicActivities = async () => {
    try {
      const data = await api.getPublicActivities();
      setActivities(data);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    }
  };

  const handleActivitySelect = (activity: PublicActivity) => {
    setSelectedActivity(activity);
    setFormData(prev => ({ ...prev, atividade_id: activity.id }));
    setShowModal(true);
    setStep('cpf');
  };

  const handleCPFSubmit = async () => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    
    if (!validateCPF(cleanCpf)) {
      setMessage('CPF inválido. Por favor, verifique o número digitado.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Verificando CPF...');

    try {
      // Consulta pública (não exige token)
      const data = await api.verifyCpfPublic(cleanCpf);

      if (data.encontrado) {
        setFormData(prev => ({ ...prev, nome: data.nome, cpf: cleanCpf }));
        setStep('whatsapp');
        setStatus('idle');
        setMessage('');
      } else {
        setMessage('CPF não encontrado no cadastro. Entre em contato com a organização.');
        setStatus('error');
      }
    } catch (error) {
      setMessage('Erro ao verificar CPF. Tente novamente.');
      setStatus('error');
    }
  };

  const handleWhatsAppSubmit = async () => {
    if (!formData.whatsapp || formData.whatsapp.length < 10) {
      setMessage('Por favor, insira um número de WhatsApp válido.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Registrando inscrição...');

    try {
      await api.registerInscription({
        cpf: formData.cpf,
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        atividade_id: formData.atividade_id,
        grupo_interesse: formData.grupo_interesse
      });

      setStep('success');
      setStatus('success');
      setMessage('Inscrição realizada com sucesso!');
      
      // Reset after 5 seconds
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 5000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao registrar inscrição.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setFormData({
      cpf: '',
      nome: '',
      whatsapp: '',
      grupo_interesse: '',
      atividade_id: 0
    });
    setSelectedActivity(null);
    setStep('activity');
    setStatus('idle');
    setMessage('');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageCircle':
        return <MessageCircle className="h-8 w-8" />;
      case 'PiggyBank':
        return <PiggyBank className="h-8 w-8" />;
      case 'Leaf':
        return <Leaf className="h-8 w-8" />;
      case 'Briefcase':
        return <Briefcase className="h-8 w-8" />;
      case 'HardHat':
        return <HardHat className="h-8 w-8" />;
      default:
        return <Users className="h-8 w-8" />;
    }
  };

  const getGroupBgColor = (iconName: string) => {
    switch (iconName) {
      case 'MessageCircle':
        return 'bg-red-600';
      case 'PiggyBank':
        return 'bg-amber-500';
      case 'Leaf':
        return 'bg-green-600';
      case 'Briefcase':
        return 'bg-blue-600';
      case 'HardHat':
        return 'bg-violet-600';
      default:
        return 'bg-blue-600';
    }
  };

  const resolveIconName = (group: any) => {
    if (group?.icon) return group.icon;
    if (group?.icone) return group.icone;
    const name = (group?.nome || '').toLowerCase();
    if (name.includes('mobiliza')) return 'MessageCircle';
    if (name.includes('orçamento') || name.includes('orcamento')) return 'PiggyBank';
    if (name.includes('ambiente')) return 'Leaf';
    if (name.includes('trabalho') || name.includes('renda')) return 'Briefcase';
    if (name.includes('obra') || name.includes('pós-obra') || name.includes('pos-obra')) return 'HardHat';
    return 'Users';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GTA Presença</h1>
                <p className="text-sm text-gray-600">Copa do Povo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/qr-attendance')}
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <QrCode className="h-4 w-4" />
                <span>Registrar Presença com QR Code</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span>Área Administrativa</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Participe das Atividades
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Inscreva-se nas atividades da Copa do Povo e faça parte desta transformação social.
            Sua participação é fundamental para o sucesso do projeto!
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/qr-attendance')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <QrCode className="h-5 w-5" />
              Registrar Presença com QR Code
            </button>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Nossos Grupos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
            {groups.map(group => (
              <div key={group.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  {group.imagem_url ? (
                    <img src={group.imagem_url} alt={group.nome} className="w-12 h-12 rounded-lg object-cover mb-4" />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white ${getGroupBgColor(resolveIconName(group))}`}>
                      {getGroupIcon(resolveIconName(group))}
                    </div>
                  )}
                  <h4 className="text-xl font-semibold text-gray-900 mb-1">{group.nome}</h4>
                  {group.descricao && <p className="text-gray-600 mb-3">{group.descricao}</p>}

                  {Array.isArray(group.subgrupos) && group.subgrupos.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.subgrupos.map((sub: any) => (
                        <span key={sub.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {sub.nome}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">Sem subgrupos cadastrados</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Próximas Atividades</h3>
          
          {activities.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma atividade disponível no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6 cursor-pointer"
                  onClick={() => handleActivitySelect(activity)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{activity.nome}</h4>
                      <p className="text-sm text-gray-600 mt-1">Grupo: {(() => {
                        const g = groups.find((x: any) => x.id === (activity.grupo_id ?? -1));
                        const sub = g?.subgrupos?.find((s: any) => s.id === (activity.subgrupo_id ?? -1));
                        return `${activity.grupo}${sub ? ` • ${sub.nome}` : ''}`;
                      })()}</p>
                    </div>
                    <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Data e hora:</span> {formatDateTime(activity.data)}
                    </p>
                    {activity.responsavel && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Responsável:</span> {activity.responsavel}
                      </p>
                    )}
                  </div>
                  
                  <button className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <span>Inscrever-se</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {step === 'success' ? 'Inscrição Confirmada!' : 'Inscrição na Atividade'}
                  </h3>
                  {selectedActivity && step !== 'success' && (
                    <p className="text-sm text-gray-600 mt-1">{selectedActivity.nome}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Step Indicator */}
              {step !== 'success' && (
                <div className="flex items-center justify-between mb-8">
                  <div className={`flex items-center ${step === 'cpf' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'cpf' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}>
                      1
                    </div>
                    <span className="ml-2 text-sm font-medium">CPF</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                  <div className={`flex items-center ${step === 'whatsapp' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'whatsapp' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}>
                      2
                    </div>
                    <span className="ml-2 text-sm font-medium">WhatsApp</span>
                  </div>
                </div>
              )}

              {/* Messages */}
              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  status === 'success' ? 'bg-green-100 text-green-800' :
                  status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <div className="flex items-center">
                    {status === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> :
                     status === 'error' ? <AlertCircle className="h-4 w-4 mr-2" /> : null}
                    {message}
                  </div>
                </div>
              )}

              {/* Form Content */}
              {step === 'cpf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digite seu CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      cpf: formatCPF(e.target.value) 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <button
                    onClick={handleCPFSubmit}
                    disabled={status === 'loading' || formData.cpf.length < 14}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {status === 'loading' ? 'Verificando...' : 'Continuar'}
                  </button>
                </div>
              )}

              {step === 'whatsapp' && (
                <div>
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Nome:</span> {formData.nome}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">CPF:</span> {formData.cpf}
                    </p>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupo de Interesse
                  </label>
                  <select
                    value={formData.grupo_interesse}
                    onChange={(e) => setFormData(prev => ({ ...prev, grupo_interesse: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      whatsapp: formatWhatsApp(e.target.value) 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Usaremos este número para enviar lembretes e informações sobre a atividade.
                  </p>
                  
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => setStep('cpf')}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleWhatsAppSubmit}
                      disabled={status === 'loading' || formData.whatsapp.length < 14 || !formData.grupo_interesse}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {status === 'loading' ? 'Registrando...' : 'Confirmar Inscrição'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-6">
                    Sua inscrição foi realizada com sucesso! Você receberá uma confirmação 
                    e lembretes pelo WhatsApp informado.
                  </p>
                  <div className="p-4 bg-gray-50 rounded-lg text-left">
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Atividade:</span> {selectedActivity?.nome}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Data e hora:</span> {selectedActivity && formatDateTime(selectedActivity.data)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Participante:</span> {formData.nome}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};