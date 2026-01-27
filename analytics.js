(function validarSessaoBlindada() {
    const token = sessionStorage.getItem('lstech_token');

    if (!token) {
        sessionStorage.clear();
        window.location.replace('index.html'); 
    }
})();

function logout() {
    if(confirm("Deseja realmente sair do sistema?")) {
        localStorage.removeItem('lstech_auth');
        window.location.href = 'index.html';
    }
}



// URL da sua Planilha de Pedidos
const URL_API = "https://script.google.com/macros/s/AKfycbyZPyhDd70Ez-KbJBBTl07Vffpf6Vl2Qexi00Qh1BJdIFbHU7aq50ONE74GEVpeqMZIZg/exec";
let dadosPedidos = [];

async function carregarDados() {
    const txtStatus = document.getElementById('txtStatus');
    const pontoStatus = document.getElementById('pontoStatus');

    try {
        const response = await fetch(URL_API, { redirect: 'follow' });
        const matriz = await response.json();
        
        // Processamento blindado contra linhas vazias
        dadosPedidos = matriz.slice(1)
            .filter(linha => linha[0] && linha[1]) // Garante que tem funcionário e EPI
            .map(linha => {
                const dataObjeto = linha[2] ? new Date(linha[2]) : new Date();
                return {
                    funcionario: String(linha[0]).trim(),
                    epi: String(linha[1]).trim(),
                    data: dataObjeto,
                    dataTexto: linha[2] ? new Date(linha[2]).toLocaleDateString('pt-BR') : "S/D",
                    mes: dataObjeto.getMonth(),
                    ano: dataObjeto.getFullYear()
                };
            });

        if(pontoStatus) pontoStatus.style.backgroundColor = "#28a745";
        if(txtStatus) txtStatus.textContent = "Dados atualizados em tempo real";
        
        processarDashboard();
    } catch (err) {
        console.error(err);
        if(pontoStatus) pontoStatus.style.backgroundColor = "#dc3545";
        if(txtStatus) txtStatus.textContent = "Erro ao conectar com a base de dados";
    }
}

function processarDashboard() {
    const periodo = document.getElementById('filtroPeriodo').value;
    const hoje = new Date();
    
    // 1. Filtro de Período Inteligente
    const filtrados = dadosPedidos.filter(d => {
        if (periodo === 'mes') return d.mes === hoje.getMonth() && d.ano === hoje.getFullYear();
        if (periodo === 'ano') return d.ano === hoje.getFullYear();
        return true; // Histórico Total
    });

    // 2. KPI: Total de Pedidos no período
    document.getElementById('totalMes').textContent = filtrados.length;

    // 3. KPI: EPI Mais Requisitado (Top 1)
    const contagemEPI = {};
    filtrados.forEach(d => contagemEPI[d.epi] = (contagemEPI[d.epi] || 0) + 1);
    const listaEPIs = Object.entries(contagemEPI).sort((a,b) => b[1] - a[1]);
    const topEPI = listaEPIs[0];
    document.getElementById('epiTop').innerHTML = topEPI ? 
        `${topEPI[0]} <br><span style="font-size: 0.9rem; color: #666;">(${topEPI[1]} unid.)</span>` : "---";

    // 4. KPI: Média de Consumo (Itens por Colaborador)
    const consumoPorUser = {};
    filtrados.forEach(d => {
        consumoPorUser[d.funcionario] = (consumoPorUser[d.funcionario] || 0) + 1;
    });
    
    const qtdColaboradores = Object.keys(consumoPorUser).length;
    const media = qtdColaboradores > 0 ? (filtrados.length / qtdColaboradores).toFixed(1) : 0;
    document.getElementById('mediaConsumo').textContent = media;

    // 5. Alertas de Desperdício (50% acima da média do grupo)
    const areaAlertas = document.getElementById('listaAlertas');
    areaAlertas.innerHTML = "";
    
    Object.entries(consumoPorUser).forEach(([nome, qtd]) => {
        if (qtd > media * 1.5 && media > 0) {
            const div = document.createElement('div');
            div.className = "alerta-item";
            div.style.borderLeft = "4px solid #dc3545";
            div.style.backgroundColor = "#fff5f5";
            div.style.padding = "10px";
            div.style.marginBottom = "5px";
            div.innerHTML = `⚠️ <strong>${nome}</strong>: ${qtd} itens (Média da equipe é ${media})`;
            areaAlertas.appendChild(div);
        }
    });

    if (areaAlertas.innerHTML === "") {
        areaAlertas.innerHTML = "<p style='color: #28a745;'>✅ Consumo dentro da normalidade.</p>";
    }

    popularSelectFunc(Object.keys(consumoPorUser).sort());
    gerarRelatorioIndividual(filtrados);
    renderizarGrafico(contagemEPI);
}

function popularSelectFunc(nomes) {
    const select = document.getElementById('filtroFuncionario');
    const atual = select.value;
    select.innerHTML = '<option value="">Todos os Colaboradores</option>';
    nomes.forEach(n => {
        let opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        select.appendChild(opt);
    });
    select.value = atual;
}

function gerarRelatorioIndividual(dadosParaTabela = null) {
    const nomeBusca = document.getElementById('filtroFuncionario').value;
    const tbody = document.querySelector('#tabelaAnalise tbody');
    
    // 1. Define a fonte de dados e limpa a tabela
    let filtrados = dadosParaTabela || [...dadosPedidos]; // Usa cópia para não afetar o original
    tbody.innerHTML = '';
    
    // 2. Filtra por nome se houver um selecionado
    if (nomeBusca) {
        filtrados = filtrados.filter(r => r.funcionario === nomeBusca);
    }

    // 3. ORDENAÇÃO DECRESCENTE (O mais recente no topo)
    // Garante que b.data e a.data sejam objetos Date para a subtração funcionar
    filtrados.sort((a, b) => new Date(b.data) - new Date(a.data));

    document.getElementById('tituloRelatorio').textContent = nomeBusca ? 
        `Análise Detalhada: ${nomeBusca}` : "Resumo Geral de Utilização";

    filtrados.forEach(reg => {
        // 4. CÁLCULO DE FREQUÊNCIA (No contexto dos dados filtrados)
        const frequenciaEpi = filtrados.filter(f => f.epi === reg.epi && f.funcionario === reg.funcionario).length;
        
        // 5. LÓGICA DE CORES (Alertas Visuais)
        let estiloBadge = "background: #e2e8f0; color: #475569;"; // Padrão: Cinza
        
        if (frequenciaEpi >= 5) {
            estiloBadge = "background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;"; // Crítico: Vermelho
        } else if (frequenciaEpi >= 3) {
            estiloBadge = "background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;"; // Atenção: Amarelo
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${reg.funcionario}</td>
            <td><strong>${reg.epi}</strong></td>
            <td>${reg.dataTexto}</td>
            <td>
                <span class="badge" style="padding: 5px 10px; border-radius: 12px; font-weight: bold; ${estiloBadge}">
                    ${frequenciaEpi}x
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let meuGrafico = null;

function renderizarGrafico(contagemEPI) {
    const ctx = document.getElementById('graficoEpi').getContext('2d');
    
    if (meuGrafico) {
        meuGrafico.destroy();
    }

    const labels = Object.keys(contagemEPI);
    const valores = Object.values(contagemEPI);
    
    // Calcula o maior valor para ajustar o teto do gráfico
    const maxValor = Math.max(...valores, 0);

    meuGrafico = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels], 
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade',
                data: valores,
                backgroundColor: '#3498db',
                borderRadius: 5,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 30 // Espaço extra no topo para o número não cortar
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#444', // Cor escura para ler fora da barra
                    anchor: 'end', // Prende no topo da barra
                    align: 'top',  // Posiciona ACIMA da barra
                    offset: 4,     // Distância da barra
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    formatter: (value) => value
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    suggestedMax: maxValor + 2, // Garante que o teto seja sempre maior que a maior barra
                    ticks: { 
                        precision: 0,
                        stepSize: 1 // Força escala de 1 em 1 (evita decimais)
                    }
                }
            }
        }
    });
}


function filtrarTabelaPorTexto() {
    const termo = document.getElementById('inputBuscaRapida').value.toLowerCase();
    const linhas = document.querySelectorAll('#tabelaAnalise tbody tr');

    linhas.forEach(linha => {
        // Pega o texto da primeira coluna (nome do funcionário)
        const nomeFuncionario = linha.querySelector('td:first-child').textContent.toLowerCase();
        
        // Se o termo digitado estiver no nome, mostra a linha, senão esconde
        if (nomeFuncionario.includes(termo)) {
            linha.style.display = "";
        } else {
            linha.style.display = "none";
        }
    });
}


document.addEventListener('DOMContentLoaded', carregarDados);