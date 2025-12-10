// src/lib/api.ts

// O BASE_URL agora aponta para a raiz da API, pois as rotas não estão mais prefixadas com /presenca
const API_BASE_URL = '/api';

const getAuthToken = () => localStorage.getItem('presenca_token');

// Função de tratamento de resposta genérica e robusta
const handleResponse = async (response: Response) => {
  // Tenta obter o JSON independentemente do status para logs de erro
  const responseData = await response.json().catch(() => ({ message: 'A resposta não é um JSON válido.', status: response.statusText }));

  if (!response.ok) {
    // Tratamento global para 401: expira sessão e redireciona para login
    if (response.status === 401) {
      try {
        localStorage.removeItem('presenca_token');
        localStorage.removeItem('presenca_user');
      } catch { }
      // Evita loop caso já esteja na página de login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        try {
          window.location.href = '/login?reason=expired';
          // Retorna uma promessa que nunca resolve para interromper a cadeia de execução
          return new Promise(() => { });
        } catch (e) {
          console.error("Falha ao redirecionar para o login:", e);
        }
      }
      // Se o redirecionamento falhar ou não for aplicável, lança o erro
      const msg = responseData.message || responseData.error || 'Não autorizado. Faça login novamente.';
      throw new Error(msg);
    }

    // Usa a mensagem do JSON de erro, se disponível, senão uma mensagem padrão
    const errorMessage = responseData.message || responseData.error || `Erro ${response.status}: ${response.statusText}`;
    console.error('API Error:', errorMessage, 'Response Data:', responseData);
    throw new Error(errorMessage);
  }

  return responseData;
};

// Constrói os headers de autenticação padronizados
const buildAuthHeaders = (withContentType = false) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (withContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // --- Autenticação ---
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Garante que o cookie de sessão seja salvo
    });
    return handleResponse(response);
  },

  // --- Verificação de CPF (duas variantes) ---
  // Pública: usa endpoint público e não envia token
  verifyCpfPublic: async (cpf: string) => {
    const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    const response = await fetch(`${API_BASE_URL}/consultar-cpf-publico?cpf=${encodeURIComponent(formattedCpf)}`);
    if (response.status === 404) {
      return response.json();
    }
    return handleResponse(response);
  },

  // Protegida: requer token e usa o endpoint protegido (para coordenação/admin)
  verifyCpfProtected: async (cpf: string) => {
    const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    const url = `${API_BASE_URL}/verificar-cpf?cpf=${encodeURIComponent(formattedCpf)}`;

    // Logs de debug removidos para segurança: não imprimir token nem headers

    const response = await fetch(url, {
      headers: buildAuthHeaders(), // O token já é injetado aqui
    });
    if (response.status === 404) {
      return response.json();
    }
    return handleResponse(response);
  },

  // Alias para compatibilidade antiga
  verifyCpf: async (cpf: string) => {
    return api.verifyCpfProtected(cpf);
  },

  // Alias for backward compatibility: usar verificação pública (sem token) em páginas antigas
  verifyParticipant: async (cpf: string) => {
    return api.verifyCpfPublic(cpf);
  },

  // --- Atividades Públicas ---
  getPublicActivities: async () => {
    const response = await fetch(`${API_BASE_URL}/atividades-publicas`);
    return handleResponse(response);
  },

  // --- Registro de Inscrição Pública ---
  registerInscription: async (inscriptionData: { cpf: string; nome: string; whatsapp: string; atividade_id: number; grupo_interesse?: string; }) => {
    const response = await fetch(`${API_BASE_URL}/registrar-inscricao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inscriptionData),
    });
    return handleResponse(response);
  },

  // --- Participantes ---
  // Rota pública para registrar um novo participante
  addParticipant: async (participantData: { name: string; cpf: string; age: number; group?: string; grupo_id?: number; subgrupo_id?: number; nucleus?: string; whatsapp?: string; }) => {
    const response = await fetch(`${API_BASE_URL}/participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participantData),
    });
    return handleResponse(response);
  },

  // Rota protegida para listar participantes
  getParticipants: async (opts?: { page?: number; page_size?: number; q?: string }) => {
    const params = new URLSearchParams();
    if (typeof opts?.page === 'number') params.set('page', String(opts.page));
    if (typeof opts?.page_size === 'number') params.set('page_size', String(opts.page_size));
    if (opts?.q) params.set('q', opts.q);
    const qs = params.toString();
    const url = `${API_BASE_URL}/participantes${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, { headers: buildAuthHeaders() });
    return handleResponse(response);
  },

  getParticipantDetails: async (id: number, opts?: { from_date?: string; to_date?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.from_date) params.set('from_date', opts.from_date);
    if (opts?.to_date) params.set('to_date', opts.to_date);
    if (typeof opts?.limit === 'number') params.set('limit', String(opts.limit));
    const qs = params.toString();
    const url = `${API_BASE_URL}/participantes/${id}${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, { headers: buildAuthHeaders() });
    return handleResponse(response);
  },

  updateParticipant: async (id: number, updates: Partial<{ nome: string; name: string; cpf: string; idade: number; age: number; nucleo: string; nucleus: string; whatsapp: string; grupo: string; grupo_id: number; subgrupo_id: number; }>) => {
    const response = await fetch(`${API_BASE_URL}/participantes/${id}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  // --- Atividades (Admin/Coordenador) ---
  getActivities: async () => {
    const response = await fetch(`${API_BASE_URL}/atividades`, {
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  createActivity: async (activityData: { grupo?: string; grupo_id?: number; subgrupo_id?: number; data: string; topico: string; responsavel?: string; pontos_por_participante?: number; }) => {
    const response = await fetch(`${API_BASE_URL}/atividades`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(activityData),
    });
    return handleResponse(response);
  },

  // NOVO: Atualizar atividade
  updateActivity: async (atividade_id: number, updates: Partial<{ grupo?: string; grupo_id?: number; subgrupo_id?: number; data: string; topico: string; responsavel?: string; pontos_por_participante?: number; }>) => {
    const response = await fetch(`${API_BASE_URL}/atividades/${atividade_id}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  // NOVO: Remover presença de participante na atividade
  removeParticipantFromActivity: async (atividade_id: number, participante_id: number) => {
    const response = await fetch(`${API_BASE_URL}/atividades/${atividade_id}/participantes/${participante_id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  // NOVO: Excluir atividade
  deleteActivity: async (atividade_id: number) => {
    const response = await fetch(`${API_BASE_URL}/atividades/${atividade_id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Presença (Admin/Coordenador) ---
  registerAttendance: async (cpf: string, atividade_id: number) => {
    const response = await fetch(`${API_BASE_URL}/presenca`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ cpf, atividade_id }),
    });
    return handleResponse(response);
  },

  // Alias for backward compatibility
  registerPresence: async (participante_id: number, atividade_id: number) => {
    const response = await fetch(`${API_BASE_URL}/presenca`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ participante_id, atividade_id }),
    });
    return handleResponse(response);
  },

  // --- Ranking ---
  getRanking: async () => {
    const response = await fetch(`${API_BASE_URL}/ranking`, {
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Usuários (Admin) ---
  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  registerUser: async (userData: { username: string; password: string; role: string; }) => {
    const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  deleteUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/user/delete/${userId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- QR Code para Presença ---
  // Gera QR code para uma atividade (coordenador/admin)
  generateQRCode: async (atividade_id: number) => {
    const response = await fetch(`${API_BASE_URL}/gerar-qr-atividade`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ atividade_id }),
    });
    return handleResponse(response);
  },

  // Verifica CPF para presença (público - requer QR token válido)
  verifyCpfPresence: async (cpf: string, qr_token: string) => {
    const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    const url = `${API_BASE_URL}/verificar-cpf-presenca?cpf=${encodeURIComponent(formattedCpf)}&qr_token=${encodeURIComponent(qr_token)}`;
    const response = await fetch(url);
    if (response.status === 404) {
      return response.json();
    }
    return handleResponse(response);
  },

  // Registra presença via QR code (público)
  registerPresenceQR: async (cpf: string, qr_token: string) => {
    const response = await fetch(`${API_BASE_URL}/presenca-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, qr_token }),
    });
    return handleResponse(response);
  },

  getFamilyByCpf: async (cpf: string) => {
    const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    const response = await fetch(`${API_BASE_URL}/familia?cpf=${encodeURIComponent(formattedCpf)}`, {
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  getFamilyByCpfPublic: async (cpf: string) => {
    const formattedCpf = cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    const response = await fetch(`${API_BASE_URL}/familia-publica?cpf=${encodeURIComponent(formattedCpf)}`);
    return handleResponse(response);
  },

  registerAttendanceWithExecutor: async (cpf: string, atividade_id: number, membro_id?: number) => {
    const payload: any = { cpf, atividade_id };
    if (typeof membro_id === 'number') payload.membro_id = membro_id;
    const response = await fetch(`${API_BASE_URL}/presenca`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  registerPresenceQRWithExecutor: async (cpf: string, qr_token: string, membro_id?: number) => {
    const payload: any = { cpf, qr_token };
    if (typeof membro_id === 'number') payload.membro_id = membro_id;
    const response = await fetch(`${API_BASE_URL}/presenca-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // --- Grupos Temáticos ---
  getGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/grupos`, {
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  getPublicGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/grupos-publicos`);
    return handleResponse(response);
  },

  createGroup: async (groupData: { nome: string; descricao?: string; imagem_url?: string; }) => {
    const response = await fetch(`${API_BASE_URL}/grupos`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(groupData),
    });
    return handleResponse(response);
  },

  updateGroup: async (grupo_id: number, updates: Partial<{ nome: string; descricao?: string; imagem_url?: string; }>) => {
    const response = await fetch(`${API_BASE_URL}/grupos/${grupo_id}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  deleteGroup: async (grupo_id: number) => {
    const response = await fetch(`${API_BASE_URL}/grupos/${grupo_id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  createSubGroup: async (data: { nome: string; descricao?: string; grupo_id: number; imagem_url?: string; }) => {
    const response = await fetch(`${API_BASE_URL}/subgrupos`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateSubGroup: async (id: number, data: { nome?: string; descricao?: string; imagem_url?: string; }) => {
    const response = await fetch(`${API_BASE_URL}/subgrupos/${id}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteSubGroup: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/subgrupos/${id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Exportações (Admin) ---
  downloadExport: async (target: 'visita' | 'controle' | 'responsaveis' | 'familia' | 'despesas' | 'lazer' | 'participacao' | 'moradia' | 'animais' | 'mobilidade' | 'sustentabilidade' | 'violencia' | 'documentacao' | 'observacoes', filename?: string) => {
    const response = await fetch(`${API_BASE_URL}/export/${target}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error(`Falha ao exportar ${target}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `export_${target}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // --- Exportações da Presença (Admin) ---
  downloadPresenceExport: async (target: 'participantes' | 'atividades' | 'presencas' | 'inscricoes' | 'ranking', filename?: string) => {
    const response = await fetch(`${API_BASE_URL}/export-presenca/${target}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error(`Falha ao exportar ${target}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `presenca_${target}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadPresenceExportByActivity: async (atividade_id: number, filename?: string) => {
    const response = await fetch(`${API_BASE_URL}/export-presenca/atividade/${atividade_id}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Falha ao exportar presenças da atividade');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `presenca_atividade_${atividade_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadPresenceExportByGroup: async (grupo_id: number, filename?: string) => {
    const response = await fetch(`${API_BASE_URL}/export-presenca/grupo/${grupo_id}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Falha ao exportar presenças do grupo');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `presenca_grupo_${grupo_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadPresenceExportBySubGroup: async (subgrupo_id: number, filename?: string) => {
    const response = await fetch(`${API_BASE_URL}/export-presenca/subgrupo/${subgrupo_id}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Falha ao exportar presenças do subgrupo');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `presenca_subgrupo_${subgrupo_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};
