// 1. Validação de Sessão
(function validarSessaoBlindada() {
    const token = sessionStorage.getItem('lstech_token');
    if (!token) {
        sessionStorage.clear();
        window.location.replace('index.html'); 
    }
})();

// 2. URLs de Conexão
const URL_NOMES = "https://script.google.com/macros/s/AKfycby_I3ZzskHnFoxo5A33bC6IHAUsw--D1HD9pznLWHKbLrdHD5K-zO99wgoEjCMnrCgobQ/exec   ";
const URL_BASE_SISTEMA = "https://script.google.com/macros/s/AKfycbyZPyhDd70Ez-KbJBBTl07Vffpf6Vl2Qexi00Qh1BJdIFbHU7aq50ONE74GEVpeqMZIZg/exec";
const URL_EPIS = URL_BASE_SISTEMA + "?aba=epis";
const URL_PEDIDOS = URL_BASE_SISTEMA; 

// --- FUNÇÃO: Sincronizar Listas (Funcionários e EPIs) ---
async function sincronizarNomes() {
    const selectFunc = document.getElementById('selectFuncionario');
    const selectEpi = document.getElementById('selectEpi');
    const txtStatus = document.getElementById('statusNomes') || document.getElementById('txtStatus');
    const pontoStatus = document.getElementById('pontoStatus');

    if (!selectFunc || !selectEpi) return;

    try {
        if(txtStatus) txtStatus.textContent = "⏳ Sincronizando listas...";
        
        const [respFunc, respEpi] = await Promise.all([
            fetch(URL_NOMES, { redirect: 'follow' }),
            fetch(URL_EPIS, { redirect: 'follow' })
        ]);

        const dadosFunc = await respFunc.json();
        const dadosEpi = await respEpi.json();

        // 1. Processar Lista de Funcionários
        if (Array.isArray(dadosFunc)) {
            const nomesFunc = [...new Set(dadosFunc.map(linha => linha[0]))]
                .filter(n => n && n !== "NOME") 
                .sort();

            selectFunc.innerHTML = '<option value="">-- Selecione o Funcionário --</option>';
            nomesFunc.forEach(n => {
                let opt = document.createElement('option');
                opt.value = n; 
                opt.textContent = n;
                selectFunc.appendChild(opt);
            });
        }

        // 2. Processar Lista de EPIs
        if (Array.isArray(dadosEpi)) {
            const listaEpis = [...new Set(dadosEpi.slice(1).map(linha => linha[0]))]
                .filter(e => e)
                .sort();

            selectEpi.innerHTML = '<option value="">-- Selecione o EPI --</option>';
            listaEpis.forEach(e => {
                let opt = document.createElement('option');
                opt.value = e; 
                opt.textContent = e;
                selectEpi.appendChild(opt);
            });
        }

        if(txtStatus) {
            txtStatus.textContent = "✅ Sistema Sincronizado";
            txtStatus.style.color = "#28a745";
        }
        if (pontoStatus) pontoStatus.style.backgroundColor = "#28a745";

    } catch (e) {
        console.error("Erro na sincronização:", e);
        if(txtStatus) {
            txtStatus.textContent = "❌ Erro de Conexão";
            txtStatus.style.color = "#dc3545";
        }
        if (pontoStatus) pontoStatus.style.backgroundColor = "#dc3545";
    }
}

// --- CONFIGURAÇÃO DE DATA AUTOMÁTICA ---
function configurarDataAtual() {
    const campoData = document.getElementById('dataPedido');
    if (campoData) {
        const hoje = new Date();
        const offset = hoje.getTimezoneOffset();
        const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
        campoData.value = dataLocal.toISOString().split('T')[0];
    }
}

// --- DESTAQUE VISUAL PARA DEVOLUÇÕES ---
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

// --- GRAVAR REGISTRO (POST) ---
async function salvarPedido() {
    const btn = document.getElementById('btnSalvar');
    const formCampos = {
        funcionario: document.getElementById('selectFuncionario').value,
        epi: document.getElementById('selectEpi').value,
        data: document.getElementById('dataPedido').value,
        devolucao: document.getElementById('selectDevolucao').value
    };

    if (!formCampos.funcionario || !formCampos.epi || !formCampos.data) {
        return alert("⚠️ Por favor, selecione todos os campos!");
    }

    btn.disabled = true;
    btn.textContent = "Gravando...";

    try {
        await fetch(URL_PEDIDOS, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify(formCampos)
        });
        
        alert("✅ Registro realizado com sucesso!");
        
        document.getElementById('selectFuncionario').value = "";
        document.getElementById('selectEpi').value = "";
        document.getElementById('selectEpi').style.backgroundColor = "#ffffff";
        document.getElementById('selectEpi').style.borderColor = "#ccc";
        document.getElementById('selectDevolucao').value = "SIM";
        configurarDataAtual(); 
        
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("❌ Erro ao salvar pedido. Verifique a conexão.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Salvar Registro";
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
