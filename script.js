// 1. Validação de Sessão
(function validarSessaoBlindada() {
    const token = sessionStorage.getItem('lstech_token');
    if (!token) {
        sessionStorage.clear();
        window.location.replace('index.html'); 
    }
})();

// 2. URLs
const URL_NOMES = "https://script.google.com/macros/s/AKfycbyp9Loue9IK_vcGw2HLIohWEQAj0rRPAm9zXyqeDnakZ4iLpslQ8nAC29upM-PARHftCg/exec";
const URL_BASE_SISTEMA = "https://script.google.com/macros/s/AKfycbyZPyhDd70Ez-KbJBBTl07Vffpf6Vl2Qexi00Qh1BJdIFbHU7aq50ONE74GEVpeqMZIZg/exec";
const URL_EPIS = URL_BASE_SISTEMA + "?aba=epis";
const URL_PEDIDOS = URL_BASE_SISTEMA; 


// --- FUNÇÃO: Sincronizar Listas (Corrigida) ---
async function sincronizarNomes() {
    // Busca os elementos garantindo que existam
    const selectFunc = document.getElementById('selectFuncionario');
    const selectEpi = document.getElementById('selectEpi');
    const txtStatus = document.getElementById('txtStatus') || document.getElementById('statusNomes');
    const pontoStatus = document.getElementById('pontoStatus');

    if (!selectFunc || !selectEpi) return;

    try {
        if(txtStatus) txtStatus.textContent = "⏳ Sincronizando listas...";
        
        // Sincronização em paralelo para ser mais rápido
        const [respFunc, respEpi] = await Promise.all([
            fetch(URL_NOMES, { redirect: 'follow' }),
            fetch(URL_EPIS, { redirect: 'follow' })
        ]);

        const dadosFunc = await respFunc.json();
        const dadosEpi = await respEpi.json();

        // Processar Nomes
        const nomesFunc = [...new Set(dadosFunc.slice(1).map(linha => linha[0]))].filter(n => n).sort();
        selectFunc.innerHTML = '<option value="">-- Selecione o Funcionário --</option>';
        nomesFunc.forEach(n => {
            let opt = document.createElement('option');
            opt.value = n; opt.textContent = n;
            selectFunc.appendChild(opt);
        });

        // Processar EPIs
        const listaEpis = [...new Set(dadosEpi.slice(1).map(linha => linha[0]))].filter(e => e).sort();
        selectEpi.innerHTML = '<option value="">-- Selecione o EPI --</option>';
        listaEpis.forEach(e => {
            let opt = document.createElement('option');
            opt.value = e; opt.textContent = e;
            selectEpi.appendChild(opt);
        });

        // Sucesso
        if(txtStatus) {
            txtStatus.textContent = "✅ Listas Atualizadas!";
            txtStatus.style.color = "#28a745";
        }
        if (pontoStatus) pontoStatus.style.backgroundColor = "#28a745";

    } catch (e) {
        console.error("Erro na sincronização:", e);
        if(txtStatus) {
            txtStatus.textContent = "❌ Erro ao sincronizar dados";
            txtStatus.style.color = "#dc3545";
        }
        if (pontoStatus) pontoStatus.style.backgroundColor = "#dc3545";
    }
}

// --- CONFIGURAÇÃO DE DATA ---
function configurarDataAtual() {
    const campoData = document.getElementById('dataPedido');
    if (campoData) {
        const hoje = new Date();
        campoData.value = hoje.toISOString().split('T')[0];
    }
}

// --- DESTAQUE VISUAL ---
function configurarDestaqueDevolucao() {
    const selectDev = document.getElementById('selectDevolucao');
    const selectEpi = document.getElementById('selectEpi');
    if (selectDev && selectEpi) {
        selectDev.addEventListener('change', () => {
            const ehSim = selectDev.value === "SIM";
            selectEpi.style.backgroundColor = ehSim ? "#dcfce7" : "#ffffff";
            selectEpi.style.borderColor = ehSim ? "#22c55e" : "#ccc";
        });
    }
}

// --- SALVAR (AJUSTADO) ---
async function salvarPedido() {
    const btn = document.getElementById('btnSalvar');
    const formCampos = {
        funcionario: document.getElementById('selectFuncionario').value,
        epi: document.getElementById('selectEpi').value,
        data: document.getElementById('dataPedido').value,
        devolucao: document.getElementById('selectDevolucao').value
    };

    if (!formCampos.funcionario || !formCampos.epi || !formCampos.data) {
        return alert("⚠️ Preencha todos os campos!");
    }

    btn.disabled = true;
    btn.textContent = "Gravando...";

    try {
        // Usando o modo que funciona com Google Apps Script POST
        await fetch(URL_PEDIDOS, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formCampos)
        });
        
        alert("✅ Registro realizado com sucesso!");
        
        // Resetar campos
        document.getElementById('selectFuncionario').value = "";
        document.getElementById('selectEpi').value = "";
        document.getElementById('selectEpi').style.backgroundColor = "#ffffff";
        document.getElementById('selectDevolucao').value = "NÃO";
        configurarDataAtual(); 
        
    } catch (e) {
        alert("❌ Erro ao salvar pedido.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Salvar Pedido";
    }
}

// --- LOGOUT ---
function logout() {
    if(confirm("Deseja realmente sair?")) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    sincronizarNomes();
    configurarDataAtual();
    configurarDestaqueDevolucao();
});
