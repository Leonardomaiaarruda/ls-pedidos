(function validarSessaoBlindada() {
    const token = sessionStorage.getItem('lstech_token');

    if (!token) {
        sessionStorage.clear();
        window.location.replace('index.html'); 
    }
})();

// 2. Função de Logout
function logout() {
    if(confirm("Deseja realmente sair do sistema?")) {
        localStorage.removeItem('lstech_auth');
        window.location.href = 'index.html';
    }
}


// 1. Definição das URLs específicas
const URL_NOMES = "https://script.google.com/macros/s/AKfycbyp9Loue9IK_vcGw2HLIohWEQAj0rRPAm9zXyqeDnakZ4iLpslQ8nAC29upM-PARHftCg/exec";
const URL_PEDIDOS = "https://script.google.com/macros/s/AKfycbyZPyhDd70Ez-KbJBBTl07Vffpf6Vl2Qexi00Qh1BJdIFbHU7aq50ONE74GEVpeqMZIZg/exec";

// --- 1. NAVEGAÇÃO ---
function alternarTela(tela, botao) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.style.display = 'none');
    const target = document.getElementById('tela-' + tela);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.btn-menu').forEach(btn => btn.classList.remove('active'));
    botao.classList.add('active');

    // Se abrir Analytics, atualiza os dados do dashboard
    if (tela === 'analytics' && typeof carregarDados === 'function') {
        carregarDados();
    }
}

// --- 2. BUSCAR NOMES (Preenche o campo Funcionário) ---
async function sincronizarNomes() {
    const select = document.getElementById('selectFuncionario');
    const status = document.getElementById('statusNomes');
    const ponto = document.getElementById('pontoStatus');

    if (!select) return;

    try {
        // Busca da URL_NOMES
        const response = await fetch(URL_NOMES);
        const dados = await response.json();
        
        // Assume que os nomes estão na primeira coluna
        const nomes = [...new Set(dados.slice(1).map(linha => linha[0]))].sort();

        select.innerHTML = '<option value="">-- Selecione o Funcionário --</option>';
        nomes.forEach(n => {
            if (n) {
                let opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                select.appendChild(opt);
            }
        });

        if (status) {
            status.innerHTML = " Lista de Funcionários Sincronizada";
            status.style.color = "green";
        }
        if (ponto) ponto.style.backgroundColor = "#28a745";

    } catch (e) {
        console.error("Erro ao carregar nomes:", e);
        if (status) status.innerHTML = " Erro ao buscar lista de nomes";
    }
}

// --- 3. GRAVAR REGISTRO (Envia para URL_PEDIDOS) ---
async function salvarPedido() {
    const btn = document.getElementById('btnSalvar');
    const statusTxt = document.getElementById('statusTxt');
    
    const funcionario = document.getElementById('selectFuncionario').value;
    const epi = document.getElementById('selectEpi').value;
    const data = document.getElementById('dataPedido').value;

    if (!funcionario || !data) {
        return alert("Por favor, selecione o funcionário e a data!");
    }

    const dadosParaEnvio = { funcionario, epi, data };

    btn.disabled = true;
    btn.textContent = "Gravando...";
    if (statusTxt) statusTxt.textContent = "⏳ Enviando para a base de pedidos...";

    try {
        // Envia para URL_PEDIDOS
        await fetch(URL_PEDIDOS, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(dadosParaEnvio)
        });
        
        alert("✅ Pedido registrado com sucesso!");
        
        if (statusTxt) {
            statusTxt.textContent = "✅ Gravado com sucesso!";
            statusTxt.style.color = "green";
        }

        // Limpa campos
        document.getElementById('dataPedido').value = "";
        
        // Atualiza Analytics se estiver visível
        if (typeof carregarDados === "function") carregarDados();

    } catch (e) {
        console.error("Erro ao gravar:", e);
        alert("Erro ao salvar pedido.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Gravar Pedido na Planilha";
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', sincronizarNomes);