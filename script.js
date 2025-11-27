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
// Variável global para controlar o estado de visibilidade dos salários
let salariosVisiveis = false;
// Objeto para controlar o estado de cada seção
const estadoSalariosPorSecao = {};

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
    'Analista': '#053e89',
    'Auxiliar': '#6d9fe0', 
    'Assistente': '#2e69b6', 
    'Coordenador(a)': '#800020', 
    'Gerente': '#800020', 
    'Outros': '#444444',    
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
    
    // PREENCHIMENTO AUTOMÁTICO: Define os filtros de AMBOS os times baseado no colaborador selecionado
    preencherFiltrosAutomaticamente(1, member); // Time 1 (esquerda)
    preencherFiltrosAutomaticamente(2, member); // Time 2 (direita) - MESMOS FILTROS
    
    // Atualiza o time 1 com o colaborador selecionado
    selecionarColaboradorTime(1, memberId);
    
    // Tenta selecionar um colaborador diferente para o time 2 (se houver outros disponíveis)
    selecionarColaboradorDiferenteParaTime2(memberId);
}
/**
 * Preenche automaticamente os filtros baseado no colaborador selecionado
 */
function preencherFiltrosAutomaticamente(timeNum, member) {
    // Preenche os filtros com os dados do colaborador
    document.getElementById(`filtro-unidade-${timeNum}`).value = member.UNIDADE || '';
    document.getElementById(`filtro-departamento-${timeNum}`).value = member.DEPARTAMENTO || '';
    document.getElementById(`filtro-cargo-${timeNum}`).value = member.CARGO || '';
    
    // Aplica os filtros automaticamente
    filtrarTime(timeNum, 'auto');
}

/**
 * Tenta selecionar um colaborador diferente para o time 2
 */
function selecionarColaboradorDiferenteParaTime2(memberIdExcluir) {
    const colaboradoresFiltradosTime2 = time2Filtrados;
    
    // Remove o colaborador atual da lista do time 2
    const colaboradoresDisponiveis = colaboradoresFiltradosTime2.filter(m => 
        !memberIdExcluir || m.ID !== memberIdExcluir
    );
    
    if (colaboradoresDisponiveis.length > 0) {
        // Ordena por faturamento (maior primeiro) e seleciona o primeiro
        const colaboradoresOrdenados = [...colaboradoresDisponiveis].sort((a, b) => 
            b.FATURAMENTO_TOTAL - a.FATURAMENTO_TOTAL
        );
        
        const colaboradorParaTime2 = colaboradoresOrdenados[0];
        selecionarColaboradorTime(2, colaboradorParaTime2.ID);
    } else {
        // Se não há outros colaboradores, mostra placeholder
        time2Colaborador = null;
        const modalElement = document.getElementById('modal-time-2');
        if (modalElement) {
            modalElement.innerHTML = '<div class="placeholder-text">Nenhum outro colaborador com os mesmos filtros</div>';
            modalElement.className = 'time-modal-placeholder';
        }
        
        // Atualiza navegação
        atualizarNavegacaoSetas(2);
    }
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
    
    // Atualiza a navegação por setas
    atualizarNavegacaoSetas(timeNum);
    
    // Se o colaborador atual não está mais na lista filtrada, deseleciona
    const colaboradorAtual = timeNum === 1 ? time1Colaborador : time2Colaborador;
    if (colaboradorAtual && !colaboradoresFiltrados.find(m => m.ID === colaboradorAtual.ID)) {
        if (timeNum === 1) {
            time1Colaborador = null;
        } else {
            time2Colaborador = null;
        }
        
        const modalElement = document.getElementById(`modal-time-${timeNum}`);
        if (modalElement) {
            modalElement.innerHTML = '<div class="placeholder-text">Selecione um colaborador</div>';
            modalElement.className = 'time-modal-placeholder';
        }
    } else if (colaboradorAtual) {
        // ATUALIZAÇÃO CRÍTICA: Re-renderiza o modal com os dados filtrados
        renderizarModalTime(timeNum, colaboradorAtual);
    }
    
    // SE FOR FILTRO AUTOMÁTICO DO TIME 1, ATUALIZA O TIME 2 TAMBÉM
    if (timeNum === 1 && tipoFiltro === 'auto' && time2Colaborador) {
        // Verifica se o colaborador do time 2 ainda está nos filtros atualizados
        const colaboradorTime2AindaValido = colaboradoresFiltrados.find(m => m.ID === time2Colaborador.ID);
        if (!colaboradorTime2AindaValido) {
            // Se não está mais válido, tenta selecionar outro
            selecionarColaboradorDiferenteParaTime2(time1Colaborador ? time1Colaborador.ID : null);
        }
    }
}

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
    
    // Atualiza a navegação por setas
    atualizarNavegacaoSetas(timeNum);
}

/**
 * Atualiza a navegação por setas para um time
 */
function atualizarNavegacaoSetas(timeNum) {
    const colaboradoresFiltrados = timeNum === 1 ? time1Filtrados : time2Filtrados;
    const colaboradorAtual = timeNum === 1 ? time1Colaborador : time2Colaborador;
    
    if (!colaboradorAtual || colaboradoresFiltrados.length === 0) {
        // Esconde as setas se não há colaborador selecionado ou lista vazia
        const setaEsquerda = document.getElementById(`seta-esquerda-${timeNum}`);
        const setaDireita = document.getElementById(`seta-direita-${timeNum}`);
        if (setaEsquerda) setaEsquerda.style.visibility = 'hidden';
        if (setaDireita) setaDireita.style.visibility = 'hidden';
        return;
    }
    
    // Encontra o índice atual do colaborador na lista filtrada
    const currentIndex = colaboradoresFiltrados.findIndex(m => m.ID === colaboradorAtual.ID);
    
    // Atualiza a visibilidade das setas
    const setaEsquerda = document.getElementById(`seta-esquerda-${timeNum}`);
    const setaDireita = document.getElementById(`seta-direita-${timeNum}`);
    
    if (setaEsquerda) {
        setaEsquerda.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    }
    
    if (setaDireita) {
        setaDireita.style.visibility = currentIndex < colaboradoresFiltrados.length - 1 ? 'visible' : 'hidden';
    }
}

/**
 * Navega para o próximo ou anterior colaborador
 */
function navegarColaborador(timeNum, direcao) {
    const colaboradoresFiltrados = timeNum === 1 ? time1Filtrados : time2Filtrados;
    const colaboradorAtual = timeNum === 1 ? time1Colaborador : time2Colaborador;
    
    if (!colaboradorAtual || colaboradoresFiltrados.length === 0) return;
    
    // Encontra o índice atual
    const currentIndex = colaboradoresFiltrados.findIndex(m => m.ID === colaboradorAtual.ID);
    
    let novoIndex;
    if (direcao === 'proximo') {
        novoIndex = currentIndex + 1;
        if (novoIndex >= colaboradoresFiltrados.length) return; // Não permite ultrapassar o final
    } else {
        novoIndex = currentIndex - 1;
        if (novoIndex < 0) return; // Não permite ir antes do início
    }
    
    // Seleciona o novo colaborador
    const novoColaborador = colaboradoresFiltrados[novoIndex];
    selecionarColaboradorTime(timeNum, novoColaborador.ID);
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
        
        // Atualiza navegação
        atualizarNavegacaoSetas(timeNum);
        return;
    }
    
    // Busca o membro nos dados filtrados (não nos dados completos)
    const colaboradoresFiltrados = timeNum === 1 ? time1Filtrados : time2Filtrados;
    const member = colaboradoresFiltrados.find(m => m.ID === selectedId);
    
    if (!member) return;
    
    // Atualiza a variável global
    if (timeNum === 1) time1Colaborador = member;
    else time2Colaborador = member;
    
    // Atualiza o select
    select.value = selectedId;
    
    // Renderiza o modal completo do colaborador COM DADOS FILTRADOS
    renderizarModalTime(timeNum, member);
    
    // Atualiza a navegação por setas
    atualizarNavegacaoSetas(timeNum);
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
                <div class="profile-info-text-vertical">
                    <h2>${memberComDadosFiltrados.NOME}</h2>
                    <div class="profile-details-list">
                        <div class="detail-value-only">${memberComDadosFiltrados.CARGO_CARTEIRA}</div>
                        <div class="detail-value-only">${memberComDadosFiltrados.DEPARTAMENTO}</div>
                        <div class="detail-value-only">Desde: ${memberComDadosFiltrados.DATA_ADMISSAO}</div>
                        <div class="detail-value-only salary-value">Salário: R$ ${memberComDadosFiltrados.SALARIO}</div>
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
                    <p style="text-align: center; font-size: 0.8rem; color: var(--dark-secondary-text); margin-top: 10px;">${memberComDadosFiltrados.TAREFAS_CONCLUIDAS} Entregue no prazo de ${memberComDadosFiltrados.TAREFAS_TOTAIS} Totais</p>
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
        t.Status && String(t.Status).toLowerCase().includes('concluído')
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
 * Abre o sidebar de clientes na comparação
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
            <div class="clientes-main-content">
                <div class="clientes-toggle-container">
                    <div class="clientes-toggle-buttons">
                        <button class="toggle-btn active" data-view="clientes">Clientes</button>
                        <button class="toggle-btn" data-view="grupos">Grupos</button>
                    </div>
                </div>
                <div class="clientes-content">
                    <div id="clientes-view" class="clientes-view">
                        <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text); padding: 30px;">
                            ${mensagem}
                        </div>
                    </div>
                    <div id="grupos-view" class="grupos-view" style="display: none;"></div>
                </div>
            </div>
        `;
    } else {
        // Calcular grupos para a view de grupos
        const gruposMap = new Map();
        clientes.forEach(cliente => {
            const grupo = cliente.grupo || 'Sem Grupo';
            if (!gruposMap.has(grupo)) {
                gruposMap.set(grupo, {
                    nome: grupo,
                    clientes: [],
                    complexidades: { 'A': 0, 'B': 0, 'C': 0 },
                    faturamentoTotal: 0
                });
            }
            
            const grupoData = gruposMap.get(grupo);
            grupoData.clientes.push(cliente);
            if (grupoData.complexidades[cliente.complexidade] !== undefined) {
                grupoData.complexidades[cliente.complexidade]++;
            }
            grupoData.faturamentoTotal += cliente.faturamento;
        });

        const grupos = Array.from(gruposMap.values());

        // Renderizar views
        const clientesViewHTML = renderClientesViewComparacao(clientes);
        const gruposViewHTML = renderGruposViewComparacao(grupos);

        const sidebarContent = `
            <div class="clientes-main-content">
                <div class="clientes-toggle-container">
                    <div class="clientes-toggle-buttons">
                        <button class="toggle-btn active" data-view="clientes">Clientes</button>
                        <button class="toggle-btn" data-view="grupos">Grupos</button>
                    </div>
                </div>
                <div class="clientes-content">
                    ${clientesViewHTML}
                    ${gruposViewHTML}
                </div>
            </div>
        `;

        clientesList.innerHTML = sidebarContent;

        // Adicionar event listeners aos botões de toggle
        setTimeout(() => {
            const toggleButtons = clientesList.querySelectorAll('.toggle-btn');
            const clientesView = document.getElementById('clientes-view');
            const gruposView = document.getElementById('grupos-view');
            
            // Inicialmente mostrar apenas clientes
            if (gruposView) gruposView.style.display = 'none';
            
            toggleButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Remover active de todos
                    toggleButtons.forEach(b => b.classList.remove('active'));
                    // Adicionar active ao clicado
                    this.classList.add('active');
                    
                    const view = this.getAttribute('data-view');
                    
                    if (view === 'clientes') {
                        if (clientesView) clientesView.style.display = 'block';
                        if (gruposView) gruposView.style.display = 'none';
                    } else {
                        if (clientesView) clientesView.style.display = 'none';
                        if (gruposView) gruposView.style.display = 'block';
                    }
                });
            });
        }, 100);
    }

    // Abre o sidebar
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
}

/**
 * Renderiza a view de clientes para comparação
 */
function renderClientesViewComparacao(clientes) {
    if (clientes.length === 0) {
        return `
            <div id="clientes-view" class="clientes-view">
                <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text); padding: 30px;">
                    Nenhum cliente encontrado
                </div>
            </div>
        `;
    }

    const clientesHTML = clientes.map(cliente => {
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

    // RESUMO PADRÃO - IGUAL AOS OUTROS
    const totalClientes = clientes.length;
    const totalFaturamento = clientes.reduce((sum, cliente) => sum + cliente.faturamento, 0);
    const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(totalFaturamento);

    const resumoHTML = `
        <div class="cliente-item resumo-total">
            <div class="cliente-header">
                <div class="cliente-nome">RESUMO - CLIENTES</div>
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

    return `
        <div id="clientes-view" class="clientes-view">
            ${resumoHTML}
            ${clientesHTML}
        </div>
    `;
}


/**
 * Renderiza a view de grupos para comparação
 */
function renderGruposViewComparacao(grupos) {
    if (grupos.length === 0) {
        return `
            <div id="grupos-view" class="grupos-view" style="display: none;">
                <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text); padding: 30px;">
                    Nenhum grupo encontrado
                </div>
            </div>
        `;
    }

    const gruposHTML = grupos.map(grupo => {
        const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(grupo.faturamentoTotal);

        return `
            <div class="cliente-item grupo-item">
                <div class="cliente-header">
                    <div class="cliente-nome">${grupo.nome}</div>
                    <div class="grupo-stats">
                        <span class="complexidade-count complexidade-A">A: ${grupo.complexidades['A'] || 0}</span>
                        <span class="complexidade-count complexidade-B">B: ${grupo.complexidades['B'] || 0}</span>
                        <span class="complexidade-count complexidade-C">C: ${grupo.complexidades['C'] || 0}</span>
                    </div>
                </div>
                <div class="cliente-details">
                    <div class="cliente-detail">
                        <span class="detail-label">Total de Clientes</span>
                        <span class="detail-value">${grupo.clientes.length}</span>
                    </div>
                    <div class="cliente-detail">
                        <span class="detail-label">Faturamento Total</span>
                        <span class="detail-value">${faturamentoFormatado}</span>
                    </div>
                </div>
                <div class="grupo-clientes-list">
                    ${grupo.clientes.map(cliente => {
                        const faturamentoCliente = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2
                        }).format(cliente.faturamento);
                        
                        return `
                            <div class="cliente-subitem">
                                <span class="cliente-subnome">${cliente.nome}</span>
                                <span class="cliente-subcomplexidade complexidade-${cliente.complexidade}">${cliente.complexidade}</span>
                                <span class="cliente-subfaturamento">${faturamentoCliente}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    // RESUMO PADRÃO - IGUAL AOS OUTROS
    const totalGrupos = grupos.length;
    const totalClientesGrupos = grupos.reduce((sum, grupo) => sum + grupo.clientes.length, 0);
    const totalFaturamentoGrupos = grupos.reduce((sum, grupo) => sum + grupo.faturamentoTotal, 0);
    const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(totalFaturamentoGrupos);

    const resumoHTML = `
        <div class="cliente-item resumo-total">
            <div class="cliente-header">
                <div class="cliente-nome">RESUMO - GRUPOS</div>
            </div>
            <div class="cliente-details">
                <div class="cliente-detail">
                    <span class="detail-label">Total de Grupos</span>
                    <span class="detail-value">${totalGrupos}</span>
                </div>
                <div class="cliente-detail">
                    <span class="detail-label">Total de Clientes</span>
                    <span class="detail-value">${totalClientesGrupos}</span>
                </div>
                <div class="cliente-detail">
                    <span class="detail-label">Faturamento Total</span>
                    <span class="detail-value">${faturamentoTotalFormatado}</span>
                </div>
            </div>
        </div>
    `;

    return `
        <div id="grupos-view" class="grupos-view" style="display: none;">
            ${resumoHTML}
            ${gruposHTML}
        </div>
    `;
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

        const cargoCarteira = collab['Cargo na carteira'] || collab.Cargo || 'N/A';

        responsibleMap.set(resp, {
            NOME: resp,
            ID: resp.toLowerCase().replace(/\s/g, ''),
            INICIAL: resp.charAt(0),
            CARGO: cargoPadronizado,
            CARGO_CARTEIRA: cargoCarteira,
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
            GRUPOS_DISTINTOS: gruposDistintos,
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
 * Alterna a visibilidade dos salários para uma seção específica
 */
function toggleSalariosPorSecao(secaoId) {
    // Inverte o estado da seção
    estadoSalariosPorSecao[secaoId] = !estadoSalariosPorSecao[secaoId];
    
    // Atualiza o botão
    atualizarBotaoSecao(secaoId);
    
    // Atualiza os cards da seção
    atualizarSalariosSecao(secaoId);
}

/**
 * Atualiza o estado visual do botão de uma seção
 */
function atualizarBotaoSecao(secaoId) {
    const botoes = document.querySelectorAll(`.role-header button[onclick="toggleSalariosPorSecao('${secaoId}')"]`);
    
    botoes.forEach(botao => {
        const icone = botao.querySelector('.privacy-icon');
        const texto = botao.querySelector('.privacy-text');
        
        if (estadoSalariosPorSecao[secaoId]) {
            botao.classList.add('active');
            icone.textContent = '💰';
            texto.textContent = 'Ocultar';
        } else {
            botao.classList.remove('active');
            icone.textContent = '💰️';
            texto.textContent = 'Salários';
        }
    });
}

/**
 * Atualiza a visibilidade dos salários em uma seção específica
 */
function atualizarSalariosSecao(secaoId) {
    const containerId = `${secaoId}-cards`;
    const cardsContainer = document.getElementById(containerId);
    
    if (!cardsContainer) return;
    
    const cards = cardsContainer.querySelectorAll('.team-card');
    
    cards.forEach(card => {
        const infoList = card.querySelector('.info-list');
        
        if (estadoSalariosPorSecao[secaoId]) {
            // Mostrar salário - adiciona a linha
            if (!card.querySelector('.info-item-salario')) {
                const memberId = card.getAttribute('onclick').match(/openModal\('([^']+)'\)/)[1];
                const member = teamData.find(m => m.ID === memberId);
                
                if (member) {
                    const salarioItem = document.createElement('div');
                    salarioItem.className = 'info-item info-item-salario';
                    salarioItem.innerHTML = `
                        <span class="info-label">Salário</span>
                        <span class="info-value currency-value">R$ ${member.SALARIO}</span>
                    `;
                    infoList.appendChild(salarioItem);
                }
            }
        } else {
            // Ocultar salário - remove a linha
            const salarioItem = card.querySelector('.info-item-salario');
            if (salarioItem) {
                salarioItem.remove();
            }
        }
    });
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
    
    // Título para os cards fixos COM BOTÃO
    const headerFixoHTML = `
        <div class="role-header">
            <h2>Desenvolvedores</h2>
            <button class="privacy-toggle-btn" onclick="toggleSalariosPorSecao('desenvolvedores')">
                <span class="privacy-icon">💰️</span>
                <span class="privacy-text">Salários</span>
            </button>
        </div>
    `;
    roleSectionFixa.innerHTML = headerFixoHTML;
    
    const cardsContainerFixo = document.createElement('div');
    cardsContainerFixo.className = 'role-cards-container';
    cardsContainerFixo.id = 'desenvolvedores-cards';

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

        // 3a. Cria o TÍTULO/SEPARADOR para o cargo COM BOTÃO
        const roleId = roleName.toLowerCase().replace(/\s+/g, '-');
        const roleTitleHtml = `
            <div class="role-header">
                <h2>${roleName}</h2>
                <button class="privacy-toggle-btn" onclick="toggleSalariosPorSecao('${roleId}')">
                    <span class="privacy-icon">💰️</span>
                    <span class="privacy-text">Salários</span>
                </button>
            </div>
        `;
        roleSection.innerHTML = roleTitleHtml;

        // 3b. Cria o contêiner de rolagem (Netflix style)
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'role-cards-container';
        cardsContainer.id = `${roleId}-cards`;
        
        // 3c. Renderiza os CARDS de cada membro dentro do container de rolagem (SEM SALÁRIO INICIALMENTE)
        members.forEach(member => {
            const memberId = member.ID;
            
            // Usa o HEX direto do JS para o cargo
            const baseColorHex = roleStripColorMap[member.CARGO] || roleStripColorMap['Outros'];
            
            // Calcula a cor mais escura para o degradê (30% mais escuro)
            const darkerColor = darkenColor(baseColorHex, 0.7);
            const lighterColor = lightenColor(baseColorHex, 0.2);

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

            // Formatação dos valores monetários
            const faturamentoFormatado = new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL', 
                minimumFractionDigits: 2 
            }).format(member.FATURAMENTO_TOTAL);

            // CARD SEM LINHA DE SALÁRIO (apenas 3 linhas)
            const cardHtml = `
                <div class="team-card" onclick="openModal('${memberId}')"> 
                    
                    <div class="card-header" style="background: linear-gradient(to right,${baseColorHex},${lighterColor});">
                        <div class="card-photo">
                            ${photoContent}
                        </div>
                        <div class="card-header-info">
                            <h2>${member.NOME}</h2>
                            <div class="role">${secondaryInfo}</div>
                            <div class="cargo-carteira">${member.CARGO_CARTEIRA || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="info-list">
                            <div class="info-item">
                                <span class="info-label">Clientes</span>
                                <span class="info-value">${member.CLIENTES_TOTAIS}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Grupos</span>
                                <span class="info-value">${member.GRUPOS_DISTINTOS || 0}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Faturamento</span>
                                <span class="info-value currency-value">${faturamentoFormatado}</span>
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

        let stat3Titulo = member.STAT_3_TITULO;
        let stat3Display = '';   // string final que aparecerá no modal
        let stat3Trend = '';     // possível seta/indicador

        if (member.DEPARTAMENTO === "DP - DEPTO PESSOAL") {

            const clientesDoColab = clientData.filter(c =>
                (c.Responsável || c.Responsavel || c['responsavel']) === member.NOME
            );

            const vidasTotal = clientesDoColab.reduce((s, c) => s + (parseInt(c.Vidas) || 0), 0);
            const admissoesTotal = clientesDoColab.reduce((s, c) => s + (parseInt(c.Admissões) || 0), 0);
            const demissoesTotal = clientesDoColab.reduce((s, c) => s + (parseInt(c["Demissões"]) || 0), 0);

            stat3HTML = `
                <div class="stat-item">
                    <div class="stat-title">Vidas</div>
                    <div class="stat-value">${vidasTotal}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">Admissões</div>
                    <div class="stat-value">${admissoesTotal}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-title">Demissões</div>
                    <div class="stat-value">${demissoesTotal}</div>
                </div>
            `;

        } else {
            // MODO NORMAL — usa faturamento já existente
            const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(member.STAT_3_VALOR || 0);

            const trend = member.STAT_3_VALOR > 0 ? '<span class="positive">↑</span>' : '';

            stat3HTML = `
                <div class="stat-item">
                    <div class="stat-title">${member.STAT_3_TITULO}</div>
                    <div class="stat-value">${faturamentoFormatado} ${trend}</div>
                </div>
            `;
        }
        // depois, no statsRowHTML, substitua as referências por:
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
                ${stat3HTML}
            </div>
        `;

        const finalProgressPercentage = member.PROGRESSO_VALOR;
        const finalProgressAngle = (finalProgressPercentage / 100) * 360;
        const complexidadeCounts = member.COMPLEXIDADE_COUNT;
        const totalClients = member.CLIENTES_TOTAIS;
        const totalTasks = member.TAREFAS_TOTAIS;
        const pontuacaoTotal = taskData
            .filter(t => (t.Responsável || t.Responsavel || t['responsavel']) === member.NOME)
            .reduce((sum, t) => sum + (parseInt(t.Pontuação) || 0), 0);
        // RANK MÉDIO DO COLABORADOR
        const ranks = taskData.filter(t =>
            (t.Responsável || t.Responsavel || t['responsavel']) === member.NOME
        ).map(t => parseInt(t.Rank) || 0);

        const rankMedio = ranks.length > 0
            ? Math.round(ranks.reduce((sum, r) => sum + r, 0) / ranks.length)
            : 0;

        // RANK TOTAL MÉDIO
        const ranksTotais = taskData.filter(t =>
            (t.Responsável || t.Responsavel || t['responsavel']) === member.NOME
        ).map(t => parseInt(t["Rank Total"]) || 0);

        const rankTotalMedio = ranksTotais.length > 0
            ? Math.round(ranksTotais.reduce((sum, r) => sum + r, 0) / ranksTotais.length)
            : 0;




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
                    <p style="text-align: center; font-size: 0.8rem; color: var(--dark-secondary-text); margin-top: 10px;">
                        ${pontuacaoTotal} pontos
                    </p>
                    <p style="text-align: center; font-size: 0.8rem; color: var(--dark-secondary-text); margin-top: 2px;">
                        Rank ${rankMedio}/${rankTotalMedio}
                    </p>
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
                        <div class="profile-info-text-vertical">
                            <h2>${member.NOME}</h2>
                            <div class="profile-details-list">
                                <div class="detail-value-only">${member.CARGO_CARTEIRA}</div>
                                <div class="detail-value-only">${member.DEPARTAMENTO}</div>
                                <div class="detail-value-only">Desde: ${member.DATA_ADMISSAO}</div>
                                <div class="detail-value-only salary-value">Salário: R$ ${member.SALARIO}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${statsRowHTML}
                    
                    ${complexityBarsHTML}
                    
                    ${modalButtonsHTML}
                    
                </div>
            </div>
        `;
        // MODIFICAÇÃO: Adiciona classe condicional para salário no modal
        const classeSalarioModal = salariosVisiveis ? '' : 'salario-oculto';
        
        // SEMPRE MOSTRA SALÁRIO NO MODAL (visualização detalhada)
        const profileAdmissionsHTML = `
            <div class="profile-admissions">
                <span>Desde: ${member.DATA_ADMISSAO} | Salário: <span class="salary">R$ ${member.SALARIO}</span></span>
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
    
    // Ordenar clientes por complexidade (A -> B -> C)
    clientes.sort((a, b) => {
        const ordemComplexidade = { 'A': 1, 'B': 2, 'C': 3 };
        return ordemComplexidade[a.complexidade] - ordemComplexidade[b.complexidade];
    });

    // Calcular grupos
    const gruposMap = new Map();
    clientes.forEach(cliente => {
        const grupo = cliente.grupo || 'Sem Grupo';
        if (!gruposMap.has(grupo)) {
            gruposMap.set(grupo, {
                nome: grupo,
                clientes: [],
                complexidades: { 'A': 0, 'B': 0, 'C': 0 },
                faturamentoTotal: 0
            });
        }
        
        const grupoData = gruposMap.get(grupo);
        grupoData.clientes.push(cliente);
        if (grupoData.complexidades[cliente.complexidade] !== undefined) {
            grupoData.complexidades[cliente.complexidade]++;
        }
        grupoData.faturamentoTotal += cliente.faturamento;
    });

    const grupos = Array.from(gruposMap.values());

    // Atualiza o título do sidebar
    const titleElement = sidebar.querySelector('.clientes-sidebar-title');
    if (titleElement) {
        let titleText = `${member.NOME}`;
        if (filterCompetencia) {
            titleText += ` - ${filterCompetencia}`;
        }
        titleElement.textContent = titleText;
    }

    // Renderizar views
    const clientesViewHTML = renderClientesView(clientes);
    const gruposViewHTML = renderGruposView(grupos);

    // NOVA ESTRUTURA COM SCROLL ÚNICO
    const sidebarContent = `
        <div class="clientes-main-content">
            <div class="clientes-toggle-container">
                <div class="clientes-toggle-buttons">
                    <button class="toggle-btn active" data-view="clientes">Clientes</button>
                    <button class="toggle-btn" data-view="grupos">Grupos</button>
                </div>
            </div>
            <div class="clientes-content">
                ${clientesViewHTML}
                ${gruposViewHTML}
            </div>
        </div>
    `;

    clientesList.innerHTML = sidebarContent;

    // Adicionar event listeners aos botões de toggle
    setTimeout(() => {
        const toggleButtons = clientesList.querySelectorAll('.toggle-btn');
        const clientesView = document.getElementById('clientes-view');
        const gruposView = document.getElementById('grupos-view');
        
        // Inicialmente mostrar apenas clientes
        if (gruposView) gruposView.style.display = 'none';
        
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remover active de todos
                toggleButtons.forEach(b => b.classList.remove('active'));
                // Adicionar active ao clicado
                this.classList.add('active');
                
                const view = this.getAttribute('data-view');
                
                if (view === 'clientes') {
                    if (clientesView) clientesView.style.display = 'block';
                    if (gruposView) gruposView.style.display = 'none';
                } else {
                    if (clientesView) clientesView.style.display = 'none';
                    if (gruposView) gruposView.style.display = 'block';
                }
            });
        });
    }, 100);

    // Abre o sidebar
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
}

/**
 * Renderiza a view de clientes
 */
function renderClientesView(clientes) {
    if (clientes.length === 0) {
        return `
            <div id="clientes-view" class="clientes-view">
                <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text); padding: 30px;">
                    Nenhum cliente encontrado para este colaborador
                </div>
            </div>
        `;
    }

    const clientesHTML = clientes.map(cliente => {
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

    // NOVO RESUMO COM DESIGN MELHORADO
    const totalClientes = clientes.length;
    const totalFaturamento = clientes.reduce((sum, cliente) => sum + cliente.faturamento, 0);
    const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(totalFaturamento);

    const resumoHTML = `
        <div class="cliente-item resumo-total">
            <div class="cliente-header">
                <div class="cliente-nome">RESUMO - CLIENTES</div>
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

    return `
        <div id="clientes-view" class="clientes-view">
            ${resumoHTML}
            ${clientesHTML}
        </div>
    `;
}

/**
 * Renderiza a view de grupos
 */
function renderGruposView(grupos) {
    if (grupos.length === 0) {
        return `
            <div id="grupos-view" class="grupos-view" style="display: none;">
                <div class="cliente-item" style="text-align: center; color: var(--dark-secondary-text); padding: 30px;">
                    Nenhum grupo encontrado para este colaborador
                </div>
            </div>
        `;
    }

    const gruposHTML = grupos.map(grupo => {
        const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(grupo.faturamentoTotal);

        return `
            <div class="cliente-item grupo-item">
                <div class="cliente-header">
                    <div class="cliente-nome">${grupo.nome}</div>
                    <div class="grupo-stats">
                        <span class="complexidade-count complexidade-A">A: ${grupo.complexidades['A'] || 0}</span>
                        <span class="complexidade-count complexidade-B">B: ${grupo.complexidades['B'] || 0}</span>
                        <span class="complexidade-count complexidade-C">C: ${grupo.complexidades['C'] || 0}</span>
                    </div>
                </div>
                <div class="cliente-details">
                    <div class="cliente-detail">
                        <span class="detail-label">Total de Clientes</span>
                        <span class="detail-value">${grupo.clientes.length}</span>
                    </div>
                    <div class="cliente-detail">
                        <span class="detail-label">Faturamento Total</span>
                        <span class="detail-value">${faturamentoFormatado}</span>
                    </div>
                </div>
                <div class="grupo-clientes-list">
                    ${grupo.clientes.map(cliente => {
                        const faturamentoCliente = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2
                        }).format(cliente.faturamento);
                        
                        return `
                            <div class="cliente-subitem">
                                <span class="cliente-subnome">${cliente.nome}</span>
                                <span class="cliente-subcomplexidade complexidade-${cliente.complexidade}">${cliente.complexidade}</span>
                                <span class="cliente-subfaturamento">${faturamentoCliente}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // NOVO RESUMO PARA GRUPOS COM DESIGN MELHORADO
    const totalGrupos = grupos.length;
    const totalClientesGrupos = grupos.reduce((sum, grupo) => sum + grupo.clientes.length, 0);
    const totalFaturamentoGrupos = grupos.reduce((sum, grupo) => sum + grupo.faturamentoTotal, 0);
    const faturamentoTotalFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(totalFaturamentoGrupos);

    const resumoHTML = `
        <div class="cliente-item resumo-total">
            <div class="cliente-header">
                <div class="cliente-nome">RESUMO - GRUPOS</div>
            </div>
            <div class="cliente-details">
                <div class="cliente-detail">
                    <span class="detail-label">Total de Grupos</span>
                    <span class="detail-value">${totalGrupos}</span>
                </div>
                <div class="cliente-detail">
                    <span class="detail-label">Total de Clientes</span>
                    <span class="detail-value">${totalClientesGrupos}</span>
                </div>
                <div class="cliente-detail">
                    <span class="detail-label">Faturamento Total</span>
                    <span class="detail-value">${faturamentoTotalFormatado}</span>
                </div>
            </div>
        </div>
    `;

    return `
        <div id="grupos-view" class="grupos-view" style="display: none;">
            ${resumoHTML}
            ${gruposHTML}
        </div>
    `;
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

    // Ordenar por complexidade (A -> B -> C)
    return clientesFiltrados.sort((a, b) => {
        const ordemComplexidade = { 'A': 1, 'B': 2, 'C': 3, 'N/A': 4 };
        return ordemComplexidade[a.complexidade] - ordemComplexidade[b.complexidade];
    });

}



// ----------------------------------------------------------------------
// INICIALIZAÇÃO
// ----------------------------------------------------------------------

// No final do script.js, adicione:
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
    
    // INICIALIZA O BOTÃO DE PRIVACIDADE
    atualizarEstadoBotaoPrivacidade();
});

