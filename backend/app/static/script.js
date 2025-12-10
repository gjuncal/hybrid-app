document.addEventListener('DOMContentLoaded', function () {
    // --- STATE AND CONFIGURATION ---
    let socket;
    let currentUser = null;
    let chartInstances = {};
    let allCadastros = [];
    let dashboardPage = 1;
    const DASHBOARD_PAGE_SIZE = 40;

    const sectionNumberToName = {
        1: 'identificadores', 2: 'dados-visita', 3: 'dados-controle', 4: 'dados-responsaveis',
        5: 'composicao-familiar', 6: 'despesas', 7: 'lazer-cultura', 8: 'participacao-organizacao',
        9: 'dados-moradia', 10: 'animais-estimacao', 11: 'mobilidade-urbana', 12: 'sustentabilidade',
        13: 'violencia', 14: 'documentacao', 15: 'observacoes-finais'
    };
    const totalPages = 15;
    let currentPage = 1;

    // --- CHART DATA MAPPINGS ---
    const GENDER_MAP = { '1': 'FEMININO', '2': 'MASCULINO', '3': 'NÃO BINARIO', '99': 'SEM INFORMAÇÃO' };
    const HOUSING_TYPE_MAP = { '1': 'CASA', '2': 'APARTAMENTO', '3': 'CÔMODO', '4': 'OUTRO', '5': 'SITUAÇÃO DE RUA' };
    const OCCUPATIONAL_STATUS_MAP = {
        '1': 'DESEMPREGADO', '2': 'ASSALARIADO C/ REG.', '3': 'ASSALARIADO S/ REG.',
        '4': 'TRAB. TEMPORÁRIO/BICO', '5': 'AUTÔNOMO', '6': 'FUNCIONÁRIO PÚBLICO',
        '7': 'EMPREGADOR', '8': 'ESTUDANTE/ESTÁGIARIO', '9': 'AFASTADO POR DOENÇA',
        '10': 'APOSENTADO', '11': 'PENSIONISTA', '12': 'INCAPAZ P/ TRABALHO',
        '13': 'BENEFICIÁRIO (BPC)', '14': 'DONA DE CASA', '15': 'MENOR DE 10 ANOS',
        '16': 'NÃO DESEJA TRABALHAR', '99': 'SEM INFORMAÇÃO'
    };


    // --- UTILITY FUNCTIONS ---
    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    function translateDataKeys(originalData, map) {
        const translatedData = {};
        for (const key in originalData) {
            if (!key) { // Pula chaves vazias
                continue;
            }
            const translatedKey = map[key] || key;
            translatedData[translatedKey] = originalData[key];
        }
        return translatedData;
    }

    function generateCustomId() {
        return `COPA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    function showMessage(message, type = 'info', duration = 4000) {
        const msgDiv = document.getElementById('global-feedback');
        if (msgDiv) {
            msgDiv.textContent = message;
            msgDiv.className = 'show';
            msgDiv.classList.add(type);
            setTimeout(() => msgDiv.classList.remove('show'), duration);
        }
    }

    function validateCPF(cpf) {
        const cleanCPF = String(cpf || '').replace(/[^\d]+/g, '');

        // Validação CPF (11 dígitos)
        if (cleanCPF.length === 11) {
            if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

            let add = 0;
            for (let i = 0; i < 9; i++) add += parseInt(cleanCPF.charAt(i)) * (10 - i);
            let rev = 11 - (add % 11);
            if (rev === 10 || rev === 11) rev = 0;
            if (rev !== parseInt(cleanCPF.charAt(9))) return false;

            add = 0;
            for (let i = 0; i < 10; i++) add += parseInt(cleanCPF.charAt(i)) * (11 - i);
            rev = 11 - (add % 11);
            if (rev === 10 || rev === 11) rev = 0;
            if (rev !== parseInt(cleanCPF.charAt(10))) return false;

            return true;
        }

        // Validação CNPJ (14 dígitos)
        if (cleanCPF.length === 14) {
            // Elimina CNPJs invalidos conhecidos
            if (/^(\d)\1{13}$/.test(cleanCPF)) return false;

            let tamanho = cleanCPF.length - 2;
            let numeros = cleanCPF.substring(0, tamanho);
            const digitos = cleanCPF.substring(tamanho);
            let soma = 0;
            let pos = tamanho - 7;
            for (let i = tamanho; i >= 1; i--) {
                soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
                if (pos < 2) pos = 9;
            }
            let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado !== parseInt(digitos.charAt(0))) return false;

            tamanho = tamanho + 1;
            numeros = cleanCPF.substring(0, tamanho);
            soma = 0;
            pos = tamanho - 7;
            for (let i = tamanho; i >= 1; i--) {
                soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
                if (pos < 2) pos = 9;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado !== parseInt(digitos.charAt(1))) return false;

            return true;
        }

        return false;
    }

    // --- AUTHENTICATION ---
    //redacted
    function initializeApp() {
        const token = localStorage.getItem('authToken');

        // Setup socket with authentication
        socket = io({ auth: { token: token } });
        setupSocketListeners();

        updateUIVisibility();
        // Inicialização de validações e máscaras
        applyInputMasks();
        setupAllCpfValidation();
        setupEventListeners();
        openTab('dashboard');

        populateUfDropdowns();
        setupUppercaseFields();
        setupAllConditionalFields();
        const { role } = currentUser;
        const isAdmin = role === 'administrador';
        const isCoordinator = role === 'coordenador';
        const isCadastrador = role === 'cadastrador';

        document.getElementById('logout-button').style.display = 'block';

        // Visibilidade das Abas
        document.querySelector('[data-tab-name="user-management"]').classList.toggle('d-none', !isAdmin);
        document.querySelector('[data-tab-name="estatisticas"]').classList.toggle('d-none', isCadastrador);

        // Visibilidade dos Botões de Exportação (dentro da aba de estatísticas)
        document.querySelectorAll('.export-button').forEach(btn => btn.classList.toggle('d-none', !isAdmin));
    }

    async function logout() {
        console.trace("Logout called by:");
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('presenca_token');
        localStorage.removeItem('presenca_user');

        if (socket) socket.disconnect();

        // Use direct navigation to the logout route.
        // This is more robust than fetch/sendBeacon as it guarantees the request reaches the server
        // and handles the redirect naturally.
        window.location.href = '/logout';
    }
    // --- TABS AND NAVIGATION ---
    function openTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = ''; // Clear inline styles that might have been set
        });
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

        const activeContent = document.getElementById(`${tabName}-content`);
        const activeButton = document.querySelector(`.tab-button[data-tab-name="${tabName}"]`);

        if (activeContent) activeContent.classList.add('active');
        if (activeButton) activeButton.classList.add('active');

        const formNav = document.querySelector('.form-navigation');
        if (formNav) {
            formNav.style.display = tabName === 'cadastro' ? 'flex' : 'none';
        }

        if (tabName === 'cadastro') {
            showPage(currentPage);
        } else if (tabName === 'dashboard') {
            dashboardPage = 1;
            emitGetCadastros();
        } else if (tabName === 'estatisticas' && currentUser.role !== 'cadastrador') {
            socket.emit('get_statistics', { token: localStorage.getItem('authToken') });
        } else if (tabName === 'user-management' && currentUser.role === 'administrador') {
            fetchAndDisplayUsers();
        }
    }

    function emitGetCadastros() {
        const token = localStorage.getItem('authToken');
        if (!token) { logout(); return; }
        socket.emit('get_cadastros', { token, page: dashboardPage, page_size: DASHBOARD_PAGE_SIZE });
    }
    async function performDashboardSearch() {
        const q = document.getElementById('search-input').value.trim();
        const token = localStorage.getItem('authToken');
        if (!q) { emitGetCadastros(); return; }
        try {
            const resp = await fetch(`/api/cadastros/search?q=${encodeURIComponent(q)}&limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await handleApiResponse(resp);
            const results = Array.isArray(data.results) ? data.results : [];
            displayCadastroList(results);
            const indicator = document.getElementById('dashboard-page-indicator');
            if (indicator) indicator.textContent = `Resultados (${results.length})`;
            const prevBtn = document.getElementById('dashboard-prev');
            const nextBtn = document.getElementById('dashboard-next');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
        } catch (err) {
            showMessage(err.message || 'Falha na busca.', 'error');
        }
    }

    // --- DASHBOARD AND CADASTRO LIST ---
    function displayCadastroList(cadastros = []) {
        allCadastros = cadastros;
        const listElement = document.getElementById('lista-cadastros');
        if (!listElement) return;

        listElement.innerHTML = '';
        const searchTerm = document.getElementById('search-input').value.toLowerCase();

        const filtered = allCadastros.filter(c =>
            (c.cadastroId && c.cadastroId.toLowerCase().includes(searchTerm)) ||
            (c.projeto && c.projeto.toLowerCase().includes(searchTerm)) ||
            (c.nucleo && c.nucleo.toLowerCase().includes(searchTerm)) ||
            (c.nomeCompleto && c.nomeCompleto.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            listElement.innerHTML = '<li>Nenhum registo encontrado.</li>';
            return;
        }

        const canDelete = currentUser.role === 'administrador';
        const canEdit = currentUser.role !== 'cadastrador';

        filtered.forEach(cadastro => {
            const item = document.createElement('li');
            let buttons = `<button class="button btn-secondary btn-sm" data-action="view-edit" data-id="${cadastro.cadastroId}">Visualizar/Editar</button>`;

            if (canDelete) {
                buttons += ` <button class="button btn-danger btn-sm" data-action="delete" data-id="${cadastro.cadastroId}"><i class="fas fa-trash-alt"></i></button>`;
            }

            item.innerHTML = `
                <span>${cadastro.cadastroId} - <strong>${cadastro.nomeCompleto || 'Sem nome'}</strong> (${cadastro.nucleo || 'Sem núcleo'})</span>
                <div class="btn-group">
                    ${buttons}
                </div>
            `;
            listElement.appendChild(item);
        });
        updateDashboardPager(cadastros);
    }

    // Atualiza UI do pager com base nos dados atuais
    function updateDashboardPager(currentData) {
        const prevBtn = document.getElementById('dashboard-prev');
        const nextBtn = document.getElementById('dashboard-next');
        const indicator = document.getElementById('dashboard-page-indicator');

        if (indicator) {
            indicator.textContent = `Página ${dashboardPage}`;
        }
        if (prevBtn) {
            prevBtn.disabled = dashboardPage <= 1;
        }
        if (nextBtn) {
            const length = Array.isArray(currentData) ? currentData.length : 0;
            nextBtn.disabled = length < DASHBOARD_PAGE_SIZE;
        }
    }

    // --- FORM HANDLING ---
    function saveCurrentSection(force = false) {
        const form = document.querySelector('.form-section.active');
        if (!form) return;

        if (form.id === 'form-section-4') {
            // Valida todos os campos de CPF da seção para exibir alertas visuais
            const cpfFieldsToCheck = ['cpfResponsavel1', 'cpfTutorResponsavel1', 'cpfResponsavel2', 'cpfTutorResponsavel2', 'cnpjCpfFontePagadoraResponsavel1', 'cnpjCpfFontePagadoraResponsavel2'];

            cpfFieldsToCheck.forEach(fieldId => {
                const el = document.getElementById(fieldId);
                const err = document.getElementById(fieldId + '-error');
                if (el && err) {
                    const val = el.value.trim();
                    if (val && !validateCPF(val)) {
                        err.textContent = 'CPF/CNPJ inválido.';
                        err.style.display = 'block';
                    } else {
                        err.style.display = 'none';
                    }
                }
            });

            // Bloqueia salvamento APENAS se o CPF do responsável 1 for inválido
            const cpf1 = document.getElementById('cpfResponsavel1');
            if (cpf1) {
                const val = cpf1.value.trim();
                if (val && !validateCPF(val)) {
                    showMessage('Não é possível guardar. O CPF do primeiro responsável é inválido.', 'error');
                    return;
                }
            }
        }

        const sectionNumber = parseInt(form.id.replace('form-section-', ''));
        const sectionName = sectionNumberToName[sectionNumber];
        const cadastroId = document.getElementById('numeroCadastro').value;
        const token = localStorage.getItem('authToken');

        if (!cadastroId || !token) return;

        let dataToSave = {};

        if (sectionName === 'composicao-familiar') {
            dataToSave.membros = Array.from(document.querySelectorAll('#membros-familia .membro-familia')).map(div => {
                const membro = {};
                div.querySelectorAll('input, select').forEach(input => { if (input.name) membro[input.name] = input.value; });
                return membro;
            });
        } else if (sectionName === 'violencia') {
            dataToSave.ocorrencias = Array.from(document.querySelectorAll('#violencia-campos .violencia-ocorrencia')).map(div => {
                const ocorrencia = {};
                div.querySelectorAll('input, select').forEach(input => { if (input.name) ocorrencia[input.name] = input.value; });
                return ocorrencia;
            });
            dataToSave.leiMariaPenha = document.getElementById('leiMariaPenha').value;
        } else {
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                if (key.endsWith('[]')) {
                    const realKey = key.slice(0, -2);
                    if (!dataToSave[realKey]) dataToSave[realKey] = [];
                    dataToSave[realKey].push(value);
                } else {
                    dataToSave[key] = value;
                }
            }
        }
        // Garante valores básicos mesmo fora da seção 1
        if (sectionName !== 'identificadores') {
            dataToSave.projeto = dataToSave.projeto || (document.getElementById('projeto')?.value || 'COPA DO POVO');
            dataToSave.nucleo = dataToSave.nucleo || (document.getElementById('nucleo')?.value || '');
        }

        // Usa sempre a API HTTP para maior confiabilidade
        fetch('/api/cadastro/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sectionData: {
                    cadastroId: cadastroId,
                    section: sectionName,
                    data: dataToSave
                }
            })
        })
            .then(handleApiResponse)
            .then(data => showMessage(data.message || 'Seção guardada com sucesso!', 'success'))
            .catch(err => showMessage(err.message || 'Falha ao guardar seção.', 'error'));

        if (force) {
            showMessage('A guardar...', 'info');
        }
    }

    const debouncedSave = debounce(() => saveCurrentSection(false), 2000);

    function novoCadastro() {
        document.querySelectorAll('form').forEach(form => form.reset());
        document.getElementById('membros-familia').innerHTML = '';
        document.getElementById('violencia-campos').innerHTML = '';

        const newId = generateCustomId();
        document.getElementById('numeroCadastro').value = newId;
        document.getElementById('cadastroId').value = newId;

        if (currentUser && currentUser.username) {
            document.getElementById('cadastrador').value = currentUser.username.toUpperCase();
        }

        const now = new Date();
        document.getElementById('dataVisita').value = now.toISOString().split('T')[0];
        document.getElementById('horaVisita').value = now.toTimeString().slice(0, 5);

        setupAllConditionalFields();
        openTab('cadastro');
        currentPage = 1;
        showPage(1);
        saveCurrentSection(true);
    }

    function carregarCadastro(cadastroId) {
        const token = localStorage.getItem('authToken');
        if (!cadastroId || !token) return;
        cadastroId = (cadastroId || '').trim();

        document.querySelectorAll('form').forEach(form => form.reset());
        document.getElementById('membros-familia').innerHTML = '';
        document.getElementById('violencia-campos').innerHTML = '';

        socket.emit('get_cadastro_data', { token, cadastroId });
        openTab('cadastro');
        currentPage = 1;
        showPage(1);
        setTimeout(async () => {
            const numeroVal = document.getElementById('numeroCadastro').value;
            if (!numeroVal) {
                try {
                    const resp = await fetch(`/api/cadastro/${encodeURIComponent(cadastroId)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await resp.json();
                    if (data && data.status === 'success' && data.cadastro) {
                        populateForm(data.cadastro);
                    }
                } catch (_) { }
            }
        }, 1200);
    }

    function populateForm(cadastro) {
        if (!cadastro) return;

        console.log('populateForm id:', cadastro.id, 'keys:', Object.keys(cadastro || {}));
        document.getElementById('numeroCadastro').value = cadastro.id || '';
        document.getElementById('cadastroId').value = cadastro.id || '';
        document.getElementById('projeto').value = cadastro.projeto || 'COPA DO POVO';
        document.getElementById('nucleo').value = cadastro.nucleo || '';

        for (const sectionKey in cadastro) {
            if (!cadastro[sectionKey] || typeof cadastro[sectionKey] !== 'object') continue;

            for (const fieldKey in cadastro[sectionKey]) {
                const fieldValue = cadastro[sectionKey][fieldKey];

                if (fieldKey === 'documentos' && Array.isArray(fieldValue)) {
                    document.querySelectorAll('input[name="documentos[]"]').forEach(el => el.checked = false);
                    fieldValue.forEach(docValue => {
                        const el = document.querySelector(`input[name="documentos[]"][value="${docValue}"]`);
                        if (el) el.checked = true;
                    });
                } else if (fieldKey === 'veiculos' && Array.isArray(fieldValue)) {
                    document.querySelectorAll('input[name="veiculos[]"]').forEach(el => el.checked = false);
                    fieldValue.forEach(v => {
                        const el = document.querySelector(`input[name="veiculos[]"][value="${v}"]`);
                        if (el) el.checked = true;
                    });
                } else {
                    const element = document.querySelector(`[name="${fieldKey}"]`);
                    if (element) {
                        element.value = fieldValue || '';
                    }
                }
            }
        }

        document.getElementById('membros-familia').innerHTML = '';
        if (cadastro.composicao_familiar && Array.isArray(cadastro.composicao_familiar)) {
            cadastro.composicao_familiar.forEach(membro => addMembro(membro));
        }

        document.getElementById('violencia-campos').innerHTML = '';
        if (cadastro.violencia && Array.isArray(cadastro.violencia)) {
            cadastro.violencia.forEach(ocorrencia => addViolencia(ocorrencia));
        }
        const nrEl = document.getElementById('numeroResponsaveis');
        const dr = cadastro.dados_responsaveis;
        if (nrEl && dr && (dr.nomeResponsavel2 || dr.cpfResponsavel2)) {
            nrEl.value = '2';
        }
        setupAllConditionalFields();
        setupUppercaseFields();
    }

    function deletarCadastro(cadastroId) {
        if (!confirm(`Tem a certeza que deseja apagar o registo ${cadastroId}? Esta ação não pode ser desfeita.`)) return;
        const token = localStorage.getItem('authToken');
        if (!token) return logout();
        socket.emit('delete_cadastro', { token, cadastroId });
    }

    function showPage(page) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(`form-section-${page}`);
        if (section) section.classList.add('active');
        currentPage = page;

        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        if (prevButton) prevButton.classList.toggle('d-none', page === 1);
        if (nextButton) nextButton.classList.toggle('d-none', page === totalPages);
    }

    // --- CHARTS ---
    function destroyAllCharts() {
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
    }

    function createPieChart(canvasId, label, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    label,
                    data: values,
                    backgroundColor: ['#007bff', '#dc3545', '#ffc107', '#28a745', '#6f42c1', '#fd7e14', '#20c997', '#6610f2']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    function createAgeDistributionChart(data) {
        const canvasId = 'ageDistributionChart';
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        const idades = data.idades || [];
        const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const labels = bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1] - 1}`);
        const histData = new Array(labels.length).fill(0);

        idades.forEach(idade => {
            if (idade === null) return;
            const binIndex = Math.floor(idade / 10);
            if (binIndex >= 0 && binIndex < histData.length) histData[binIndex]++;
        });

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Número de Pessoas', data: histData, backgroundColor: '#007bff' }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- DYNAMIC FORM ELEMENTS ---
    function addMembro(data = {}) {
        const container = document.getElementById("membros-familia");
        const index = container.children.length;
        const div = document.createElement("div");
        div.className = "membro-familia";

        div.innerHTML = `
            <h4>Membro ${index + 1}</h4>
            <div class="membro-grid">
                <div class="membro-col">
                    <label>Nome:</label>
                    <input type="text" name="nome" placeholder="Nome Completo" value="${data.nome || ''}">
                    
                    <label>Idade (Anos completos):</label>
                    <input type="number" name="idade" placeholder="Idade" value="${data.idade || ''}">
                    
                    <label>Gênero:</label>
                    <select name="genero">
                        <option value="">Selecione</option>
                        <option value="1" ${data.genero == '1' ? 'selected' : ''}>1 - FEMININO</option>
                        <option value="2" ${data.genero == '2' ? 'selected' : ''}>2 - MASCULINO</option>
                        <option value="3" ${data.genero == '3' ? 'selected' : ''}>3 - NÃO BINARIO</option>
                        <option value="99" ${data.genero == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Posição Familiar:</label>
                    <select name="posicao">
                        <option value="">Selecione</option>
                        <option value="1" ${data.posicao == '1' ? 'selected' : ''}>1 - RESPONSAVEL</option>
                        <option value="2" ${data.posicao == '2' ? 'selected' : ''}>2 - CÔNJUGE</option>
                        <option value="3" ${data.posicao == '3' ? 'selected' : ''}>3 - FILHO(A)</option>
                        <option value="4" ${data.posicao == '4' ? 'selected' : ''}>4 - ENTEADO(A)</option>
                        <option value="5" ${data.posicao == '5' ? 'selected' : ''}>5 - PAI/MÃE</option>
                        <option value="6" ${data.posicao == '6' ? 'selected' : ''}>6 - AVÔ/AVÓ</option>
                        <option value="7" ${data.posicao == '7' ? 'selected' : ''}>7 - IRMÃO(A)</option>
                        <option value="8" ${data.posicao == '8' ? 'selected' : ''}>8 - CUNHADO(A)</option>
                        <option value="9" ${data.posicao == '9' ? 'selected' : ''}>9 - SOGRO(A)</option>
                        <option value="10" ${data.posicao == '10' ? 'selected' : ''}>10 - GENRO/NORA</option>
                        <option value="11" ${data.posicao == '11' ? 'selected' : ''}>11 - NETO(A)</option>
                        <option value="12" ${data.posicao == '12' ? 'selected' : ''}>12 - OUTROS PARENTES</option>
                        <option value="13" ${data.posicao == '13' ? 'selected' : ''}>13 - PADRASTO/MADRASTA</option>
                        <option value="14" ${data.posicao == '14' ? 'selected' : ''}>14 - AGREGADO(A)</option>
                        <option value="15" ${data.posicao == '15' ? 'selected' : ''}>15 - OUTROS</option>
                        <option value="99" ${data.posicao == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Situação Ocupacional:</label>
                    <select name="situacaoOcupacional">
                        <option value="">Selecione</option>
                        <option value="1" ${data.situacaoOcupacional == '1' ? 'selected' : ''}>1 - DESEMPREGADO</option>
                        <option value="2" ${data.situacaoOcupacional == '2' ? 'selected' : ''}>2 - ASSALARIADO C/ REG.</option>
                        <option value="3" ${data.situacaoOcupacional == '3' ? 'selected' : ''}>3 - ASSALARIADO S/ REG.</option>
                        <option value="4" ${data.situacaoOcupacional == '4' ? 'selected' : ''}>4 - TRABALHADOR TEMPORÁRIO OU EVENTUAL (BICO)</option>
                        <option value="5" ${data.situacaoOcupacional == '5' ? 'selected' : ''}>5 - AUTÔNOMO</option>
                        <option value="6" ${data.situacaoOcupacional == '6' ? 'selected' : ''}>6 - FUNCIONÁRIO PÚBLICO</option>
                        <option value="7" ${data.situacaoOcupacional == '7' ? 'selected' : ''}>7 - EMPREGADOR</option>
                        <option value="8" ${data.situacaoOcupacional == '8' ? 'selected' : ''}>8 - ESTUDANTE/ESTÁGIARIO</option>
                        <option value="9" ${data.situacaoOcupacional == '9' ? 'selected' : ''}>9 - AFASTADO TEMPORARIAMENTE POR DOENÇA</option>
                        <option value="10" ${data.situacaoOcupacional == '10' ? 'selected' : ''}>10 - APOSENTADO</option>
                        <option value="11" ${data.situacaoOcupacional == '11' ? 'selected' : ''}>11 - PENSIONISTA</option>
                        <option value="12" ${data.situacaoOcupacional == '12' ? 'selected' : ''}>12 - INCAPAZ PARA O TRABALHO</option>
                        <option value="13" ${data.situacaoOcupacional == '13' ? 'selected' : ''}>13 - BENEFICIÁRIO(BPC-LOAS)</option>
                        <option value="14" ${data.situacaoOcupacional == '14' ? 'selected' : ''}>14 - DONA DE CASA</option>
                        <option value="15" ${data.situacaoOcupacional == '15' ? 'selected' : ''}>15 - MENOR DE 10 ANOS, NÃO TRAB./ESTUDA</option>
                        <option value="16" ${data.situacaoOcupacional == '16' ? 'selected' : ''}>16 - NÃO DESEJA TRABALHAR</option>
                        <option value="99" ${data.situacaoOcupacional == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Estado Civil:</label>
                    <select name="estadoCivil">
                        <option value="">Selecione</option>
                        <option value="1" ${data.estadoCivil == '1' ? 'selected' : ''}>1 - SOLTEIRO</option>
                        <option value="2" ${data.estadoCivil == '2' ? 'selected' : ''}>2 - CASADO(A)</option>
                        <option value="3" ${data.estadoCivil == '3' ? 'selected' : ''}>3 - DIVORC./DESQ.</option>
                        <option value="4" ${data.estadoCivil == '4' ? 'selected' : ''}>4 - UNIÃO ESTÁVEL</option>
                        <option value="5" ${data.estadoCivil == '5' ? 'selected' : ''}>5 - SEPARADO(A)</option>
                        <option value="6" ${data.estadoCivil == '6' ? 'selected' : ''}>6 - SEPARADO(A) E VIVE EM RELAÇÃO CONSENSUAL</option>
                        <option value="7" ${data.estadoCivil == '7' ? 'selected' : ''}>7 - VIÚVO(A)</option>
                        <option value="8" ${data.estadoCivil == '8' ? 'selected' : ''}>8 - VIVE JUNTO</option>
                        <option value="99" ${data.estadoCivil == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>
                    
                    <label>Grupo Étnico Racial:</label>
                    <select name="grupoEtnico">
                        <option value="">Selecione</option>
                        <option value="1" ${data.grupoEtnico == '1' ? 'selected' : ''}>1 - BRANCA</option>
                        <option value="2" ${data.grupoEtnico == '2' ? 'selected' : ''}>2 - PRETA</option>
                        <option value="3" ${data.grupoEtnico == '3' ? 'selected' : ''}>3 - AMARELA</option>
                        <option value="4" ${data.grupoEtnico == '4' ? 'selected' : ''}>4 - PARDA</option>
                        <option value="5" ${data.grupoEtnico == '5' ? 'selected' : ''}>5 - INDÍGENAS</option>
                        <option value="99" ${data.grupoEtnico == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>PNE:</label>
                    <select name="pne">
                        <option value="">Selecione</option>
                        <option value="1" ${data.pne == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.pne == '2' ? 'selected' : ''}>2 - SIM, VISUAL</option>
                        <option value="3" ${data.pne == '3' ? 'selected' : ''}>3 - SIM, AUDITIVA</option>
                        <option value="4" ${data.pne == '4' ? 'selected' : ''}>4 - SIM, INTELECTUAL</option>
                        <option value="5" ${data.pne == '5' ? 'selected' : ''}>5 - SIM, FÍSICA</option>
                        <option value="6" ${data.pne == '6' ? 'selected' : ''}>6 - SIM, MULTIPLAS</option>
                        <option value="7" ${data.pne == '7' ? 'selected' : ''}>7 - SIM, NANISMO</option>
                        <option value="99" ${data.pne == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>CID:</label>
                    <input type="text" name="cid" placeholder="Código CID" value="${data.cid || ''}">
                </div>
                <div class="membro-col">
                    <label>Portador do espectro autista?</label>
                    <select name="espectroAutista">
                        <option value="">Selecione</option>
                        <option value="1" ${data.espectroAutista == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.espectroAutista == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.espectroAutista == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Tem cancro ou doença degenerativa?</label>
                    <select name="temCancer">
                        <option value="">Selecione</option>
                        <option value="1" ${data.temCancer == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.temCancer == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.temCancer == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>
                    
                    <label>É gestante?</label>
                    <select name="gestante">
                        <option value="">Selecione</option>
                        <option value="1" ${data.gestante == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.gestante == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.gestante == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Profissão:</label>
                    <input type="text" name="profissao" placeholder="Profissão" value="${data.profissao || ''}">

                    <label>Frequenta a escola?</label>
                    <select name="frequentaEscola">
                        <option value="">Selecione</option>
                        <option value="1" ${data.frequentaEscola == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.frequentaEscola == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.frequentaEscola == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Curso que frequenta:</label>
                    <select name="cursoQueFrequenta">
                        <option value="">Selecione</option>
                        <option value="1" ${data.cursoQueFrequenta == '1' ? 'selected' : ''}>1 - CRECHE</option>
                        <option value="2" ${data.cursoQueFrequenta == '2' ? 'selected' : ''}>2 - EMEI</option>
                        <option value="3" ${data.cursoQueFrequenta == '3' ? 'selected' : ''}>3 - 1º ANO ENS. FUND.</option>
                        <option value="4" ${data.cursoQueFrequenta == '4' ? 'selected' : ''}>4 - 2º ANO ENS. FUND.</option>
                        <option value="5" ${data.cursoQueFrequenta == '5' ? 'selected' : ''}>5 - 3º ANO ENS. FUND.</option>
                        <option value="6" ${data.cursoQueFrequenta == '6' ? 'selected' : ''}>6 - 4º ANO ENS. FUND.</option>
                        <option value="7" ${data.cursoQueFrequenta == '7' ? 'selected' : ''}>7 - 5º ANO ENS. FUND.</option>
                        <option value="8" ${data.cursoQueFrequenta == '8' ? 'selected' : ''}>8 - 6º ANO ENS. FUND.</option>
                        <option value="9" ${data.cursoQueFrequenta == '9' ? 'selected' : ''}>9 - 7º ANO ENS. FUND.</option>
                        <option value="10" ${data.cursoQueFrequenta == '10' ? 'selected' : ''}>10 - 8º ANO ENS. FUND.</option>
                        <option value="11" ${data.cursoQueFrequenta == '11' ? 'selected' : ''}>11 - 9º ANO ENS. FUND.</option>
                        <option value="12" ${data.cursoQueFrequenta == '12' ? 'selected' : ''}>12 - SUPLETIVO FUND.</option>
                        <option value="13" ${data.cursoQueFrequenta == '13' ? 'selected' : ''}>13 - 1ª SÉRIE ENS. MÉD.</option>
                        <option value="14" ${data.cursoQueFrequenta == '14' ? 'selected' : ''}>14 - 2ª SÉRIE ENS. MÉD.</option>
                        <option value="15" ${data.cursoQueFrequenta == '15' ? 'selected' : ''}>15 - 3ª SÉRIE ENS. MÉD.</option>
                        <option value="16" ${data.cursoQueFrequenta == '16' ? 'selected' : ''}>16 - SUPLETIVO ENS. MÉD.</option>
                        <option value="17" ${data.cursoQueFrequenta == '17' ? 'selected' : ''}>17 - CURSO TÉCNICO</option>
                        <option value="18" ${data.cursoQueFrequenta == '18' ? 'selected' : ''}>18 - NÍVEL SUPERIOR</option>
                        <option value="19" ${data.cursoQueFrequenta == '19' ? 'selected' : ''}>19 - MESTRADO</option>
                        <option value="20" ${data.cursoQueFrequenta == '20' ? 'selected' : ''}>20 - DOUTORADO</option>
                        <option value="21" ${data.cursoQueFrequenta == '21' ? 'selected' : ''}>21 - NÃO SE APLICA</option>
                        <option value="99" ${data.cursoQueFrequenta == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Estudou até?</label>
                    <select name="estudouAte">
                        <option value="">Selecione</option>
                        <option value="1" ${data.estudouAte == '1' ? 'selected' : ''}>1 - SEM ESCOLARIZAÇÃO</option>
                        <option value="2" ${data.estudouAte == '2' ? 'selected' : ''}>2 - EMEI</option>
                        <option value="3" ${data.estudouAte == '3' ? 'selected' : ''}>3 - 1º ANO ENS. FUND.</option>
                        <option value="4" ${data.estudouAte == '4' ? 'selected' : ''}>4 - 2º ANO ENS. FUND.</option>
                        <option value="5" ${data.estudouAte == '5' ? 'selected' : ''}>5 - 3º ANO ENS. FUND.</option>
                        <option value="6" ${data.estudouAte == '6' ? 'selected' : ''}>6 - 4º ANO ENS. FUND.</option>
                        <option value="7" ${data.estudouAte == '7' ? 'selected' : ''}>7 - 5º ANO ENS. FUND.</option>
                        <option value="8" ${data.estudouAte == '8' ? 'selected' : ''}>8 - 6º ANO ENS. FUND.</option>
                        <option value="9" ${data.estudouAte == '9' ? 'selected' : ''}>9 - 7º ANO ENS. FUND.</option>
                        <option value="10" ${data.estudouAte == '10' ? 'selected' : ''}>10 - 8º ANO ENS. FUND.</option>
                        <option value="11" ${data.estudouAte == '11' ? 'selected' : ''}>11 - 9º ANO ENS. FUND.</option>
                        <option value="12" ${data.estudouAte == '12' ? 'selected' : ''}>12 - SUPLETIVO FUND.</option>
                        <option value="13" ${data.estudouAte == '13' ? 'selected' : ''}>13 - 1ª SÉRIE ENS. MÉD.</option>
                        <option value="14" ${data.estudouAte == '14' ? 'selected' : ''}>14 - 2ª SÉRIE ENS. MÉD.</option>
                        <option value="15" ${data.estudouAte == '15' ? 'selected' : ''}>15 - 3ª SÉRIE ENS. MÉD.</option>
                        <option value="16" ${data.estudouAte == '16' ? 'selected' : ''}>16 - SUPLETIVO ENS. MÉD.</option>
                        <option value="17" ${data.estudouAte == '17' ? 'selected' : ''}>17 - NÍVEL SUPERIOR</option>
                        <option value="18" ${data.estudouAte == '18' ? 'selected' : ''}>18 - MESTRADO</option>
                        <option value="19" ${data.estudouAte == '19' ? 'selected' : ''}>19 - DOUTORADO</option>
                        <option value="99" ${data.estudouAte == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Tem rendimento principal?</label>
                    <select name="temRendaPropria">
                        <option value="">Selecione</option>
                        <option value="1" ${data.temRendaPropria == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.temRendaPropria == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.temRendaPropria == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Valor do rendimento principal:</label>
                    <input type="text" class="monetary-input" name="rendaPropriaValor" value="${data.rendaPropriaValor || ''}">

                    <label>Existe outra fonte de rendimento?</label>
                    <select name="haOutraFonte">
                        <option value="">Selecione</option>
                        <option value="1" ${data.haOutraFonte == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.haOutraFonte == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.haOutraFonte == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Valor de outra fonte de rendimento:</label>
                    <input type="text" class="monetary-input" name="outraRendaValor" value="${data.outraRendaValor || ''}">

                    <label>Tem benefícios?</label>
                    <select name="temBeneficios">
                        <option value="">Selecione</option>
                        <option value="1" ${data.temBeneficios == '1' ? 'selected' : ''}>1 - NÃO</option>
                        <option value="2" ${data.temBeneficios == '2' ? 'selected' : ''}>2 - SIM</option>
                        <option value="99" ${data.temBeneficios == '99' ? 'selected' : ''}>99 - SEM INF.</option>
                    </select>

                    <label>Valor do benefício:</label>
                    <input type="text" class="monetary-input" name="beneficioValor" value="${data.beneficioValor || ''}">
                </div>
            </div>
            <button type="button" class="remove-membro">Remover Membro</button>
            <hr>
        `;
        container.appendChild(div);

        div.querySelectorAll('.monetary-input').forEach(el => {
            Inputmask('currency', {
                alias: 'numeric',
                groupSeparator: '.',
                radixPoint: ',',
                digits: 2,
                autoGroup: true,
                prefix: 'R$ ',
                rightAlign: false,
                unmaskAsNumber: false
            }).mask(el);
        });

        div.querySelector('.remove-membro').addEventListener('click', () => {
            div.remove();
            saveCurrentSection(true);
        });
    }

    function addViolencia(data = {}) {
        const container = document.getElementById("violencia-campos");
        const index = container.children.length;
        const div = document.createElement("div");
        div.className = "violencia-ocorrencia";
        div.innerHTML = `
            <h4>Ocorrência ${index + 1}</h4>
            <input type="number" name="idade" placeholder="Idade na ocorrência" value="${data.idade || ''}">
            <select name="motivo">
                <option value="">Selecione o Motivo...</option>
                <option value="DOENCA" ${data.motivo === 'DOENCA' ? 'selected' : ''}>DOENÇA</option>
                <option value="COVID" ${data.motivo === 'COVID' ? 'selected' : ''}>COVID</option>
                <option value="ACIDENTE" ${data.motivo === 'ACIDENTE' ? 'selected' : ''}>ACIDENTE</option>
                <option value="VIOLENCIA" ${data.motivo === 'VIOLENCIA' ? 'selected' : ''}>VIOLÊNCIA</option>
                <option value="OUTRO" ${data.motivo === 'OUTRO' ? 'selected' : ''}>OUTRO</option>
            </select>
            <input type="text" name="outroMotivo" placeholder="Especifique outro motivo" value="${data.outroMotivo || ''}">
            <input type="number" name="anoOcorrido" placeholder="Ano da ocorrência" value="${data.anoOcorrido || ''}">
            <button type="button" class="remove-violencia">Remover</button>
        `;
        container.appendChild(div);
        div.querySelector('.remove-violencia').addEventListener('click', () => { div.remove(); saveCurrentSection(true); });
    }

    // --- INITIAL SETUP FUNCTIONS ---
    function setupAllCpfValidation() {
        const cpfFields = ['cpfResponsavel1', 'cpfTutorResponsavel1', 'cpfResponsavel2', 'cpfTutorResponsavel2', 'cnpjCpfFontePagadoraResponsavel1', 'cnpjCpfFontePagadoraResponsavel2'];

        cpfFields.forEach(fieldId => {
            const cpfInput = document.getElementById(fieldId);
            const errorSpan = document.getElementById(`${fieldId}-error`);
            if (cpfInput && errorSpan) {
                const validate = () => {
                    const cpf = cpfInput.value;
                    if (cpf && !validateCPF(cpf)) {
                        errorSpan.textContent = 'CPF/CNPJ inválido.';
                        errorSpan.style.display = 'block';
                    } else {
                        errorSpan.style.display = 'none';
                    }
                };
                cpfInput.addEventListener('blur', validate);
                cpfInput.addEventListener('input', validate);
            }
        });
    }

    function setupAllConditionalFields() {
        const conditionalFieldsConfig = [
            { controller: 'principalMeioTransporte', targets: ['outraFormaTransporte'], type: 'enable', on: 'OUTRO' },
            { controller: 'paisResponsavel1', targets: ['outroPaisResponsavel1'], type: 'enable', on: 'Outro' },
            { controller: 'paisResponsavel2', targets: ['outroPaisResponsavel2'], type: 'enable', on: 'Outro' },
            { controller: 'praticaAtividadeFisica', targets: ['tipoAtividadeFisica', 'tipoAtividadeFisica2', 'tipoAtividadeFisica3', 'tipoAtividadeFisica4'], type: 'enable', on: 'Sim' },
            { controller: 'outros', targets: ['outrosEspecifique'], type: 'enable', on: 'Sim' },
            { controller: 'exerceAtividadeEconomicaResidencia', targets: ['qualAtividade'], type: 'enable', on: '2' },
            { controller: 'agriculturaSubsistencia', targets: ['representaAlimentacaoFamilia'], type: 'enable', on: '2' },
            { controller: 'moraCoabitacao', targets: ['voluntario'], type: 'enable', on: '2' },
            { controller: 'deslocamentoInvoluntarioObras', targets: ['deslocamentoInvoluntarioObrasEspecificar'], type: 'enable', on: '2' },
            { controller: 'provenienteAreaConflitoFundiarioUrbano', targets: ['especificar'], type: 'enable', on: '2' },
            { controller: 'possuiVeiculoProprioMoradia', targets: ['moto', 'carro', 'caminhoneteSUV', 'caminhao'], type: 'enable', on: 'Sim' },
            { controller: 'separacaoMaterialReciclavel', targets: ['coletaMaterialReciclavel'], type: 'enable', on: 'Sim' },
        ];

        conditionalFieldsConfig.forEach(config => {
            const controllerEl = document.getElementById(config.controller);
            if (!controllerEl) return;

            const update = () => {
                const conditionMet = controllerEl.value === config.on;
                config.targets.forEach(targetId => {
                    const targetEl = document.getElementById(targetId);
                    if (!targetEl) return;
                    targetEl.disabled = !conditionMet;
                    if (!conditionMet) {
                        if (targetEl.type === 'checkbox' || targetEl.type === 'radio') targetEl.checked = false;
                        else targetEl.value = '';
                    }
                });
            };
            controllerEl.addEventListener('change', update);
            update();
        });

        const numeroResponsaveisEl = document.getElementById('numeroResponsaveis');
        const responsavel2Container = document.getElementById('responsavel2-container');
        if (numeroResponsaveisEl && responsavel2Container) {
            const updateResponsaveis = () => {
                responsavel2Container.style.display = numeroResponsaveisEl.value === '2' ? '' : 'none';
            };
            numeroResponsaveisEl.addEventListener('change', updateResponsaveis);
            updateResponsaveis();
        }

        ['1', '2'].forEach(num => {
            const menor18El = document.getElementById(`preencherSeMenor18Responsavel${num}`);
            const tutorFieldsEl = document.getElementById(`tutor-fields-${num}`);
            if (menor18El && tutorFieldsEl) {
                const updateTutor = () => {
                    const show = menor18El.value === 'Sim';
                    tutorFieldsEl.style.display = show ? '' : 'none';
                    tutorFieldsEl.querySelectorAll('input').forEach(input => input.disabled = !show);
                };
                menor18El.addEventListener('change', updateTutor);
                updateTutor();
            }
        });

        ['1', '2'].forEach(num => {
            const tipoRendaEl = document.getElementById(`tipoRendaResponsavel${num}`);
            const comprovadaEl = document.getElementById(`renda-comprovada-fields-${num}`);
            const declaradaEl = document.getElementById(`renda-declarada-fields-${num}`);

            if (tipoRendaEl && comprovadaEl && declaradaEl) {
                const updateRenda = () => {
                    const selectedType = tipoRendaEl.value;
                    comprovadaEl.style.display = selectedType === 'RENDA COMPROVADA' ? '' : 'none';
                    declaradaEl.style.display = selectedType === 'RENDA DECLARADA' ? '' : 'none';
                };
                tipoRendaEl.addEventListener('change', updateRenda);
                updateRenda();
            }
        });
    }

    function populateUfDropdowns() {
        const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
        document.querySelectorAll('.uf-select').forEach(select => {
            if (select.options.length <= 1) {
                ufs.forEach(uf => {
                    select.add(new Option(uf, uf));
                });
            }
        });
    }

    function setupUppercaseFields() {
        const fieldsToUppercase = [
            'projeto', 'cadastrador', 'naturalidadeResponsavel1', 'outroPaisResponsavel1',
            'orgaoExpedidorResponsavel1', 'rendaDeclaradaResponsavel1', 'nomeTutorResponsavel1',
            'nomeResponsavel1', 'nomeResponsavel2', 'naturalidadeResponsavel2', 'outroPaisResponsavel2',
            'orgaoExpedidorResponsavel2', 'nomeTutorResponsavel2', 'endereco', 'complemento', 'cidade',
            'tipoAtividadeFisica', 'tipoAtividadeFisica2', 'tipoAtividadeFisica3', 'tipoAtividadeFisica4',
            'outrosEspecifique', 'qualAtividade', 'deslocamentoInvoluntarioObrasEspecificar', 'especificar',
            'outraFormaTransporte', 'coletaMaterialReciclavel',
            'outroMotivo', 'observacoes'
        ];

        fieldsToUppercase.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (!el.classList.contains('uppercase-input')) {
                    el.classList.add('uppercase-input');
                    el.addEventListener('input', (e) => {
                        e.target.value = e.target.value.toUpperCase();
                    });
                }
            }
        });
    }

    function applyInputMasks() {
        Inputmask("99999-999").mask(document.getElementById('cep'));
        ['cpfResponsavel1', 'cpfTutorResponsavel1', 'cpfResponsavel2', 'cpfTutorResponsavel2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) Inputmask("999.999.999-99").mask(el);
        });
        ['cnpjCpfFontePagadoraResponsavel1', 'cnpjCpfFontePagadoraResponsavel2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) Inputmask(["999.999.999-99", "99.999.999/9999-99"], { keepStatic: true }).mask(el);
        });

        document.querySelectorAll('.monetary-input').forEach(el => {
            Inputmask('currency', {
                alias: 'numeric',
                groupSeparator: '.',
                radixPoint: ',',
                digits: 2,
                autoGroup: true,
                prefix: 'R$ ',
                rightAlign: false,
                unmaskAsNumber: false
            }).mask(el);
        });
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.getElementById('tabs').addEventListener('click', e => {
            if (e.target.matches('.tab-button')) {
                openTab(e.target.dataset.tabName);
            }
        });

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(performDashboardSearch, 300));
        }

        const novoCadastroBtn = document.getElementById('novo-cadastro-button');
        if (novoCadastroBtn) {
            novoCadastroBtn.addEventListener('click', novoCadastro);
        }

        // Controles de paginação do dashboard
        const dashboardPrev = document.getElementById('dashboard-prev');
        if (dashboardPrev) {
            dashboardPrev.addEventListener('click', () => {
                if (dashboardPage > 1) {
                    dashboardPage -= 1;
                    emitGetCadastros();
                }
            });
        }

        const dashboardNext = document.getElementById('dashboard-next');
        if (dashboardNext) {
            dashboardNext.addEventListener('click', () => {
                dashboardPage += 1;
                emitGetCadastros();
            });
        }

        const listaCadastros = document.getElementById('lista-cadastros');
        if (listaCadastros) {
            listaCadastros.addEventListener('click', e => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;
                const id = button.dataset.id;
                if (button.dataset.action === 'view-edit') carregarCadastro(id);
                else if (button.dataset.action === 'delete') deletarCadastro(id);
            });
        }

        const userManagementContent = document.getElementById('user-management-content');
        if (userManagementContent) {
            userManagementContent.addEventListener('click', handleUserManagementActions);
        }

        const userModalForm = document.getElementById('user-modal-form');
        if (userModalForm) userModalForm.addEventListener('submit', handleUserFormSubmit);

        const userModalClose = document.getElementById('user-modal-close');
        if (userModalClose) userModalClose.addEventListener('click', closeUserModal);

        const userModalCancel = document.getElementById('user-modal-cancel');
        if (userModalCancel) userModalCancel.addEventListener('click', closeUserModal);

        const nextButton = document.getElementById('next-button');
        if (nextButton) nextButton.addEventListener('click', () => {
            saveCurrentSection(true);
            if (currentPage < totalPages) showPage(currentPage + 1);
        });

        const prevButton = document.getElementById('prev-button');
        if (prevButton) prevButton.addEventListener('click', () => {
            saveCurrentSection(true);
            if (currentPage > 1) showPage(currentPage - 1);
        });

        const finalizarCadastroBtn = document.getElementById('finalizar-cadastro');
        if (finalizarCadastroBtn) finalizarCadastroBtn.addEventListener('click', () => {
            saveCurrentSection(true);
            openTab('dashboard');
        });

        const addMembroBtn = document.getElementById('add-membro');
        if (addMembroBtn) addMembroBtn.addEventListener('click', () => addMembro());

        const addViolenciaBtn = document.getElementById('add-violencia');
        if (addViolenciaBtn) addViolenciaBtn.addEventListener('click', () => addViolencia());

        const cadastroContent = document.getElementById('cadastro-content');
        if (cadastroContent) {
            cadastroContent.addEventListener('input', e => {
                if (e.target.closest('.form-section')) debouncedSave();
            });
        }

        document.getElementById('logout-button').addEventListener('click', logout);

        const estatisticasContent = document.getElementById('estatisticas-content');
        if (estatisticasContent) {
            estatisticasContent.addEventListener('click', function (e) {
                if (e.target.classList.contains('export-button')) {
                    const target = e.target.dataset.target;
                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        logout();
                        return;
                    }
                    const exportUrl = `/api/export/${target}?token=${token}`;
                    window.location.href = exportUrl;
                }
            });
        }

        // Adiciona event listener para o botão 'Salvar Seção'
        document.querySelectorAll('.save-section-button').forEach(btn => {
            btn.addEventListener('click', function () {
                saveCurrentSection(true);
            });
        });
    }

    // --- SOCKET.IO LISTENERS ---
    function setupSocketListeners() {
        socket.on('connect', () => console.log('Conectado ao servidor via Socket.IO'));
        socket.on('connect_error', (err) => console.error('Erro de conexão Socket.IO:', err));
        socket.on('disconnect', () => showMessage('Desligado do servidor.', 'error'));
        socket.on('dashboard_update', displayCadastroList);
        socket.on('dashboard_error', (data) => showMessage(`Erro no dashboard: ${data.message}`, 'error'));

        socket.on('cadastro_data', (data) => {
            if (data.status === 'success') {
                openTab('cadastro');
                currentPage = 1;
                showPage(1);
                console.log('cadastro_data payload', data);
                populateForm(data.cadastro);
            } else {
                showMessage(data.message, 'error');
            }
        });

        socket.on('save_success', (data) => showMessage(data.message, 'success', 2000));
        socket.on('save_error', (data) => showMessage(`Erro ao guardar: ${data.message}`, 'error'));

        socket.on('auth_error', async (data) => {
            if (window.location.pathname.startsWith('/questionario')) {
                // Tenta recuperar a sessão via cookie antes de redirecionar
                try {
                    console.log("Socket auth error. Tentando recuperar sessão via /api/me...");
                    const response = await fetch('/api/me', { credentials: 'include' });
                    if (response.ok) {
                        const resData = await response.json();
                        if (resData.status === 'success') {
                            console.log("Sessão recuperada com sucesso via /api/me.");
                            localStorage.setItem('authToken', resData.token);
                            localStorage.setItem('userData', JSON.stringify(resData.user));

                            if (socket) {
                                socket.auth.token = resData.token;
                                socket.disconnect().connect();
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Falha ao tentar recuperar sessão:", e);
                }

                console.error(`Erro de autenticação no questionário: ${data.message}. Redirecionando para a landing page.`);
                // logout(); // Evita logout imediato se falhar, apenas redireciona se realmente não conseguir recuperar
                window.location.href = '/';
            } else {
                showMessage(`Erro de permissão: ${data.message}. A redirecionar para o login...`, 'error');
                setTimeout(logout, 3000);
            }
        });

        socket.on('delete_error', (data) => showMessage(`Erro ao apagar: ${data.message}`, 'error'));

        socket.on('statistics_update', (data) => {
            if (data.status === 'success') {
                destroyAllCharts();

                const translatedGender = translateDataKeys(data.stats.gender_distribution, GENDER_MAP);
                const translatedHousing = translateDataKeys(data.stats.housing_type, HOUSING_TYPE_MAP);
                const translatedOccupation = translateDataKeys(data.stats.occupational_status, OCCUPATIONAL_STATUS_MAP);

                createAgeDistributionChart(data.stats.age_distribution);
                createPieChart('incomeStatusChart', 'Situação de Renda', data.stats.income_status);
                createPieChart('situacaoOcupacionalChart', 'Situação Ocupacional', translatedOccupation);
                createPieChart('genderDistributionChart', 'Distribuição por Gênero', translatedGender);
                createPieChart('moradiaTypeChart', 'Tipo de Moradia', translatedHousing);
            } else {
                showMessage('Erro ao carregar estatísticas.', 'error');
            }
        });
    }

    // --- APP ENTRY POINT ---
    handleAuth();
});

