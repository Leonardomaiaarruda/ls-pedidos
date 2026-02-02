(function validarSessaoBlindada() {
    const token = sessionStorage.getItem('lstech_token');
    if (!token) {
        sessionStorage.clear();
        window.location.replace('index.html'); 
    }
})();

function logout() {
    if(confirm("Deseja realmente sair do sistema?")) {
        sessionStorage.clear();
        localStorage.removeItem('lstech_auth');
        window.location.href = 'index.html';
    }
}

// Configurações de API
const URL_API = "https://script.google.com/macros/s/AKfycbyZPyhDd70Ez-KbJBBTl07Vffpf6Vl2Qexi00Qh1BJdIFbHU7aq50ONE74GEVpeqMZIZg/exec";
const URL_EPIS = URL_API + "?aba=epis"; 
let dadosPedidos = [];
let precosEpis = {}; 

// 1. INTEGRAÇÃO DE PREÇOS (Busca os valores na aba 'epis' coluna B)
async function carregarPrecos() {
    try {
        const resp = await fetch(URL_EPIS);
        const matriz = await resp.json();
        // Mapeia o nome do EPI (A) para o Preço (B)
        matriz.slice(1).forEach(linha => {
            const nomeEpi = String(linha[0]).trim();
            const preco = parseFloat(linha[1]) || 0;
            precosEpis[nomeEpi] = preco;
        });
        console.log("Preços carregados da aba epis.");
    } catch (err) {
        console.error("Erro ao carregar lista de preços:", err);
    }
}

// 2. CARREGAR DADOS DOS PEDIDOS
async function carregarDados() {
    const txtStatus = document.getElementById('txtStatus');
    const pontoStatus = document.getElementById('pontoStatus');

    try {
        const response = await fetch(URL_API, { redirect: 'follow' });
        const matriz = await response.json();
        
        dadosPedidos = matriz.slice(1)
            .filter(linha => linha[0] && linha[1]) 
            .map(linha => {
                const dataObjeto = linha[2] ? new Date(linha[2]) : new Date();
                return {
                    funcionario: String(linha[0]).trim(),
                    epi: String(linha[1]).trim(),
                    data: dataObjeto,
                    dataTexto: linha[2] ? new Date(linha[2]).toLocaleDateString('pt-BR') : "S/D",
                    devolucao: linha[3] ? String(linha[3]).toUpperCase().trim() : "NÃO",
                    mes: dataObjeto.getMonth(),
                    ano: dataObjeto.getFullYear()
                };
            });

        popularSelectFunc(); 
        processarDashboard();

        if(pontoStatus) pontoStatus.style.backgroundColor = "#28a745";
        if(txtStatus) txtStatus.textContent = "Dados atualizados em tempo real";
        
    } catch (err) {
        console.error(err);
        if(pontoStatus) pontoStatus.style.backgroundColor = "#dc3545";
        if(txtStatus) txtStatus.textContent = "Erro ao conectar com a base de dados";
    }
}

// No processarDashboard, atualizei o cálculo do EPI Top e removi a média
function processarDashboard() {
    const periodo = document.getElementById('filtroPeriodo').value;
    const filtroDev = document.getElementById('filtroDevolucao').value; 
    const filtroColab = document.getElementById('filtroColaborador').value; 
    const hoje = new Date();
    
    let custoTotalNaoDevolvido = 0;
    const contagemGeralEpi = {}; // Para achar o EPI Top
    const contagemSaidas = {};
    const contagemDevolucoes = {};

    const filtrados = dadosPedidos.filter(d => {
        let bP = false;
        if (periodo === 'mes') bP = (d.mes === hoje.getMonth() && d.ano === hoje.getFullYear());
        else if (periodo === 'ano') bP = (d.ano === hoje.getFullYear());
        else if (periodo === 'total') bP = true;
        else if (periodo === 'custom') {
            const i = new Date(document.getElementById('dataInicio').value + "T00:00:00");
            const f = new Date(document.getElementById('dataFim').value + "T23:59:59");
            bP = (d.data >= i && d.data <= f);
        }
        return bP && (filtroDev === 'TODOS' || d.devolucao === filtroDev) && (filtroColab === 'TODOS' || d.funcionario === filtroColab);
    });

    filtrados.forEach(d => {
        contagemGeralEpi[d.epi] = (contagemGeralEpi[d.epi] || 0) + 1;
        if (d.devolucao === "SIM") {
            contagemDevolucoes[d.epi] = (contagemDevolucoes[d.epi] || 0) + 1;
        } else {
            contagemSaidas[d.epi] = (contagemSaidas[d.epi] || 0) + 1;
            custoTotalNaoDevolvido += (precosEpis[d.epi] || 0);
        }
    });

    // Atualiza KPIs
    document.getElementById('totalMes').textContent = filtrados.length;
    document.getElementById('custoTotal').textContent = custoTotalNaoDevolvido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // EPI Mais Requisitado
    const topEpi = Object.entries(contagemGeralEpi).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('epiTop').textContent = topEpi ? `${topEpi[0]} (${topEpi[1]}x)` : "---";

    gerarRelatorioIndividual(filtrados);
    renderizarGrafico(contagemSaidas, contagemDevolucoes);
}

// FUNÇÃO DA TABELA ATUALIZADA (Preço R$ 0,00 se devolvido)
function gerarRelatorioIndividual(filtrados) {
    const tbody = document.querySelector('#tabelaAnalise tbody');
    tbody.innerHTML = '';
    
    [...filtrados].sort((a, b) => b.data - a.data).forEach(reg => {
        const precoUnit = precosEpis[reg.epi] || 0;
        const freq = filtrados.filter(f => f.epi === reg.epi && f.funcionario === reg.funcionario && f.devolucao !== "SIM").length;
        
        const tr = document.createElement('tr');
        let statusHtml = "";

        if (reg.devolucao === "SIM") {
            tr.style.backgroundColor = "#dcfce7";
            tr.style.color = "#166534";
            statusHtml = `
                <span class="badge" style="background:#166534; color:white;">DEVOLVIDO</span>
                <div style="font-size: 0.75rem; margin-top:4px;">R$ 0,00</div>`;
        } else {
            tr.style.backgroundColor = "#fee2e2";
            tr.style.color = "#991b1b";
            
            let corBadge = "background:#e2e8f0; color:#475569;";
            if(freq >= 5) corBadge = "background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;";
            else if(freq >= 3) corBadge = "background:#fef3c7; color:#92400e; border:1px solid #fcd34d;";

            statusHtml = `
                <span class="badge" style="${corBadge}">${freq}x</span>
                <div style="font-size: 0.8rem; font-weight:bold; margin-top:4px;">
                    ${precoUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>`;
        }

        tr.innerHTML = `
            <td>${reg.funcionario}</td>
            <td><strong>${reg.epi}</strong></td>
            <td>${reg.dataTexto}</td>
            <td style="text-align:center;">${statusHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 4. POPULAR SELECT (Apenas colaboradores com pedidos realizados)
function popularSelectFunc() {
    const select = document.getElementById('filtroColaborador');
    if (!select || !dadosPedidos.length) return;
    const nomesPresentes = [...new Set(dadosPedidos.map(d => d.funcionario))].filter(n => n).sort();
    const valorAtual = select.value;
    select.innerHTML = '<option value="TODOS">-- Todos os Colaboradores --</option>';
    nomesPresentes.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome; opt.textContent = nome;
        select.appendChild(opt);
    });
    select.value = valorAtual || "TODOS";
}

// 5. RELATÓRIO INDIVIDUAL E BADGES DE FREQUÊNCIA (Xx) + PREÇO UNITÁRIO
function gerarRelatorioIndividual(filtrados) {
    const tbody = document.querySelector('#tabelaAnalise tbody');
    const filtroColab = document.getElementById('filtroColaborador').value;
    tbody.innerHTML = '';
    
    document.getElementById('tituloRelatorio').textContent = filtroColab !== "TODOS" ? 
        `Análise Detalhada: ${filtroColab}` : "Resumo Geral de Utilização";

    const ordenados = [...filtrados].sort((a, b) => b.data - a.data);

    ordenados.forEach(reg => {
        // Busca o preço no dicionário carregado da aba 'epis'
        const precoUnitario = precosEpis[reg.epi] || 0;
        
        // Lógica de Frequência do Item (Apenas para saídas)
        const frequenciaEpi = filtrados.filter(f => f.epi === reg.epi && f.funcionario === reg.funcionario && f.devolucao !== "SIM").length;
        
        let estiloBadge = "background: #e2e8f0; color: #475569;"; 
        if (frequenciaEpi >= 5) {
            estiloBadge = "background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;"; 
        } else if (frequenciaEpi >= 3) {
            estiloBadge = "background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;"; 
        }

        const tr = document.createElement('tr');
        
        // Define o que mostrar na coluna de Preço/Status
        let conteudoStatus = "";
        if (reg.devolucao === "SIM") {
            tr.style.backgroundColor = "#dcfce7"; // Verde
            tr.style.color = "#166534";
            conteudoStatus = `
                <span class="badge" style="background: #166534; color: white;">DEVOLVIDO</span>
                <div style="font-size: 0.75rem; margin-top: 4px; opacity: 0.8;">R$ 0,00</div>
            `;
        } else {
            tr.style.backgroundColor = "#fee2e2"; // Vermelho
            tr.style.color = "#991b1b";
            conteudoStatus = `
                <span class="badge" style="${estiloBadge}">${frequenciaEpi}x</span>
                <div style="font-size: 0.8rem; font-weight: bold; margin-top: 4px;">
                    ${precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            `;
        }

        tr.innerHTML = `
            <td>${reg.funcionario}</td>
            <td><strong>${reg.epi}</strong></td>
            <td>${reg.dataTexto}</td>
            <td style="text-align: center;">
                ${conteudoStatus}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// 6. RENDERIZAR GRÁFICO (Chart.js)
let meuGrafico = null;
function renderizarGrafico(contagemSaidas, contagemDevolucoes) {
    const ctx = document.getElementById('graficoEpi').getContext('2d');
    if (meuGrafico) meuGrafico.destroy();
    
    const todosEPIs = [...new Set([...Object.keys(contagemSaidas), ...Object.keys(contagemDevolucoes)])];
    
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels], 
        data: {
            labels: todosEPIs,
            datasets: [
                { label: 'Saídas', data: todosEPIs.map(e => contagemSaidas[e] || 0), backgroundColor: '#ef4444', borderRadius: 5 },
                { label: 'Devoluções', data: todosEPIs.map(e => contagemDevolucoes[e] || 0), backgroundColor: '#22c55e', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : '' } }
        }
    });
}

// Funções de Interface
function filtrarTabelaPorTexto() {
    const termo = document.getElementById('inputBuscaRapida').value.toLowerCase();
    document.querySelectorAll('#tabelaAnalise tbody tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
}

function toggleDatasPersonalizadas() {
    const divDatas = document.getElementById('divDatasPersonalizadas');
    divDatas.style.display = document.getElementById('filtroPeriodo').value === 'custom' ? 'flex' : 'none';
    if (divDatas.style.display === 'none') processarDashboard();
}

// 7. INICIALIZAÇÃO SÍNCRONA
document.addEventListener('DOMContentLoaded', async () => {
    await carregarPrecos(); // Primeiro carrega os preços
    await carregarDados();  // Depois os pedidos
});
