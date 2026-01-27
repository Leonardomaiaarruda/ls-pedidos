const AUTH_CONFIG = {
    u: "lscoelho",
    p: "Y29lbGhvMjAxNg==" 
};

function efetuarLogin() {
    const userIn = document.getElementById('usuario').value;
    const passIn = btoa(document.getElementById('senha').value); 
    const msgErro = document.getElementById('msgErro');

    if (userIn === AUTH_CONFIG.u && passIn === AUTH_CONFIG.p) {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        sessionStorage.setItem('lstech_token', token);
        
        window.location.href = 'pedidos.html'; 
    } else {
        msgErro.style.display = 'block';
    }
}