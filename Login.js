// =========================================
// ELEMENTOS
// =========================================

const form = document.getElementById("loginForm");

const email = document.getElementById("email");

const senha = document.getElementById("senha");

const mensagem = document.getElementById("mensagem");

const mostrarSenha = document.getElementById("mostrarSenha");

const botao = document.querySelector("button[type='submit']");

const googleLogin = document.getElementById("googleLogin");

const facebookLogin = document.getElementById("facebookLogin");

const appleLogin = document.getElementById("appleLogin");


// =========================================
// CAMINHO AUTOMÁTICO DO PROJETO
// =========================================

const pastaProjeto =
    window.location.href.substring(
        0,
        window.location.href.lastIndexOf("/") + 1
    );


// =========================================
// PARÂMETROS DA URL (LIDOS ASSIM QUE A
// PÁGINA ABRE, ANTES DO SUPABASE LIMPAR)
// =========================================

const parametrosQuery =
    new URLSearchParams(window.location.search);

const parametrosHash =
    new URLSearchParams(window.location.hash.substring(1));


// =========================================
// MOSTRAR / OCULTAR SENHA
// =========================================

mostrarSenha.addEventListener("click", () => {

    if (senha.type === "password") {

        senha.type = "text";

        mostrarSenha.classList.remove("fa-eye");
        mostrarSenha.classList.add("fa-eye-slash");

    } else {

        senha.type = "password";

        mostrarSenha.classList.remove("fa-eye-slash");
        mostrarSenha.classList.add("fa-eye");

    }

});


// =========================================
// MENSAGEM
// =========================================

function mostrarMensagem(texto, cor) {

    mensagem.textContent = texto;
    mensagem.style.color = cor;

}


// =========================================
// VERIFICAR PERFIL
// =========================================

async function verificarPerfil(usuario) {

    try {

        const { data: perfil, error: perfilError } =
            await supabaseClient
                .from("usuarios")
                .select("tipo")
                .eq("id", usuario.id)
                .single();


        if (perfilError) {

            console.error(
                "Erro ao buscar perfil:",
                perfilError
            );

            mostrarMensagem(
                "Perfil do usuário não encontrado.",
                "#e63946"
            );

            await supabaseClient.auth.signOut();

            return;
        }


        console.log(
            "Tipo de usuário:",
            perfil.tipo
        );


        // =================================
        // ADMINISTRADOR
        // =================================

        if (perfil.tipo === "administrador") {

            mostrarMensagem(
                "Login realizado! Entrando no Dashboard...",
                "#0B7A4B"
            );

            setTimeout(() => {

                window.location.href =
                    pastaProjeto + "dashboard.html";

            }, 1000);

            return;
        }


        // =================================
        // USUÁRIO NORMAL
        // =================================

        if (perfil.tipo === "usuario") {

            mostrarMensagem(
                "Login realizado com sucesso!",
                "#0B7A4B"
            );

            setTimeout(() => {

                window.location.href =
                    pastaProjeto + "inicial.html";

            }, 1000);

            return;
        }


        // =================================
        // TIPO INVÁLIDO
        // =================================

        mostrarMensagem(
            "Tipo de usuário inválido.",
            "#e63946"
        );

        await supabaseClient.auth.signOut();


    } catch (erro) {

        console.error(
            "Erro ao verificar perfil:",
            erro
        );

        mostrarMensagem(
            "Não foi possível carregar o perfil.",
            "#e63946"
        );

    }

}


// =========================================
// LOGIN COM REDES SOCIAIS
// =========================================

async function loginSocial(provider) {

    try {

        console.log(
            "Iniciando login com:",
            provider
        );


        mostrarMensagem(
            "Abrindo login...",
            "#0B7A4B"
        );


        // =====================================
        // AVISA QUE ESTAMOS INICIANDO O OAUTH
        // =====================================

        sessionStorage.setItem(
            "loginSocialEmAndamento",
            "true"
        );


        // =====================================
        // URL DE RETORNO
        // =====================================

        const urlRetorno =
            pastaProjeto + "Login.html";


        console.log(
            "URL de retorno:",
            urlRetorno
        );


        const { error } =
            await supabaseClient.auth.signInWithOAuth({

                provider: provider,

                options: {

                    redirectTo: urlRetorno

                }

            });


        if (error) {

            console.error(
                "Erro no login social:",
                error
            );

            sessionStorage.removeItem(
                "loginSocialEmAndamento"
            );

            mostrarMensagem(
                "Não foi possível entrar com essa rede.",
                "#e63946"
            );

            return;
        }


    } catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        sessionStorage.removeItem(
            "loginSocialEmAndamento"
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

googleLogin.addEventListener("click", (e) => {

    e.preventDefault();

    loginSocial("google");

});


// =========================================
// FACEBOOK
// =========================================

facebookLogin.addEventListener("click", (e) => {

    e.preventDefault();

    loginSocial("facebook");

});


// =========================================
// APPLE
// =========================================

appleLogin.addEventListener("click", (e) => {

    e.preventDefault();

    loginSocial("apple");

});


// =========================================
// LOGIN NORMAL
// =========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();


    // =====================================
    // VALIDAÇÕES
    // =====================================

    if (email.value.trim() === "") {

        mostrarMensagem(
            "Digite seu e-mail.",
            "#e63946"
        );

        email.focus();

        return;
    }


    if (senha.value.trim() === "") {

        mostrarMensagem(
            "Digite sua senha.",
            "#e63946"
        );

        senha.focus();

        return;
    }


    // =====================================
    // DESABILITAR BOTÃO
    // =====================================

    botao.disabled = true;

    botao.innerHTML = "Entrando...";


    try {

        // =================================
        // LOGIN NO SUPABASE
        // =================================

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({

                email: email.value.trim(),

                password: senha.value

            });


        if (error) {

            console.error(
                "Erro no login:",
                error
            );

            mostrarMensagem(
                "E-mail ou senha incorretos.",
                "#e63946"
            );

            botao.disabled = false;

            botao.innerHTML = "Entrar";

            return;
        }


        if (!data || !data.user) {

            mostrarMensagem(
                "Não foi possível identificar o usuário.",
                "#e63946"
            );

            botao.disabled = false;

            botao.innerHTML = "Entrar";

            return;
        }


        console.log(
            "Login normal realizado:",
            data.user
        );


        // Agora sim, depois do login
        await verificarPerfil(data.user);


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

        botao.innerHTML = "Entrar";

    }

});


// =========================================
// VERIFICAR RETORNO DO LOGIN SOCIAL
// =========================================

async function verificarRetornoOAuth() {

    const loginSocialEmAndamento =
        sessionStorage.getItem(
            "loginSocialEmAndamento"
        );


    // Se não iniciou login social,
    // não faz absolutamente nada.

    if (loginSocialEmAndamento !== "true") {

        console.log(
            "Login normal. Nenhum OAuth em andamento."
        );

        return;
    }


    // =====================================
    // A MARCA VALE UMA VEZ SÓ:
    // SEMPRE É APAGADA AQUI
    // =====================================

    sessionStorage.removeItem(
        "loginSocialEmAndamento"
    );


    // =====================================
    // O PROVEDOR DEVOLVEU ERRO?
    // =====================================

    const deuErro =
        parametrosQuery.has("error") ||
        parametrosHash.has("error");

    if (deuErro) {

        console.log(
            "O provedor retornou erro."
        );

        mostrarMensagem(
            "O login social não foi concluído.",
            "#e63946"
        );

        return;
    }


    // =====================================
    // O USUÁRIO REALMENTE VOLTOU DO
    // PROVEDOR? (a URL precisa ter code
    // ou access_token)
    // =====================================

    const voltouDoProvedor =
        parametrosQuery.has("code") ||
        parametrosHash.has("access_token");

    if (!voltouDoProvedor) {

        console.log(
            "Não veio do provedor. Ignorando sessão antiga."
        );

        return;
    }


    console.log(
        "Retorno de login social detectado."
    );


    try {

        const { data, error } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );

            return;
        }


        // =====================================
        // NÃO AUTENTICOU
        // =====================================

        if (!data || !data.session) {

            console.log(
                "Login social não concluído."
            );

            mostrarMensagem(
                "O login não foi concluído.",
                "#e63946"
            );

            return;
        }


        // =====================================
        // LOGIN CONFIRMADO
        // =====================================

        console.log(
            "Login social confirmado!",
            data.session.user
        );


        mostrarMensagem(
            "Login realizado! Verificando sua conta...",
            "#0B7A4B"
        );


        // =====================================
        // AGORA PODE REDIRECIONAR
        // =====================================

        await verificarPerfil(
            data.session.user
        );


    } catch (erro) {

        console.error(
            "Erro ao verificar OAuth:",
            erro
        );

    }

}// =========================================
// ESQUECI MINHA SENHA
// =========================================

const esqueciSenha = document.getElementById("esqueciSenha");

esqueciSenha.addEventListener("click", async (e) => {

    e.preventDefault();

    const emailDigitado = email.value.trim();

    if (emailDigitado === "") {

        mostrarMensagem(
            "Digite seu e-mail acima e clique em Esqueci minha senha.",
            "#e63946"
        );

        email.focus();

        return;
    }

    mostrarMensagem(
        "Enviando link de recuperação...",
        "#0B7A4B"
    );

    try {

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(
                emailDigitado,
                {
                    redirectTo: pastaProjeto + "redefinir-senha.html"
                }
            );

        if (error) {

            console.error(
                "Erro ao enviar recuperação:",
                error
            );

            mostrarMensagem(
                "Não foi possível enviar o e-mail. Tente novamente em alguns minutos.",
                "#e63946"
            );

            return;
        }

        // Mensagem igual exista a conta ou não,
        // para não revelar quais e-mails estão cadastrados
        mostrarMensagem(
            "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
            "#0B7A4B"
        );

    } catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        mostrarMensagem(
            "Ocorreu um erro. Tente novamente.",
            "#e63946"
        );

    }

});


// =========================================
// INICIAR VERIFICAÇÃO DO OAUTH
// =========================================

verificarRetornoOAuth();


console.log(
    "Login.js carregado!"
);

console.log(
    "Pasta detectada:",
    pastaProjeto
);