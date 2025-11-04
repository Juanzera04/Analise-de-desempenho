// Variáveis globais para armazenar os dados brutos e agregados
let clientData = [];       
let collaboratorData = []; 
let taskData = [];         
let teamData = [];         
let colaboradorBaseComparacao = null;
let time1Colaborador = null;
let time2Colaborador = null;
let time1Filtrados = [];
let time2Filtrados = [];
let fileColaborador = null;
let fileCliente = null;
let fileTarefa = null;

document.getElementById('file-colaborador').addEventListener('change', (e) => {
    fileColaborador = e.target.files[0];
    checkAllFiles();
});
document.getElementById('file-cliente').addEventListener('change', (e) => {
    fileCliente = e.target.files[0];
    checkAllFiles();
});
document.getElementById('file-tarefa').addEventListener('change', (e) => {
    fileTarefa = e.target.files[0];
    checkAllFiles();
});

function checkAllFiles() {
    const btn = document.getElementById('btn-processar');
    btn.disabled = !(fileColaborador && fileCliente && fileTarefa);
}

document.getElementById('btn-processar').addEventListener('click', () => {
    if (fileColaborador && fileCliente && fileTarefa) {
        carregarArquivosLocais(fileCliente, fileColaborador, fileTarefa);
    }
});

function carregarArquivosLocais(fileCliente, fileColaborador, fileTarefa) {
    loadAllCSVs(fileCliente, fileColaborador, fileTarefa);
}


// ** Mapeamento Hexadecimal Direto no JS **
const roleStripColorMap = {
    'Analista': '#053e89',    // Azul
    'Coordenador(a)': '#800020', // Verde
    'Gerente': '#800020',     // Laranja
    'Auxiliar': '#6d9fe0',     // Roxo
    'Assistente': '#2e69b6',  // Teal/Ciano
    'Outros': '#444444',      // Cinza escuro para cargos não mapeados
};

// ----------------------------------------------------------------------
// FUNÇÕES DE UTILIDADE E PROCESSAMENTO DE DADOS
// ----------------------------------------------------------------------

/**
 * Converte strings monetárias ou numéricas para float.
 */
function parseCurrency(str) {
    if (typeof str !== 'string') return parseFloat(str) || 0;
    return parseFloat(
        str.replace('R$', '').replace(/\s/g, '').replace(/\xa0/g, '')
            .replace(/\./g, '').replace(',', '.')
            .trim()
    ) || 0;
}

/**
 * Função utilitária para calcular uma cor mais escura.
 * Retorna uma cor HEX mais escura em 'percent' (ex: 0.8 para 20% mais escuro).
 */
function darkenColor(hex, percent) {
    const color = hex.startsWith('#') ? hex.slice(1) : hex;
    
    if (color.length !== 6) return hex; 

    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    r = Math.floor(r * percent);
    g = Math.floor(g * percent);
    b = Math.floor(b * percent);

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    const rr = r.toString(16).padStart(2, '0');
    const gg = g.toString(16).padStart(2, '0');
    const bb = b.toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
}

/**
 * Abre o modal de comparação com filtros verticais
 */
function abrirCompararSidebar(memberId) {
    const member = teamData.find(m => m.ID === memberId);
    if (!member) return;

    // Define como time 1 inicial
    time1Colaborador = member;
    time1Filtrados = teamData; // Inicialmente todos disponíveis
    time2Filtrados = teamData; // Inicialmente todos disponíveis
    
    // Abre o modal de comparação
    abrirModalComparacao();
    
    // Preenche todos os filtros
    preencherTodosFiltrosComparacao();
    
    // Atualiza o time 1 com o colaborador selecionado
    selecionarColaboradorTime(1, memberId);
}

/**
 * Abre o modal de comparação
 */
function abrirModalComparacao() {
    const modal = document.getElementById('comparar-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Fecha o modal de comparação
 */
function fecharModalComparacao() {
    const modal = document.getElementById('comparar-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reseta os times
    time1Colaborador = null;
    time2Colaborador = null;
    time1Filtrados = [];
    time2Filtrados = [];
}

/**
 * Preenche todos os filtros de comparação
 */
function preencherTodosFiltrosComparacao() {
    // Preenche filtros para ambos os times
    preencherFiltrosTime(1);
    preencherFiltrosTime(2);
    
    // Preenche lista de colaboradores baseado nos filtros iniciais
    atualizarListaColaboradoresTime(1);
    atualizarListaColaboradoresTime(2);
}

/**
 * Preenche os filtros de um time específico
 */
function preencherFiltrosTime(timeNum) {
    const unidades = new Set();
    const departamentos = new Set();
    const cargos = new Set();
    const competencias = new Set();

    // Coleta dados de todos os colaboradores
    teamData.forEach(member => {
        if (member.UNIDADE && member.UNIDADE !== 'Não Definida') unidades.add(member.UNIDADE);
        if (member.DEPARTAMENTO && member.DEPARTAMENTO !== 'Não Definido') departamentos.add(member.DEPARTAMENTO);
        if (member.CARGO) cargos.add(member.CARGO);
        if (member.COMPETENCIAS && member.COMPETENCIAS.length > 0) {
            member.COMPETENCIAS.forEach(comp => competencias.add(comp));
        }
    });

    // Preenche os selects
    preencherSelect(`filtro-unidade-${timeNum}`, unidades);
    preencherSelect(`filtro-departamento-${timeNum}`, departamentos);
    preencherSelect(`filtro-cargo-${timeNum}`, cargos);
    preencherSelect(`filtro-competencia-${timeNum}`, competencias);
}

/**
 * Preenche um select com opções
 */
function preencherSelect(selectId, optionsSet) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Limpa options existentes (mantendo o primeiro)
    while (select.options.length > 1) select.remove(1);
    
    // Adiciona novas opções
    Array.from(optionsSet).sort().forEach(option => {
        select.add(new Option(option, option));
    });
}

/**
 * Aplica filtro a um time específico
 */
function filtrarTime(timeNum, tipoFiltro) {
    const filtroUnidade = document.getElementById(`filtro-unidade-${timeNum}`).value;
    const filtroDepartamento = document.getElementById(`filtro-departamento-${timeNum}`).value;
    const filtroCargo = document.getElementById(`filtro-cargo-${timeNum}`).value;
    const filtroCompetencia = document.getElementById(`filtro-competencia-${timeNum}`).value;
    
    // Filtra os colaboradores
    let colaboradoresFiltrados = teamData.filter(member => {
        const matchesUnidade = !filtroUnidade || member.UNIDADE === filtroUnidade;
        const matchesDepto = !filtroDepartamento || member.DEPARTAMENTO === filtroDepartamento;
        const matchesCargo = !filtroCargo || member.CARGO === filtroCargo;
        const matchesCompetencia = !filtroCompetencia || 
            (member.COMPETENCIAS && member.COMPETENCIAS.includes(filtroCompetencia));
        
        return matchesUnidade && matchesDepto && matchesCargo && matchesCompetencia;
    });
    
    // Atualiza a lista filtrada do time
    if (timeNum === 1) {
        time1Filtrados = colaboradoresFiltrados;
    } else {
        time2Filtrados = colaboradoresFiltrados;
    }
    
    // Atualiza a lista de colaboradores disponíveis
    atualizarListaColaboradoresTime(timeNum);
    
    // Se o colaborador atual não está mais na lista filtrada, deseleciona
    const colaboradorAtual = timeNum === 1 ? time1Colaborador : time2Colaborador;
    if (colaboradorAtual && !colaboradoresFiltrados.find(m => m.ID === colaboradorAtual.ID)) {
        if (timeNum === 1) time1Colaborador = null;
        else time2Colaborador = null;
        
        const modalElement = document.getElementById(`modal-time-${timeNum}`);
        if (modalElement) {
            modalElement.innerHTML = '<div class="placeholder-text">Selecione um colaborador</div>';
            modalElement.className = 'time-modal-placeholder';
        }
    } else if (colaboradorAtual) {
        // ATUALIZAÇÃO CRÍTICA: Re-renderiza o modal com os dados filtrados
        renderizarModalTime(timeNum, colaboradorAtual);
    }
}
/**
 * Atualiza a lista de colaboradores disponíveis para um time
 */
function atualizarListaColaboradoresTime(timeNum) {
    const select = document.getElementById(`filtro-colaborador-${timeNum}`);
    if (!select) return;
    
    // Limpa options existentes (mantendo o primeiro)
    while (select.options.length > 1) select.remove(1);
    
    // Obtém a lista filtrada
    const colaboradoresFiltrados = timeNum === 1 ? time1Filtrados : time2Filtrados;
    
    // Adiciona novos options
    colaboradoresFiltrados.forEach(member => {
        select.add(new Option(member.NOME, member.ID));
    });
    
    // Mantém a seleção atual se ainda estiver disponível
    const colaboradorAtual = timeNum === 1 ? time1Colaborador : time2Colaborador;
    if (colaboradorAtual && colaboradoresFiltrados.find(m => m.ID === colaboradorAtual.ID)) {
        select.value = colaboradorAtual.ID;
    } else {
        select.value = '';
    }
}

/**
 * Seleciona um colaborador para um time específico
 */
function selecionarColaboradorTime(timeNum, memberId = null) {
    const select = document.getElementById(`filtro-colaborador-${timeNum}`);
    const modalElement = document.getElementById(`modal-time-${timeNum}`);
    
    if (!select || !modalElement) return;
    
    const selectedId = memberId || select.value;
    
    if (!selectedId) {
        // Se não há seleção, mostra placeholder
        modalElement.innerHTML = '<div class="placeholder-text">Selecione um colaborador</div>';
        modalElement.className = 'time-modal-placeholder';
        
        // Atualiza a variável global
        if (timeNum === 1) time1Colaborador = null;
        else time2Colaborador = null;
        return;
    }
    
    // Busca o membro nos dados filtrados (não nos dados completos)
    const colaboradoresFiltrados = timeNum === 1 ? time1Filtrados : time2Filtrados;
    const member = colaboradoresFiltrados.find(m => m.ID === selectedId);
    
    if (!member) return;
    
    // Atualiza a variável global
    if (timeNum === 1) time1Colaborador = member;
    else time2Colaborador = member;
    
    // Renderiza o modal completo do colaborador COM DADOS FILTRADOS
    renderizarModalTime(timeNum, member);
}

/**
 * Renderiza o modal completo de um colaborador para um time COM DADOS FILTRADOS
 */
function renderizarModalTime(timeNum, member) {
    const modalElement = document.getElementById(`modal-time-${timeNum}`);
    if (!modalElement) return;
    
    // Obtém o filtro de competência atual do time
    const filtroCompetencia = document.getElementById(`filtro-competencia-${timeNum}`).value;
    
    // Recalcula as métricas APENAS com os dados filtrados pela competência
    const memberComDadosFiltrados = calcularDadosFiltrados(member, filtroCompetencia);
    
    const color = roleStripColorMap[memberComDadosFiltrados.CARGO] || roleStripColorMap['Outros'];
    
    // Define o conteúdo da foto
    let photoContent;
    if (memberComDadosFiltrados.FOTO_URL && memberComDadosFiltrados.FOTO_URL !== 'N/A') {
        photoContent = `<img class="profile-image" src="${memberComDadosFiltrados.FOTO_URL}" alt="${memberComDadosFiltrados.NOME}">`;
    } else {
        photoContent = memberComDadosFiltrados.INICIAL;
    }
    
    // Faturamento formatado
    const stat3Value = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL', 
        minimumFractionDigits: 2 
    }).format(memberComDadosFiltrados.STAT_3_VALOR);
    
    const stat3Trend = memberComDadosFiltrados.STAT_3_VALOR > 0 ? '<span class="positive">↑</span>' : '';
    
    // Gráficos de complexidade
    const finalProgressPercentage = memberComDadosFiltrados.PROGRESSO_VALOR;
    const finalProgressAngle = (finalProgressPercentage / 100) * 360;
    const complexidadeCounts = memberComDadosFiltrados.COMPLEXIDADE_COUNT;
    
    const maxCount = Math.max(complexidadeCounts['A'], complexidadeCounts['B'], complexidadeCounts['C']);
    const barHeightA = maxCount > 0 ? (complexidadeCounts['A'] / maxCount) * 100 : (complexidadeCounts['A'] > 0 ? 20 : 0);
    const barHeightB = maxCount > 0 ? (complexidadeCounts['B'] / maxCount) * 100 : (complexidadeCounts['B'] > 0 ? 20 : 0);
    const barHeightC = maxCount > 0 ? (complexidadeCounts['C'] / maxCount) * 100 : (complexidadeCounts['C'] > 0 ? 20 : 0);
    
    const modalHTML = `
        <div class="time-modal">
            <div class="employee-profile">
                <div class="profile-pic" style="background-color: ${color};">
                    ${photoContent}
                </div>
                <div class="profile-info-text">
                    <h2>${memberComDadosFiltrados.NOME}</h2>
                    <div class="role">${memberComDadosFiltrados.CARGO} em ${memberComDadosFiltrados.DEPARTAMENTO} (${memberComDadosFiltrados.UNIDADE && memberComDadosFiltrados.UNIDADE !== 'Não Definida' ? memberComDadosFiltrados.UNIDADE : 'N/A'})</div>
                    
                    <div class="profile-admissions">
                        <span>Desde: ${memberComDadosFiltrados.DATA_ADMISSAO} | Salário: <span class="salary">R$ ${memberComDadosFiltrados.SALARIO}</span></span>
                    </div>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-item">
                    <div class="stat-title">${memberComDadosFiltrados.STAT_1_TITULO}</div>
                    <div class="stat-value">${memberComDadosFiltrados.STAT_1_VALOR}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">${memberComDadosFiltrados.STAT_2_TITULO}</div>
                    <div class="stat-value">${memberComDadosFiltrados.STAT_2_VALOR}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">${memberComDadosFiltrados.STAT_3_TITULO}</div>
                    <div class="stat-value">${stat3Value} ${stat3Trend}</div>
                </div>
            </div>
            
            <div class="complexity-section">
                <div class="complexity-column">
                    <div class="section-title">Complexidade dos Clientes</div>
                    <div class="complexity-bar-chart">
                        <div class="bar-chart-item">
                            <span class="bar-label">A</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightA}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['A']}</span>
                        </div>
                        <div class="bar-chart-item">
                            <span class="bar-label">B</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightB}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['B']}</span>
                        </div>
                        <div class="bar-chart-item">
                            <span class="bar-label">C</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightC}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['C']}</span>
                        </div>
                    </div>
                </div>
                <div class="complexity-column">
                    <div class="section-title">${memberComDadosFiltrados.PROGRESSO_TITULO}</div>
                    <div class="quality-chart-container">
                        <div class="quality-pie-chart" style="background: conic-gradient(${color} ${finalProgressAngle}deg, #444 0deg);">
                            <span class="quality-percentage">${finalProgressPercentage}%</span>
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 0.8rem; color: var(--dark-secondary-text); margin-top: 10px;">${memberComDadosFiltrados.TAREFAS_COMPLETAS} Entregue no prazo / ${memberComDadosFiltrados.TAREFAS_TOTAIS} Totais</p>
                </div>
            </div>
            
            <div class="modal-buttons-container">
                <button class="ver-clientes-btn" onclick="abrirClientesSidebarComparacao('${memberComDadosFiltrados.ID}', ${timeNum})">
                    Clientes ${filtroCompetencia ? `(${filtroCompetencia})` : ''}
                </button>
            </div>
        </div>
    `;
    
    modalElement.innerHTML = modalHTML;
    modalElement.className = 'time-modal';
}

/**
 * Calcula os dados filtrados de um colaborador baseado na competência selecionada
 */
function calcularDadosFiltrados(member, competenciaFiltro) {
    if (!competenciaFiltro) return member;

    const memberFiltrado = { ...member };

    // Filtra clientes e tarefas normalizando os nomes dos campos
    const clientesFiltrados = clientData.filter(cliente => {
        const resp = cliente.Responsável || cliente.Responsavel || cliente['responsavel'];
        const comp = cliente.Competência || cliente.Competencia || cliente['competencia'];
        return resp === member.NOME && (!competenciaFiltro || comp === competenciaFiltro);
    });

    const tarefasFiltradas = taskData.filter(tarefa => {
        const resp = tarefa.Responsável || tarefa.Responsavel || tarefa['responsavel'];
        const comp = tarefa.Competência || tarefa.Competencia || tarefa['competencia'];
        return resp === member.NOME && (!competenciaFiltro || comp === competenciaFiltro);
    });

    // Recalcula métricas
    memberFiltrado.CLIENTES_TOTAIS = clientesFiltrados.length;
    memberFiltrado.STAT_1_VALOR = clientesFiltrados.length;
    memberFiltrado.FATURAMENTO_TOTAL = clientesFiltrados.reduce((sum, c) => {
        const fatur = c.Faturamento || c.faturamento || c["Faturamento Total"] || 0;
        return sum + parseCurrency(fatur);
    }, 0);
    memberFiltrado.STAT_3_VALOR = memberFiltrado.FATURAMENTO_TOTAL;

    memberFiltrado.COMPLEXIDADE_COUNT = { 'A': 0, 'B': 0, 'C': 0 };
    clientesFiltrados.forEach(c => {
        const cx = (c.Complexidade || c.complexidade || '').toUpperCase();
        if (memberFiltrado.COMPLEXIDADE_COUNT[cx] !== undefined) memberFiltrado.COMPLEXIDADE_COUNT[cx]++;
    });

    memberFiltrado.TAREFAS_CONCLUIDAS = tarefasFiltradas.filter(t =>
        t.Status && String(t.Status).toLowerCase().includes('concluíd')
    ).length;
    memberFiltrado.TAREFAS_PENDENTES = tarefasFiltradas.filter(t =>
        t.Status && String(t.Status).toLowerCase().includes('pendente')
    ).length;
    memberFiltrado.TAREFAS_TOTAIS = memberFiltrado.TAREFAS_CONCLUIDAS + memberFiltrado.TAREFAS_PENDENTES;

    const percentage = memberFiltrado.TAREFAS_TOTAIS > 0
        ? Math.round((memberFiltrado.TAREFAS_CONCLUIDAS / memberFiltrado.TAREFAS_TOTAIS) * 100)
        : 0;
    memberFiltrado.PROGRESSO_VALOR = percentage;
    memberFiltrado.TAREFAS_COMPLETAS = memberFiltrado.TAREFAS_CONCLUIDAS;

    const gruposDistintos = new Set(clientesFiltrados.map(c => c.Grupo || c.grupo)).size;
    memberFiltrado.STAT_2_VALOR = gruposDistintos;

    memberFiltrado.DESCRICAO = `Clientes: ${memberFiltrado.CLIENTES_TOTAIS} | Pendências: ${memberFiltrado.TAREFAS_PENDENTES} | Faturamento: ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0
    }).format(memberFiltrado.FATURAMENTO_TOTAL)}`;

    return memberFiltrado;
}

/**
 * Abre o sidebar de clientes considerando o filtro de competência do time
 */
function abrirClientesSidebarComparacao(memberId, timeNum) {
    const member = teamData.find(m => m.ID === memberId);
    if (!member) return;

    // Obtém o filtro de competência do time
    const filtroCompetencia = document.getElementById(`filtro-competencia-${timeNum}`).value;
    
    const clientes = getClientesDoColaboradorComFiltro(member.NOME, filtroCompetencia);
    const sidebar = document.getElementById('clientes-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const clientesList = document.getElementById('clientes-list');

    if (!sidebar || !overlay || !clientesList) return;

    // Atualiza o título do sidebar com informação do filtro
    const titleElement = sidebar.querySelector('.clientes-sidebar-title');
    if (titleElement) {
        let titleText = `${member.NOME}`;
        if (filtroCompetencia) {
            titleText += ` - ${filtroCompetencia}`;
        }
        titleElement.textContent = titleText;
    }

    // Renderiza a lista de clientes
    if (clientes.length === 0) {
        let mensagem = 'Nenhum cliente encontrado para este colaborador';
        if (filtroCompetencia) {
            mensagem += ` com a competência "${filtroCompetencia}"`;
        }
        clientesList.innerHTML = `
            <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text);">
                ${mensagem}
            </div>
        `;
    } else {
        clientesList.innerHTML = clientes.map(cliente => {
            const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(cliente.faturamento);

            return `
                <div class="cliente-item">
                    <div class="cliente-header">
                        <div class="cliente-nome">${cliente.nome}</div>
                        <div class="cliente-complexidade complexidade-${cliente.complexidade}">
                            ${cliente.complexidade}
                        </div>
                    </div>
                    <div class="cliente-details">
                        <div class="cliente-detail">
                            <span class="detail-label">Grupo</span>
                            <span class="detail-value">${cliente.grupo}</span>
                        </div>
                        <div class="cliente-detail">
                            <span class="detail-label">Competência</span>
                            <span class="detail-value">${cliente.competencia}</span>
                        </div>
                        <div class="cliente-detail">
                            <span class="detail-label">Faturamento</span>
                            <span class="detail-value">${faturamentoFormatado}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adiciona contador de clientes
        const totalClientes = clientes.length;
        const totalFaturamento = clientes.reduce((sum, cliente) => sum + cliente.faturamento, 0);
        const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(totalFaturamento);
        
        const resumoHTML = `
            <div class="cliente-item" style="background-color: var(--modal-border);">
                <div class="cliente-header">
                    <div class="cliente-nome">RESUMO</div>
                </div>
                <div class="cliente-details">
                    <div class="cliente-detail">
                        <span class="detail-label">Total de Clientes</span>
                        <span class="detail-value">${totalClientes}</span>
                    </div>
                    <div class="cliente-detail">
                        <span class="detail-label">Faturamento Total</span>
                        <span class="detail-value">${faturamentoTotalFormatado}</span>
                    </div>
                </div>
            </div>
        `;
        
        clientesList.innerHTML = resumoHTML + clientesList.innerHTML;
    }

    // Abre o sidebar
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
    

}

/**
 * Obtém os clientes de um colaborador com filtro de competência
 */
function getClientesDoColaboradorComFiltro(nomeColaborador, competenciaFiltro) {
    return clientData.filter(cliente => {
        // Filtra pelo responsável
        if (cliente.Responsável !== nomeColaborador) return false;
        
        // Aplica filtro de competência se estiver ativo
        if (competenciaFiltro && cliente.Competência !== competenciaFiltro) {
            return false;
        }
        
        return true;
    }).map(cliente => ({
        nome: cliente.Cliente || 'Cliente sem nome',
        grupo: cliente.Grupo || 'N/A',
        competencia: cliente.Competência || 'N/A',
        complexidade: cliente.Complexidade || 'N/A',
        faturamento: parseCurrency(cliente.Faturamento || 0)
    }));
}
/**
 * Mescla dados de Colaborador, Cliente e Tarefa.
 */
function aggregateData() {
    const responsibleMap = new Map();

    // 1. Inicializa a estrutura base com os dados do Colaborador
    collaboratorData.forEach(collab => {
        const resp = collab.Colaborador;
        if (!resp || String(resp).trim() === '') return;

        const salario = parseCurrency(collab.Salário || 0);
        const rawCargo = String(collab.Cargo || 'Outros').trim();
        let cargoPadronizado = 'Outros';

        if (rawCargo.length > 0) {
            cargoPadronizado = rawCargo.charAt(0).toUpperCase() + rawCargo.slice(1).toLowerCase();
            if (!roleStripColorMap[cargoPadronizado]) {
                const shortRole = cargoPadronizado.split(' ')[0];
                if (roleStripColorMap[shortRole]) cargoPadronizado = shortRole;
                else cargoPadronizado = 'Outros';
            }
        }

        responsibleMap.set(resp, {
            NOME: resp,
            ID: resp.toLowerCase().replace(/\s/g, ''),
            INICIAL: resp.charAt(0),
            CARGO: cargoPadronizado,
            UNIDADE: collab.Unidade || 'Não Definida',
            DEPARTAMENTO: collab.Departamento || 'Não Definido',
            SALARIO_BASE: salario,
            DATA_ADMISSAO: collab.Admissão || 'N/A',
            FOTO_URL: collab.FOTO_URL || '',
            COMPETENCIAS: new Set(),
            COMPLEXIDADE_COUNT: { 'A': 0, 'B': 0, 'C': 0 },
            FATURAMENTO_TOTAL: 0,
            CLIENTES_TOTAIS: 0,
            TAREFAS_CONCLUIDAS: 0,
            TAREFAS_PENDENTES: 0,
        });
    });

    // 2. Agrega dados de CLIENTES
    clientData.forEach(client => {
        const resp = client.Responsável || client.Responsavel || client['responsavel'];
        if (!responsibleMap.has(resp)) return;

        const teamMember = responsibleMap.get(resp);
        const faturamento = parseCurrency(client.Faturamento);
        const complexidade = client.Complexidade;
        const competencia = client.Competência || client.Competencia || client['competencia'];

        if (competencia && String(competencia).trim() !== '') teamMember.COMPETENCIAS.add(String(competencia).trim());

        teamMember.FATURAMENTO_TOTAL += faturamento;
        teamMember.CLIENTES_TOTAIS += 1;

        if (complexidade && teamMember.COMPLEXIDADE_COUNT.hasOwnProperty(complexidade.toUpperCase())) {
            teamMember.COMPLEXIDADE_COUNT[complexidade.toUpperCase()]++;
        }
    });

    // 3. Agrega dados de TAREFAS
    taskData.forEach(task => {
        const resp = task.Responsável || task.Responsavel || task['responsavel'];
        if (!responsibleMap.has(resp)) return;

        const teamMember = responsibleMap.get(resp);
        const competencia = task.Competência || task.Competencia || task['competencia'];

        if (competencia && String(competencia).trim() !== '') teamMember.COMPETENCIAS.add(String(competencia).trim());

        if (task.Status && String(task.Status).toLowerCase().includes('concluíd')) {
            teamMember.TAREFAS_CONCLUIDAS++;
        } else if (task.Status && String(task.Status).toLowerCase().includes('pendente')) {
            teamMember.TAREFAS_PENDENTES++;
        }
    });

    // 4. Monta o array final
    const aggregated = Array.from(responsibleMap.values());

    return aggregated.map(member => {
        const competenciasArray = Array.from(member.COMPETENCIAS);
        const tarefasTotais = member.TAREFAS_CONCLUIDAS + member.TAREFAS_PENDENTES;
        const percentage = tarefasTotais > 0 ? Math.round((member.TAREFAS_CONCLUIDAS / tarefasTotais) * 100) : 0;

        const gruposDistintos = new Set(
            clientData.filter(c => {
                const r = c.Responsável || c.Responsavel || c['responsavel'];
                return r === member.NOME;
            }).map(c => c.Grupo)
        ).size;

        const clientesTotais = clientData.filter(c => {
            const r = c.Responsável || c.Responsavel || c['responsavel'];
            return r === member.NOME;
        }).length;

        const salarioFormatado = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(member.SALARIO_BASE);

        return {
            ...member,
            COMPETENCIAS: competenciasArray,
            CLIENTES_TOTAIS: clientesTotais,
            DESCRICAO: `Clientes: ${clientesTotais} | Pendências: ${member.TAREFAS_PENDENTES} | Faturamento: ${new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
            }).format(member.FATURAMENTO_TOTAL)}`,
            TAREFAS_TOTAIS: tarefasTotais,
            SALARIO: salarioFormatado,
            STAT_1_TITULO: 'Clientes',
            STAT_1_VALOR: clientesTotais,
            STAT_2_TITULO: 'Grupos',
            STAT_2_VALOR: gruposDistintos,
            STAT_3_TITULO: 'Faturamento',
            STAT_3_VALOR: member.FATURAMENTO_TOTAL,
            PROGRESSO_TITULO: 'Qualidade das entregas',
            PROGRESSO_VALOR: percentage
        };
    });
}

// ----------------------------------------------------------------------
// FUNÇÕES DE CARREGAMENTO CSV (UPLOAD LOCAL PELO USUÁRIO)
// ----------------------------------------------------------------------

function loadSingleCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            download: false,            // ⚡ Lê localmente
            header: true,
            dynamicTyping: true,
            delimiter: ";",
            skipEmptyLines: true,
            encoding: "utf8",
            transformHeader: function (header) {
                return header.replace(/\xa0/g, '').trim();
            },
            complete: function (results) {
                const validData = results.data.filter(row =>
                    row && Object.values(row).some(val => val !== null && String(val).trim() !== '')
                );
                resolve(validData);
            },
            error: function (error) {
                console.error(`Erro ao ler o arquivo CSV local (${file.name}):`, error);
                reject(error);
            }
        });
    });
}

async function loadAllCSVs(fileCliente, fileColaborador, fileTarefa) {
    try {
        // 🔹 Lê os três arquivos locais em paralelo
        const [clientDataRaw, collaboratorDataRaw, taskDataRaw] = await Promise.all([
            loadSingleCSV(fileCliente),
            loadSingleCSV(fileColaborador),
            loadSingleCSV(fileTarefa)
        ]);

        // 🔹 Armazena globalmente (caso o restante do código dependa disso)
        clientData = clientDataRaw;
        collaboratorData = collaboratorDataRaw;
        taskData = taskDataRaw;

        // 🔹 Continua o fluxo normal da interface
        if (clientData.length > 0 && collaboratorData.length > 0) {
            teamData = aggregateData();

            renderAutocompleteList(teamData);
            populateSelectionFilters(teamData);
            renderTeamCards(teamData);
        } else {
            console.error('Dados insuficientes para renderização. Verifique os CSVs enviados e o cabeçalho "Responsável".');
        }

    } catch (error) {
        console.error('Falha ao processar um ou mais arquivos CSV locais:', error);
    }
}

// ----------------------------------------------------------------------
// FEEDBACK DE UPLOAD COM BARRA DE PROGRESSO
// ----------------------------------------------------------------------

let arquivosCarregados = 0;

function atualizarBarraProgresso() {
    const progressBar = document.getElementById("progress-bar");
    const statusText = document.getElementById("upload-status");

    const porcentagem = (arquivosCarregados / 3) * 100;
    progressBar.style.width = `${porcentagem}%`;

    if (arquivosCarregados === 0) {
        statusText.textContent = "Aguardando anexos...";
    } else if (arquivosCarregados < 3) {
        statusText.textContent = `Anexando arquivos... (${arquivosCarregados}/3)`;
    } else {
        statusText.textContent = "✅ Todos os arquivos anexados!";
    }
}

function configurarUploadBarra(inputId) {
    const input = document.getElementById(inputId);
    input.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            arquivosCarregados++;
            atualizarBarraProgresso();
            checkAllFiles(); // mantém compatibilidade com botão "Gerar Análise"
        }
    });
}

// ativa nos três botões
configurarUploadBarra("file-colaborador");
configurarUploadBarra("file-cliente");
configurarUploadBarra("file-tarefa");

// ----------------------------------------------------------------------
// FUNÇÕES DE FILTRO E RENDERIZAÇÃO 
// ----------------------------------------------------------------------

function renderAutocompleteList(data) {
    const datalist = document.getElementById('autocomplete-list');
    if (!datalist) return;

    const names = data.map(member => member.NOME);
    const departments = data.map(member => member.DEPARTAMENTO);
    const units = data.map(member => member.UNIDADE || 'N/A');
    const roles = data.map(member => member.CARGO || 'N/A');

    const allSuggestions = new Set([...names, ...departments, ...units, ...roles]);

    datalist.innerHTML = '';

    allSuggestions.forEach(suggestion => {
        if (suggestion && String(suggestion).trim() !== '' && String(suggestion).trim() !== 'N/A') {
            const option = document.createElement('option');
            option.value = suggestion;
            datalist.appendChild(option);
        }
    });
}

/**
 * Recalcula as agregações (faturamento, tarefas, etc.) baseado nos colaboradores filtrados
 * E APLICA OS FILTROS DE COMPETÊNCIA NOS DADOS TAMBÉM
 */
function recalculateAggregations(filteredCollaborators) {
    const filterCompetencia = document.getElementById('filter-competencia').value;

    const collaboratorMap = new Map();
    filteredCollaborators.forEach(collab => {
        collaboratorMap.set(collab.NOME, {
            ...collab,
            COMPLEXIDADE_COUNT: { 'A': 0, 'B': 0, 'C': 0 },
            FATURAMENTO_TOTAL: 0,
            CLIENTES_TOTAIS: 0,
            TAREFAS_CONCLUIDAS: 0,
            TAREFAS_PENDENTES: 0,
            COMPETENCIAS: new Set()
        });
    });

    // Recalcula CLIENTES filtrados
    clientData.forEach(client => {
        const resp = client.Responsável || client.Responsavel || client['responsavel'];
        const competencia = client.Competência || client.Competencia || client['competencia'];
        if (!collaboratorMap.has(resp)) return;
        if (filterCompetencia && competencia !== filterCompetencia) return; // <<-- agora filtra corretamente

        const member = collaboratorMap.get(resp);
        const faturamento = parseCurrency(client.Faturamento || client.faturamento || 0);
        const complexidade = client.Complexidade;

        if (competencia) member.COMPETENCIAS.add(String(competencia).trim());
        member.CLIENTES_TOTAIS++;
        member.FATURAMENTO_TOTAL += faturamento; // <<-- faturamento respeita o filtro agora

        if (complexidade && member.COMPLEXIDADE_COUNT.hasOwnProperty(complexidade.toUpperCase())) {
            member.COMPLEXIDADE_COUNT[complexidade.toUpperCase()]++;
        }
    });

    // Recalcula TAREFAS filtradas
    taskData.forEach(task => {
        const resp = task.Responsável || task.Responsavel || task['responsavel'];
        const competencia = task.Competência || task.Competencia || task['competencia'];
        if (!collaboratorMap.has(resp)) return;
        if (filterCompetencia && competencia !== filterCompetencia) return;

        const member = collaboratorMap.get(resp);
        if (competencia) member.COMPETENCIAS.add(String(competencia).trim());

        if (task.Status && String(task.Status).toLowerCase().includes('concluíd')) member.TAREFAS_CONCLUIDAS++;
        else if (task.Status && String(task.Status).toLowerCase().includes('pendente')) member.TAREFAS_PENDENTES++;
    });

    // Monta resultado final
    return Array.from(collaboratorMap.values()).map(member => {
        const competenciasArray = Array.from(member.COMPETENCIAS);
        const tarefasTotais = member.TAREFAS_CONCLUIDAS + member.TAREFAS_PENDENTES;
        const percentage = tarefasTotais > 0 ? Math.round((member.TAREFAS_CONCLUIDAS / tarefasTotais) * 100) : 0;

        const gruposDistintos = new Set(
            clientData
                .filter(c => {
                    const resp = c.Responsável || c.Responsavel || c['responsavel'];
                    const competencia = c.Competência || c.Competencia || c['competencia'];
                    if (filterCompetencia && competencia !== filterCompetencia) return false;
                    return resp === member.NOME;
                })
                .map(c => c.Grupo)
        ).size;

        const clientesTotaisFiltrados = clientData.filter(c => {
            const resp = c.Responsável || c.Responsavel || c['responsavel'];
            const competencia = c.Competência || c.Competencia || c['competencia'];
            if (filterCompetencia && competencia !== filterCompetencia) return false;
            return resp === member.NOME;
        }).length;

        const salarioFormatado = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(member.SALARIO_BASE);

        return {
            ...member,
            COMPETENCIAS: competenciasArray,
            CLIENTES_TOTAIS: clientesTotaisFiltrados,
            DESCRICAO: `Clientes: ${clientesTotaisFiltrados} | Pendências: ${member.TAREFAS_PENDENTES} | Faturamento: ${new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
            }).format(member.FATURAMENTO_TOTAL)}`,
            TAREFAS_TOTAIS: tarefasTotais,
            SALARIO: salarioFormatado,
            STAT_1_TITULO: 'Clientes',
            STAT_1_VALOR: clientesTotaisFiltrados,
            STAT_2_TITULO: 'Grupos',
            STAT_2_VALOR: gruposDistintos,
            STAT_3_TITULO: 'Faturamento',
            STAT_3_VALOR: member.FATURAMENTO_TOTAL,
            PROGRESSO_TITULO: 'Qualidade das entregas',
            PROGRESSO_VALOR: percentage
        };
    });
}

function filterCards() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const filterUnidade = document.getElementById('filter-unidade').value;
    const filterDepartamento = document.getElementById('filter-departamento').value;
    const filterCompetencia = document.getElementById('filter-competencia').value;

    console.log('Filtros aplicados:', {
        unidade: filterUnidade,
        departamento: filterDepartamento,
        competencia: filterCompetencia,
        searchTerm: searchTerm
    });

    // 1. Primeiro filtra os colaboradores baseado nos critérios de seleção
    let filteredCollaborators = teamData.filter(member => {
        const matchesUnidade = !filterUnidade || member.UNIDADE === filterUnidade;
        const matchesDepto = !filterDepartamento || member.DEPARTAMENTO === filterDepartamento;
        const matchesCompetencia = !filterCompetencia || 
            (member.COMPETENCIAS && member.COMPETENCIAS.includes(filterCompetencia));
        
        console.log(`Membro ${member.NOME}:`, {
            competencias: member.COMPETENCIAS,
            matchesCompetencia: matchesCompetencia,
            filtroCompetencia: filterCompetencia
        });
        
        return matchesUnidade && matchesDepto && matchesCompetencia;
    });

    console.log('Colaboradores filtrados:', filteredCollaborators.map(m => m.NOME));

    // 2. Aplica o filtro de busca por texto
    if (searchTerm !== '') {
        filteredCollaborators = filteredCollaborators.filter(member => {
            const memberDepartment = member.DEPARTAMENTO.toLowerCase().trim();
            const memberRole = member.CARGO.toLowerCase().trim();
            const memberName = member.NOME.toLowerCase().trim();
            const memberUnit = member.UNIDADE ? member.UNIDADE.toLowerCase().trim() : '';
            const memberCompetencias = member.COMPETENCIAS ? 
                member.COMPETENCIAS.map(c => c.toLowerCase()).join(' ') : '';

            const searchableText = [
                memberName,
                memberRole,
                memberDepartment,
                member.DESCRICAO.toLowerCase(),
                member.ID,
                memberUnit,
                memberCompetencias
            ].join(' ');

            return searchableText.includes(searchTerm);
        });
    }

    // 3. RECALCULA as agregações baseado nos colaboradores filtrados
    const recalculatedData = recalculateAggregations(filteredCollaborators);
    
    console.log('Dados recalculados:', recalculatedData);
    
    // 4. Renderiza os cards com os dados recalculados
    renderTeamCards(recalculatedData);
}

/**
 * FUNÇÃO DE RENDERIZAÇÃO DOS CARDS (Com agrupamento e rolagem horizontal por cargo)
 */
function renderTeamCards(data) {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    grid.innerHTML = '';

    data.sort((a, b) => b.STAT_3_VALOR - a.STAT_3_VALOR);    
    // ========== CARDS FIXOS - ADICIONE ESTA SEÇÃO ==========
    const roleSectionFixa = document.createElement('div');
    roleSectionFixa.className = 'role-section';
    
    // Título para os cards fixos
    roleSectionFixa.innerHTML = `<div class="role-header"><h2>Desenvolvedores</h2></div>`;
    
    const cardsContainerFixo = document.createElement('div');
    cardsContainerFixo.className = 'role-cards-container';
    
    // Card 1 - Juan Rodrigues
    const cardJuan = `
        <div class="team-card" onclick="openModal('juan-rodrigues-fixo')">
            <div class="card-header" style="background: linear-gradient(135deg, #600018, #800020);">
                <div class="card-photo">
                    <img src="fotos/juan_rodrigues.png" alt="Juan Rodrigues">
                </div>
                <div class="card-header-info">
                    <h2>Juan Rodrigues</h2>
                    <div class="role">Desenvolvedor</div>
                </div>
            </div>
            <div class="card-content">
                <div class="info-list">
                    <div class="info-item">
                        <span class="info-label">Idade</span>
                        <span class="info-value">21</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Formação</span>
                        <span class="info-value">Logística</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Card 2 - Willian Emanoel
    const cardWillian = `
        <div class="team-card" onclick="openModal('willian-emanoel-fixo')">
            <div class="card-header" style="background: linear-gradient(135deg, #600018, #800020);">
                <div class="card-photo">
                    <img src="fotos/willian_emanoel.png" alt="Willian Emanoel">
                </div>
                <div class="card-header-info">
                    <h2>Willian Emanoel</h2>
                    <div class="role">Desenvolvedor</div>
                </div>
            </div>
            <div class="card-content">
                <div class="info-list">
                    <div class="info-item">
                        <span class="info-label">Idade</span>
                        <span class="info-value">22</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Formação</span>
                        <span class="info-value">Sistemas</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    cardsContainerFixo.innerHTML = cardJuan + cardWillian;
    roleSectionFixa.appendChild(cardsContainerFixo);
    grid.appendChild(roleSectionFixa);
    // ========== FIM DOS CARDS FIXOS ==========

    if (data.length === 0) {
        grid.innerHTML = '<p style="color: var(--dark-secondary-text); text-align: center; grid-column: 1 / -1;">Nenhum resultado encontrado.</p>';
        return;
    }



    // 1. Agrupar os dados por CARGO
    const groupedData = data.reduce((acc, member) => {
        const role = member.CARGO || 'Outros'; 
        if (!acc[role]) {
            acc[role] = [];
        }
        acc[role].push(member);
        return acc;
    }, {});

    // 2. Obter a ordem dos cargos (Ordena por nome do cargo)
    const sortedRoles = Object.keys(groupedData).sort();

    // 3. Iterar sobre os cargos e renderizar
    sortedRoles.forEach(roleName => {
        const members = groupedData[roleName];

        // Cria o contêiner principal para a seção do cargo
        const roleSection = document.createElement('div');
        roleSection.className = 'role-section';

        // 3a. Cria o TÍTULO/SEPARADOR para o cargo
        const roleTitleHtml = `<div class="role-header"><h2>${roleName}</h2></div>`;
        roleSection.innerHTML += roleTitleHtml;

        // 3b. Cria o contêiner de rolagem (Netflix style)
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'role-cards-container';
        
        // 3c. Renderiza os CARDS de cada membro dentro do container de rolagem
        members.forEach(member => {
            const memberId = member.ID;
            
            // Usa o HEX direto do JS para o cargo
            const baseColorHex = roleStripColorMap[member.CARGO] || roleStripColorMap['Outros'];
            
            // Calcula a cor mais escura para o degradê (30% mais escuro)
            const darkerColor = darkenColor(baseColorHex, 0.7);
            const lighterColor = lightenColor(baseColorHex, 0.2); // 0.4 = 40% mais claro

            function lightenColor(hex, percent) {
                const color = hex.startsWith('#') ? hex.slice(1) : hex;
                if (color.length !== 6) return hex;

                let r = parseInt(color.substring(0, 2), 16);
                let g = parseInt(color.substring(2, 4), 16);
                let b = parseInt(color.substring(4, 6), 16);

                // Aumenta os canais de cor proporcionalmente
                r = Math.floor(r + (255 - r) * percent);
                g = Math.floor(g + (255 - g) * percent);
                b = Math.floor(b + (255 - b) * percent);

                // Limita para 255 e converte de volta pra HEX
                const rr = r.toString(16).padStart(2, '0');
                const gg = g.toString(16).padStart(2, '0');
                const bb = b.toString(16).padStart(2, '0');

                return `#${rr}${gg}${bb}`;
            }

            // Define o conteúdo da foto (imagem ou inicial)
            let photoContent = member.FOTO_URL && member.FOTO_URL !== 'N/A' 
                ? `<img src="${member.FOTO_URL}" alt="${member.NOME}">`
                : member.INICIAL; 

            // Informação secundária do card (Departamento + Unidade)
            const secondaryInfo = `${member.DEPARTAMENTO}${member.UNIDADE && member.UNIDADE !== 'Não Definida' ? ' (' + member.UNIDADE + ')' : ''}`;

            const cardHtml = `
                <div class="team-card" onclick="openModal('${memberId}')"> 
                    
                    <div class="card-header" style="background: linear-gradient(to right,${baseColorHex},${lighterColor});">
                        <div class="card-photo">
                            ${photoContent}
                        </div>
                        <div class="card-header-info">
                            <h2>${member.NOME}</h2>
                            <div class="role">${secondaryInfo}</div>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="info-list">
                            <div class="info-item">
                                <span class="info-label">Clientes</span>
                                <span class="info-value">${member.CLIENTES_TOTAIS}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Salário</span>
                                <span class="info-value currency-value">R$ ${member.SALARIO}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Faturamento</span>
                                <span class="info-value currency-value">${new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL', 
                                    minimumFractionDigits: 2 
                                }).format(member.FATURAMENTO_TOTAL)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            cardsContainer.innerHTML += cardHtml;
        });

        // 3d. Adiciona o contêiner de cards à seção e a seção ao grid
        roleSection.appendChild(cardsContainer);
        grid.appendChild(roleSection);
    });

    // 4. Renderiza os modais UMA VEZ, fora do loop
    renderModals(data);
    
    // 5. Verifica containers com scroll
    setTimeout(() => {
        checkScrollableContainers();
    }, 100);
}

/**
 * Detecta se o container tem scroll horizontal e adiciona classe visual
 */
function checkScrollableContainers() {
    const containers = document.querySelectorAll('.role-cards-container');
    
    containers.forEach(container => {
        const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
        
        if (hasHorizontalScroll) {
            container.classList.add('scrollable');
        } else {
            container.classList.remove('scrollable');
        }
    });
}

/**
 * Renderiza os Modais com cores e dados estatísticos formatados.
 */
function renderModals(data) {
    const container = document.getElementById('modal-container');
    if (!container) return;
    container.innerHTML = '';

    // ========== MODAIS FIXOS - ADICIONE ESTA SEÇÃO ==========
    // Modal para Juan Rodrigues
    const modalJuan = `
        <div id="juan-rodrigues-fixo-modal" class="modal">
            <div class="modal-content" id="juan-rodrigues-fixo-modal-content">
                <span class="close-btn" onclick="closeModal('juan-rodrigues-fixo')">&times;</span>
                <div class="employee-profile">
                    <div class="profile-pic" style="background-color: #800020;">
                        <img class="profile-image" src="fotos/juan_rodrigues.png" alt="Juan Rodrigues">
                    </div>
                    <div class="profile-info-text">
                        <h2>Juan Rodrigues</h2>
                        <div class="role">Desenvolvedor</div>
                        <div class="profile-admissions">
                            <span>Idade: 21 | Formação: Logística</span>
                        </div>
                    </div>
                </div>
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-title">Experiência</div>
                        <div class="stat-value">2 anos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Especialidade</div>
                        <div class="stat-value">Análise de dados</div>
                    </div>
                </div>
                    <div class="linkedin">
                        <span>Linkedin: juanrodriguessilva</span>
                    </div>
                    <div class="espaço">
                        <span> . </span>
                    </div>

            </div>
        </div>
    `;

    // Modal para Willian Emanoel
    const modalWillian = `
        <div id="willian-emanoel-fixo-modal" class="modal">
            <div class="modal-content" id="willian-emanoel-fixo-modal-content">
                <span class="close-btn" onclick="closeModal('willian-emanoel-fixo')">&times;</span>
                <div class="employee-profile">
                    <div class="profile-pic" style="background-color: #800020;">
                        <img class="profile-image" src="fotos/willian_emanoel.png" alt="Willian Emanoel">
                    </div>
                    <div class="profile-info-text">
                        <h2>Willian Emanoel</h2>
                        <div class="role">Desenvolvedor</div>
                        <div class="profile-admissions">
                            <span>Formado em Gestao da Tecnologia da Informação/Analise e Desenvolvimento de Sistemas</span>
                        </div>
                    </div>
                </div>
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-title">Experiência</div>
                        <div class="stat-value">3 anos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Projetos</div>
                        <div class="stat-value">20+</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Especialidade</div>
                        <div class="stat-value">Full-stack</div>
                    </div>
                </div>
                <div class="modal-buttons-container">
                    <button class="ver-clientes-btn" onclick="alert('Informações de contato: willian@empresa.com')">
                        Contato
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = modalJuan + modalWillian;
    // ========== FIM DOS MODAIS FIXOS ==========

    data.forEach(member => {
        // Usa o HEX direto do JS para o background do perfil no modal
        const color = roleStripColorMap[member.CARGO] || roleStripColorMap['Outros'];

        // Define o conteúdo do perfil no modal (Imagem ou Inicial)
        let profileContent;
        if (member.FOTO_URL && member.FOTO_URL !== 'N/A') {
            profileContent = `<img class="profile-image" src="${member.FOTO_URL}" alt="${member.NOME}">`;
        } else {
            profileContent = member.INICIAL;
        }

        // Faturamento formatado
        let stat3Value = member.STAT_3_VALOR;
        stat3Value = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL', 
            minimumFractionDigits: 2 
        }).format(stat3Value);
        
        const stat3Trend = member.STAT_3_VALOR > 0 ? '<span class="positive">↑</span>' : '';

        const statsRowHTML = `
            <div class="stats-row">
                <div class="stat-item">
                    <div class="stat-title">${member.STAT_1_TITULO}</div>
                    <div class="stat-value">${member.STAT_1_VALOR}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">${member.STAT_2_TITULO}</div>
                    <div class="stat-value">${member.STAT_2_VALOR}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">${member.STAT_3_TITULO}</div>
                    <div class="stat-value">${stat3Value} ${stat3Trend}</div>
                </div>
            </div>
        `;

        const finalProgressPercentage = member.PROGRESSO_VALOR;
        const finalProgressAngle = (finalProgressPercentage / 100) * 360;
        const complexidadeCounts = member.COMPLEXIDADE_COUNT;
        const totalClients = member.CLIENTES_TOTAIS;
        const totalTasks = member.TAREFAS_TOTAIS;
        
        // GRÁFICO DE BARRAS PARA COMPLEXIDADE - COR DO CARGO ATUAL
        const maxCount = Math.max(complexidadeCounts['A'], complexidadeCounts['B'], complexidadeCounts['C']);
        const barHeightA = maxCount > 0 ? (complexidadeCounts['A'] / maxCount) * 100 : (complexidadeCounts['A'] > 0 ? 20 : 0);
        const barHeightB = maxCount > 0 ? (complexidadeCounts['B'] / maxCount) * 100 : (complexidadeCounts['B'] > 0 ? 20 : 0);
        const barHeightC = maxCount > 0 ? (complexidadeCounts['C'] / maxCount) * 100 : (complexidadeCounts['C'] > 0 ? 20 : 0);

        const complexityBarsHTML = `
            <div class="complexity-section">
                <div class="complexity-column">
                    <div class="section-title">Complexidade dos Clientes</div>
                    <div class="complexity-bar-chart">
                        <div class="bar-chart-item">
                            <span class="bar-label">A</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightA}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['A']}</span>
                        </div>
                        <div class="bar-chart-item">
                            <span class="bar-label">B</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightB}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['B']}</span>
                        </div>
                        <div class="bar-chart-item">
                            <span class="bar-label">C</span>
                            <div class="bar-container">
                                <div class="bar" style="height: ${barHeightC}%; background-color: ${color};"></div>
                            </div>
                            <span class="bar-value">${complexidadeCounts['C']}</span>
                        </div>
                    </div>
                </div>
                <div class="complexity-column">
                    <div class="section-title">${member.PROGRESSO_TITULO}</div>
                    <div class="quality-chart-container">
                        <div class="quality-pie-chart" style="background: conic-gradient(${color} ${finalProgressAngle}deg, #444 0deg);">
                            <span class="quality-percentage">${finalProgressPercentage}%</span>
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 0.8rem; color: var(--dark-secondary-text); margin-top: 10px;">${member.TAREFAS_COMPLETAS} Entregue no prazo / ${totalTasks} Totais</p>
                </div>
            </div>
        `;

        // Na função renderModals, substitua a parte dos botões por:
        const filterCompetencia = document.getElementById('filter-competencia').value;
        const btnClass = filterCompetencia ? 'ver-clientes-btn filtro-ativo' : 'ver-clientes-btn';
        const compararBtnClass = filterCompetencia ? 'comparar-btn filtro-ativo' : 'comparar-btn';

        const modalButtonsHTML = `
            <div class="modal-buttons-container">
                <button class="${btnClass}" onclick="abrirClientesSidebar('${member.ID}')">
                    Clientes
                    ${filterCompetencia ? '' : ''}
                </button>
                <button class="${compararBtnClass}" onclick="abrirCompararSidebar('${member.ID}')">
                    Comparar
                </button>
            </div>
        `;
        const modalHtml = `
            <div id="${member.ID}-modal" class="modal">
                <div class="modal-content" id="${member.ID}-modal-content">
                    <span class="close-btn" onclick="closeModal('${member.ID}')">&times;</span>
                    <div class="employee-profile">
                        <div class="profile-pic" style="background-color: ${color};">
                            ${profileContent}
                        </div>
                        <div class="profile-info-text">
                            <h2>${member.NOME}</h2>
                            <div class="role">${member.CARGO} em ${member.DEPARTAMENTO} (${member.UNIDADE && member.UNIDADE !== 'Não Definida' ? member.UNIDADE : 'N/A'})</div>
                            
                            <div class="profile-admissions">
                                <span>Desde: ${member.DATA_ADMISSAO} | Salário: <span class="salary">R$ ${member.SALARIO}</span></span>
                            </div>
                        </div>
                    </div>
                    
                    ${statsRowHTML}
                    
                    ${complexityBarsHTML}
                    
                    ${modalButtonsHTML}
                    
                </div>
            </div>
        `;

        container.innerHTML += modalHtml;
    });
}

/**
 * Abre o sidebar com os clientes do colaborador
 */
function abrirClientesSidebar(memberId) {
    const member = teamData.find(m => m.ID === memberId);
    if (!member) return;

    const clientes = getClientesDoColaborador(member.NOME);
    const sidebar = document.getElementById('clientes-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const clientesList = document.getElementById('clientes-list');

    if (!sidebar || !overlay || !clientesList) return;

    const filterCompetencia = document.getElementById('filter-competencia').value;
    
    // Atualiza o título do sidebar com informação do filtro
    const titleElement = sidebar.querySelector('.clientes-sidebar-title');
    if (titleElement) {
        let titleText = `${member.NOME}`;
        if (filterCompetencia) {
            titleText += ` - ${filterCompetencia}`;
        }
        titleElement.textContent = titleText;
    }

    // Renderiza a lista de clientes (um por linha)
    if (clientes.length === 0) {
        let mensagem = 'Nenhum cliente encontrado para este colaborador';
        if (filterCompetencia) {
            mensagem += ` com a competência "${filterCompetencia}"`;
        }
        clientesList.innerHTML = `
            <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text);">
                ${mensagem}
            </div>
        `;
    } else {
        clientesList.innerHTML = clientes.map(cliente => {
            const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(cliente.faturamento);

            return `
                <div class="cliente-item">
                    <div class="cliente-header">
                        <div class="cliente-nome">${cliente.nome}</div>
                        <div class="cliente-complexidade complexidade-${cliente.complexidade}">
                            ${cliente.complexidade}
                        </div>
                    </div>
                    <div class="cliente-details">
                        <div class="cliente-detail">
                            <span class="detail-label">Grupo</span>
                            <span class="detail-value">${cliente.grupo}</span>
                        </div>
                        <div class="cliente-detail">
                            <span class="detail-label">Faturamento</span>
                            <span class="detail-value">${faturamentoFormatado}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adiciona contador de clientes
        const totalClientes = clientes.length;
        const totalFaturamento = clientes.reduce((sum, cliente) => sum + cliente.faturamento, 0);
        const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(totalFaturamento);
        
        const resumoHTML = `
            <div class="cliente-item" style="background-color: var(--modal-border);">
                <div class="cliente-header">
                    <div class="cliente-nome">RESUMO</div>
                </div>
                <div class="cliente-details">
                    <div class="cliente-detail">
                        <span class="detail-label">Total de Clientes</span>
                        <span class="detail-value">${totalClientes}</span>
                    </div>
                    <div class="cliente-detail">
                        <span class="detail-label">Faturamento Total</span>
                        <span class="detail-value">${faturamentoTotalFormatado}</span>
                    </div>
                </div>
            </div>
        `;
        
        clientesList.innerHTML = resumoHTML + clientesList.innerHTML;
    }

    // Abre o sidebar
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
    

}
/**
 * Fecha o sidebar de clientes
 */
function fecharClientesSidebar() {
    const sidebar = document.getElementById('clientes-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('visible');
    }
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

/**
 * Fecha todos os modais abertos
 */
function closeAllModals() {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
        modals[i].style.display = 'none';
    }
}

/**
 * Fecha o modal individual
 */
function closeModal(memberId) {
    const modal = document.getElementById(memberId + '-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function (event) {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
        if (event.target === modals[i]) {
            modals[i].style.display = 'none';
        }
    }
    
    // Fecha todos os sidebars se clicar no overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (event.target === overlay) {
        fecharTodosSidebars();
    }
}
// ----------------------------------------------------------------------
// FUNÇÃO DE INICIALIZAÇÃO E LISTENER 
// ----------------------------------------------------------------------

/**
 * Preenche os dropdowns de Unidade, Departamento e Competência com base nos dados.
 */
function populateSelectionFilters(data) {
    const unidades = new Set();
    const departamentos = new Set();
    const competencias = new Set();

    // Usa teamData (dados completos) para popular os filtros, não os dados filtrados
    teamData.forEach(member => {
        if (member.UNIDADE && member.UNIDADE !== 'Não Definida') {
            unidades.add(member.UNIDADE);
        }
        if (member.DEPARTAMENTO && member.DEPARTAMENTO !== 'Não Definido') {
            departamentos.add(member.DEPARTAMENTO);
        }
        if (member.COMPETENCIAS && member.COMPETENCIAS.length > 0) {
            member.COMPETENCIAS.forEach(comp => {
                if (comp && String(comp).trim() !== '') {
                    competencias.add(String(comp).trim());
                }
            });
        }
    });

    const unidadeSelect = document.getElementById('filter-unidade');
    const deptoSelect = document.getElementById('filter-departamento');
    const competenciaSelect = document.getElementById('filter-competencia');

    [unidadeSelect, deptoSelect, competenciaSelect].forEach(select => {
        while (select.options.length > 1) {
            select.remove(1);
        }
    });

    Array.from(unidades).sort().forEach(u => {
        const option = new Option(u, u);
        unidadeSelect.add(option);
    });

    Array.from(departamentos).sort().forEach(d => {
        const option = new Option(d, d);
        deptoSelect.add(option);
    });

    Array.from(competencias).sort().forEach(c => {
        const option = new Option(c, c);
        competenciaSelect.add(option);
    });
}

// ----------------------------------------------------------------------
// FUNÇÕES DE MODAL
// ----------------------------------------------------------------------

function openModal(memberId) {
    const modal = document.getElementById(memberId + '-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(memberId) {
    const modal = document.getElementById(memberId + '-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function (event) {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
        if (event.target === modals[i]) {
            modals[i].style.display = 'none';
        }
    }
}

/**
 * Obtém os clientes de um colaborador específico, aplicando filtro de competência
 */
function getClientesDoColaborador(nomeColaborador) {
    const filterCompetencia = document.getElementById('filter-competencia').value;
    
    return clientData.filter(cliente => {
        // Filtra pelo responsável
        if (cliente.Responsável !== nomeColaborador) return false;
        
        // Aplica filtro de competência se estiver ativo
        if (filterCompetencia && cliente.Competência !== filterCompetencia) {
            return false;
        }
        
        return true;
    }).map(cliente => ({
        nome: cliente.Cliente || 'Cliente sem nome',
        grupo: cliente.Grupo || 'N/A',
        competencia: cliente.Competência || 'N/A',
        complexidade: cliente.Complexidade || 'N/A',
        faturamento: parseCurrency(cliente.Faturamento || 0)
    }));
}



// ----------------------------------------------------------------------
// INICIALIZAÇÃO
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadAllCSVs();

    const searchInput = document.getElementById('search-input');
    const unidadeSelect = document.getElementById('filter-unidade');
    const deptoSelect = document.getElementById('filter-departamento');
    const competenciaSelect = document.getElementById('filter-competencia');

    if (searchInput) {
        searchInput.addEventListener('input', filterCards);
    }
    
    if (unidadeSelect) {
        unidadeSelect.addEventListener('change', filterCards);
    }
    if (deptoSelect) {
        deptoSelect.addEventListener('change', filterCards);
    }
    if (competenciaSelect) {
        competenciaSelect.addEventListener('change', filterCards);
    }
});
