import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QrReader from 'react-qr-reader-es6';
import { Camera, CameraOff, CheckCircle, XCircle, ArrowLeft, QrCode } from 'lucide-react';
import { api } from '../lib/api';

interface VerifiedParticipant {
  nome: string;
  cpf: string;
}

interface FamilyMember {
  id: number;
  nome: string;
  posicao?: string;
}

export const QRAttendance: React.FC = () => {
  const [step, setStep] = useState<'cpf' | 'camera' | 'success' | 'error'>('cpf');
  const [cpf, setCpf] = useState('');
  const [verifiedParticipant, setVerifiedParticipant] = useState<VerifiedParticipant | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [executorId, setExecutorId] = useState<number | null>(null);
  const navigate = useNavigate();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleVerifyCpf = async () => {
    if (!cpf) {
      setMessage('Por favor, insira um CPF.');
      return;
    }
    setIsVerifying(true);
    setMessage('');

    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      let verified: any = { encontrado: false };
      let fam: any = null;

      try {
        verified = await api.verifyCpfPublic(cleanCpf);
      } catch (e) {
        // Ignora erro de rede/outros temporariamente para verificar familia
        console.log('Erro ao verificar presença:', e);
      }

      try {
        fam = await api.getFamilyByCpfPublic(cleanCpf);
      } catch (e) {
        console.log('Erro ao buscar família:', e);
      }

      const isActualParticipant = verified && verified.encontrado && verified.ja_participante;
      // Verifica se existe no cadastro socioeconomico (retorno da api de cpf ja_participante=false ou na busca de familia)
      const isFoundInFamily = (verified && verified.encontrado && !verified.ja_participante) || (fam && (fam.cadastro_id || (fam.titular && fam.titular.nome)));

      if (isActualParticipant) {
        const titularNome = verified.nome || 'Participante';
        setVerifiedParticipant({ nome: titularNome, cpf: cleanCpf });
        setFamilyMembers(Array.isArray(fam?.membros) ? fam.membros : []);
        setExecutorId(null);
        setStep('camera');
        setMessage('');
      } else {
        if (isFoundInFamily) {
          setMessage('CPF está cadastrado no banco de dados, mas não na aplicação de presença. contate um coordenador.');
        } else {
          setMessage('Participante não encontrado no banco de dados. Contate um coordenador para fazer o cadastro do GTA.');
        }
      }
    } catch (err) {
      setMessage('Ocorreu um erro ao verificar o CPF. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScanResult = async (data: string | null) => {
    if (data && data !== scanResult) {
      setScanResult(data);
      setCameraEnabled(false);
      setIsRegistering(true);
      setMessage('Processando QR Code...');

      try {
        const result = await api.registerPresenceQRWithExecutor(verifiedParticipant!.cpf, data, executorId === null ? undefined : executorId);
        setMessage(result.message || 'Presença registrada com sucesso!');
        setStep('success');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Erro ao registrar presença.');
        setStep('error');
      } finally {
        setIsRegistering(false);
      }
    }
  };

  const handleScanError = (err: any) => {
    console.error('QR Scan Error:', err);
  };

  const resetAndGoBack = () => {
    setCpf('');
    setVerifiedParticipant(null);
    setStep('cpf');
    setCameraEnabled(false);
    setScanResult(null);
    setMessage('');
  };

  const startCamera = () => {
    setCameraEnabled(true);
  };

  const stopCamera = () => {
    setCameraEnabled(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center space-x-3 ml-6">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Registrar Presença</h1>
                <p className="text-sm text-gray-600">Via QR Code</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">

          {/* Etapa 1: Verificação de CPF */}
          {step === 'cpf' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">1. Verificar CPF</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cpf-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Digite seu CPF
                  </label>
                  <input
                    id="cpf-input"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    maxLength={14}
                  />
                </div>
                <button
                  onClick={handleVerifyCpf}
                  disabled={isVerifying || !cpf}
                  className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar CPF'}
                </button>

                {message && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: Scanner de QR Code */}
          {step === 'camera' && verifiedParticipant && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Escanear QR Code</h2>
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700">
                  Olá, <span className="font-semibold">{verifiedParticipant.nome}</span>!
                </p>
                <p className="text-sm text-gray-600">
                  Aponte a câmera para o QR Code mostrado pelo coordenador
                </p>
              </div>

              <div className="space-y-4">
                {!cameraEnabled ? (
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <Camera className="h-16 w-16 text-gray-400" />
                    </div>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Camera className="h-5 w-5" />
                      Ativar Câmera
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative overflow-hidden rounded-lg bg-black">
                      <QrReader
                        delay={300}
                        onError={handleScanError}
                        onScan={handleScanResult}
                        style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}
                        className="qr-reader"
                      />
                    </div>
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <CameraOff className="h-5 w-5" />
                        Parar Câmera
                      </button>
                    </div>
                    {isRegistering && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">Processando...</p>
                      </div>
                    )}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quem está registrando?</label>
                      <select
                        value={executorId ?? ''}
                        onChange={(e) => setExecutorId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Titular{verifiedParticipant ? `: ${verifiedParticipant.nome}` : ''}</option>
                        {familyMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.posicao ? `${m.posicao}: ` : ''}{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={resetAndGoBack}
                  className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voltar ao CPF
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3: Sucesso */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Presença Registrada!</h2>
              <p className="text-lg text-gray-700 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={resetAndGoBack}
                  className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrar Outra Presença
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          )}

          {/* Etapa 4: Erro */}
          {step === 'error' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Erro</h2>
              <p className="text-lg text-gray-700 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={resetAndGoBack}
                  className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};