// =========================================
// CADASTRO - CONEXAÇÃO
// =========================================

const form = document.getElementById("cadastroForm");

const nome = document.getElementById("nome");
const email = document.getElementById("email");
const telefone = document.getElementById("telefone");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");

const mensagem = document.getElementById("mensagem");
const botao = document.querySelector("button[type='submit']");

const termos = document.getElementById("termos");


// =========================================
// LOGIN / CADASTRO SOCIAL
// =========================================

const googleLogin = document.getElementById("googleLogin");
const facebookLogin = document.getElementById("facebookLogin");
const twitterLogin = document.getElementById("twitterLogin");


// =========================================
// MOSTRAR MENSAGEM
// =========================================

function mostrarMensagem(texto, cor) {

    mensagem.textContent = texto;
    mensagem.style.color = cor;

}


// =========================================
// CADASTRO NORMAL
// =========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();


    // -----------------------------------------
    // PEGAR VALORES
    // -----------------------------------------

    const nomeUsuario = nome.value.trim();
    const emailUsuario = email.value.trim().toLowerCase();
    const telefoneUsuario = telefone.value.trim();


    // -----------------------------------------
    // VALIDAR NOME
    // -----------------------------------------

    if (nomeUsuario === "") {

        mostrarMensagem(
            "Digite seu nome.",
            "#e63946"
        );

        nome.focus();

        return;
    }


    // -----------------------------------------
    // VALIDAR E-MAIL
    // -----------------------------------------

    if (emailUsuario === "") {

        mostrarMensagem(
            "Digite seu e-mail.",
            "#e63946"
        );

        email.focus();

        return;
    }


    // -----------------------------------------
    // VALIDAR TELEFONE
    // -----------------------------------------

    if (telefoneUsuario === "") {

        mostrarMensagem(
            "Digite seu telefone.",
            "#e63946"
        );

        telefone.focus();

        return;
    }


    // -----------------------------------------
    // VALIDAR SENHA
    // -----------------------------------------

    if (senha.value.length < 6) {

        mostrarMensagem(
            "A senha deve ter pelo menos 6 caracteres.",
            "#e63946"
        );

        senha.focus();

        return;
    }


    // -----------------------------------------
    // CONFIRMAR SENHA
    // -----------------------------------------

    if (senha.value !== confirmarSenha.value) {

        mostrarMensagem(
            "As senhas não são iguais.",
            "#e63946"
        );

        confirmarSenha.focus();

        return;
    }


    // -----------------------------------------
    // TERMOS
    // -----------------------------------------

    if (!termos.checked) {

        mostrarMensagem(
            "Você precisa aceitar os termos de uso.",
            "#e63946"
        );

        return;
    }


    // -----------------------------------------
    // DESABILITAR BOTÃO
    // -----------------------------------------

    botao.disabled = true;
    botao.innerHTML = "Criando conta...";


    try {

        // -----------------------------------------
        // CRIAR CONTA NO SUPABASE AUTH
        // -----------------------------------------

        const { data, error } =
            await supabaseClient.auth.signUp({

                email: emailUsuario,

                password: senha.value,

                options: {

                    data: {

                        nome: nomeUsuario,

                        telefone: telefoneUsuario

                    }

                }

            });


        // -----------------------------------------
        // ERRO
        // -----------------------------------------

        if (error) {

            console.error(
                "Erro no cadastro:",
                error
            );

            mostrarMensagem(
                error.message,
                "#e63946"
            );

            botao.disabled = false;
            botao.innerHTML = "Criar conta";

            return;
        }


        // -----------------------------------------
        // VERIFICAR USUÁRIO
        // -----------------------------------------

        if (!data || !data.user) {

            mostrarMensagem(
                "Não foi possível criar a conta.",
                "#e63946"
            );

            botao.disabled = false;
            botao.innerHTML = "Criar conta";

            return;
        }


        // -----------------------------------------
        // CADASTRO REALIZADO
        // -----------------------------------------

        console.log(
            "Usuário cadastrado:",
            data.user
        );


        mostrarMensagem(
            "Conta criada com sucesso! Redirecionando...",
            "#0B7A4B"
        );


        form.reset();


        // -----------------------------------------
        // VOLTAR PARA LOGIN
        // -----------------------------------------

        setTimeout(() => {

            window.location.href = "Login.html";

        }, 2000);


    } catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        mostrarMensagem(
            "Ocorreu um erro. Tente novamente.",
            "#e63946"
        );

        botao.disabled = false;
        botao.innerHTML = "Criar conta";

    }

});


// =========================================
// LOGIN SOCIAL
// =========================================

async function loginSocial(provider) {

    try {

        const pastaProjeto =
            window.location.href.substring(
                0,
                window.location.href.lastIndexOf("/") + 1
            );


        const { data, error } =
            await supabaseClient.auth.signInWithOAuth({

                provider: provider,

                options: {

                    redirectTo:
                        pastaProjeto + "Login.html"

                }

            });


        if (error) {

            console.error(
                "Erro no login social:",
                error
            );

            mostrarMensagem(
                "Não foi possível continuar com essa conta.",
                "#e63946"
            );

        }

    } catch (erro) {

        console.error(
            "Erro inesperado no login social:",
            erro
        );

        mostrarMensagem(
            "Ocorreu um erro. Tente novamente.",
            "#e63946"
        );

    }

}


// =========================================
// GOOGLE
// =========================================

if (googleLogin) {

    googleLogin.addEventListener("click", (e) => {

        e.preventDefault();

        loginSocial("google");

    });

}


// =========================================
// FACEBOOK
// =========================================

if (facebookLogin) {

    facebookLogin.addEventListener("click", (e) => {

        e.preventDefault();

        loginSocial("facebook");

    });

}


// =========================================
// X / TWITTER
// =========================================

if (twitterLogin) {

    twitterLogin.addEventListener("click", (e) => {

        e.preventDefault();

        loginSocial("x");

    });

}


// =========================================
// TERMOS DE USO
// =========================================

const modalTermos =
    document.getElementById("modalTermos");

const fecharTermos =
    document.getElementById("fecharTermos");

const confirmarTermos =
    document.getElementById("confirmarTermos");

const termosTexto =
    document.getElementById("termosTexto");


// =========================================
// ABRIR TERMOS
// =========================================

termos.addEventListener("change", () => {

    termos.checked = false;

    modalTermos.classList.add("ativo");

    confirmarTermos.disabled = true;

    termosTexto.scrollTop = 0;

});


// =========================================
// DETECTAR FINAL DA ROLAGEM
// =========================================

termosTexto.addEventListener("scroll", () => {

    const chegouAoFinal =
        termosTexto.scrollTop +
        termosTexto.clientHeight >=
        termosTexto.scrollHeight - 5;


    if (chegouAoFinal) {

        confirmarTermos.disabled = false;

    }

});


// =========================================
// CONFIRMAR TERMOS
// =========================================

confirmarTermos.addEventListener("click", () => {

    termos.checked = true;

    modalTermos.classList.remove("ativo");

    mostrarMensagem("", "");

});


// =========================================
// FECHAR TERMOS
// =========================================

fecharTermos.addEventListener("click", () => {

    modalTermos.classList.remove("ativo");

    termos.checked = false;

});


// =========================================
// FECHAR CLICANDO FORA
// =========================================

modalTermos.addEventListener("click", (e) => {

    if (e.target === modalTermos) {

        modalTermos.classList.remove("ativo");

        termos.checked = false;

    }

});


// =========================================
// CADASTRO.JS CARREGADO
// =========================================

console.log("Cadastro.js carregado!");