// =========================================
// CONEXAÇÃO - QUERO DOAR
// =========================================


// =========================================
// ELEMENTOS
// =========================================

const form = document.getElementById("donationForm");

const tipoDoacao = document.getElementById("tipoDoacao");
const quantidade = document.getElementById("quantidade");

const cep = document.getElementById("cep");
const rua = document.getElementById("rua");
const numero = document.getElementById("numero");
const bairro = document.getElementById("bairro");
const cidade = document.getElementById("cidade");
const estado = document.getElementById("estado");
const complemento = document.getElementById("complemento");

const dataColeta = document.getElementById("dataColeta");
const observacoes = document.getElementById("observacoes");

const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("submitBtn");
const dicaMapa = document.getElementById("dicaMapa");

const DICA_PADRAO = dicaMapa ? dicaMapa.textContent : "";

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));


// =========================================
// MENSAGENS
// =========================================

function mostrarMensagem(texto, cor) {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

function mostrarDica(texto) {
    if (dicaMapa) dicaMapa.textContent = texto;
}


// =========================================
// VERIFICAR USUÁRIO LOGADO
// =========================================

async function obterUsuario() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Erro ao verificar usuário:", error);
        return null;
    }

    return data.user;

}

async function verificarLogin() {

    const usuario = await obterUsuario();

    if (!usuario) {

        mostrarMensagem(
            "Você precisa estar logado para realizar uma doação.",
            "#e63946"
        );

        botao.disabled = true;

        return false;

    }

    return true;

}


// =========================================
// MÁSCARA DO CEP E BUSCA AUTOMÁTICA
// =========================================

cep.addEventListener("input", () => {

    let valor = cep.value.replace(/\D/g, "").slice(0, 8);

    if (valor.length > 5) {
        valor = valor.replace(/(\d{5})(\d+)/, "$1-$2");
    }

    cep.value = valor;

});

async function buscarCEP() {

    const valor = cep.value.replace(/\D/g, "");

    if (valor.length !== 8) return;

    try {

        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);

        if (!resposta.ok) throw new Error("Não foi possível consultar o CEP.");

        const dados = await resposta.json();

        if (dados.erro) {
            mostrarMensagem("CEP não encontrado. Confira o número.", "#e63946");
            return;
        }

        estado.value = dados.uf || "";
        cidade.value = dados.localidade || "";
        bairro.value = dados.bairro || "";
        rua.value = dados.logradouro || "";

        mostrarMensagem("", "");

        // já mostra a rua no mapa; o número refina depois
        localizar(false);

    } catch (erro) {

        console.error("Erro ao buscar CEP:", erro);

        mostrarMensagem(
            "Não foi possível buscar o CEP. Preencha o endereço manualmente.",
            "#e63946"
        );

    }

}

cep.addEventListener("blur", buscarCEP);


// =========================================
// MAPA DE CONFIRMAÇÃO (Leaflet)
// =========================================

let mapaConf = null;
let pino = null;
let posicao = null;          // { latitude, longitude } escolhida
let ajustadoManual = false;  // true se a pessoa arrastou/clicou no mapa

function iniciarMapaConfirmacao() {

    const elemento = document.getElementById("mapaConfirmacao");

    if (!elemento || typeof L === "undefined") return;

    const ruas = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    const satelite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );

    mapaConf = L.map(elemento, {
        center: [-14.235, -51.9253],
        zoom: 4,
        layers: [ruas]
    });

    L.control.layers({ "Ruas": ruas, "Satélite": satelite }).addTo(mapaConf);

    // tocar/clicar no mapa move o pino pra lá
    mapaConf.on("click", evento => {
        ajustadoManual = true;
        colocarPino(evento.latlng.lat, evento.latlng.lng, null);
        mostrarDica("Pino colocado. Se precisar, arraste para ajustar.");
    });

}

function colocarPino(lat, lng, zoom) {

    if (!mapaConf) return;

    posicao = { latitude: lat, longitude: lng };

    if (!pino) {

        pino = L.marker([lat, lng], { draggable: true }).addTo(mapaConf);

        pino.on("dragend", () => {
            const ponto = pino.getLatLng();
            posicao = { latitude: ponto.lat, longitude: ponto.lng };
            ajustadoManual = true;
            mostrarDica("Posição ajustada. Será salva exatamente onde o pino está.");
        });

    } else {

        pino.setLatLng([lat, lng]);

    }

    if (zoom) {
        mapaConf.setView([lat, lng], zoom);
    } else {
        mapaConf.panTo([lat, lng]);
    }

}


// =========================================
// LOCALIZAR ENDEREÇO (Nominatim / OpenStreetMap)
// =========================================

const ESTADOS = {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
    CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
    MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
    MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
    PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
    RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia",
    RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe",
    TO: "Tocantins"
};

function nomeDoEstado(valor) {
    const sigla = String(valor || "").trim().toUpperCase();
    return ESTADOS[sigla] || valor;
}

async function consultarNominatim(parametros) {

    const consulta = new URLSearchParams({
        format: "json",
        limit: "1",
        addressdetails: "1",
        countrycodes: "br",
        "accept-language": "pt-BR",
        ...parametros
    });

    try {

        const resposta = await fetch(
            "https://nominatim.openstreetmap.org/search?" + consulta.toString()
        );

        if (!resposta.ok) {
            console.warn("Serviço de endereços respondeu com status", resposta.status);
            return null;
        }

        const resultados = await resposta.json();

        return resultados.length ? resultados[0] : null;

    } catch (erro) {

        console.warn("Erro na busca de endereço:", erro);

        return null;

    }

}

// tenta do mais preciso para o menos preciso
async function buscarEndereco(dados) {

    const nomeEstado = nomeDoEstado(dados.estado);

    // 1) rua + número + cidade
    if (dados.rua && dados.cidade) {

        const achado = await consultarNominatim({
            street: dados.numero ? `${dados.numero} ${dados.rua}` : dados.rua,
            city: dados.cidade,
            state: nomeEstado
        });

        if (achado) {
            return {
                latitude: Number(achado.lat),
                longitude: Number(achado.lon),
                precisao: achado.address && achado.address.house_number
                    ? "numero"
                    : "rua"
            };
        }

        await esperar(1100); // limite do Nominatim: 1 busca por segundo

    }

    // 2) CEP
    const cepLimpo = String(dados.cep || "").replace(/\D/g, "");

    if (cepLimpo.length === 8) {

        const achado = await consultarNominatim({
            postalcode: `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`
        });

        if (achado) {
            return {
                latitude: Number(achado.lat),
                longitude: Number(achado.lon),
                precisao: "cep"
            };
        }

        await esperar(1100);

    }

    // 3) cidade
    if (dados.cidade) {

        const achado = await consultarNominatim({
            city: dados.cidade,
            state: nomeEstado
        });

        if (achado) {
            return {
                latitude: Number(achado.lat),
                longitude: Number(achado.lon),
                precisao: "cidade"
            };
        }

    }

    return null;

}

function lerEndereco() {
    return {
        rua: rua.value.trim(),
        numero: numero.value.trim(),
        cidade: cidade.value.trim(),
        estado: estado.value.trim(),
        cep: cep.value.trim()
    };
}

let buscando = false;
let buscaPendente = null;

// forcar = true quando a pessoa clica em "Localizar no mapa"
async function localizar(forcar) {

    if (buscando) {
        buscaPendente = forcar ? "forcar" : "normal";
        return;
    }

    // não sobrescreve um pino que a pessoa já ajustou à mão
    if (ajustadoManual && !forcar) return;

    const endereco = lerEndereco();

    if (!endereco.cidade && !endereco.rua) {
        if (forcar) mostrarDica("Preencha o CEP e o endereço primeiro.");
        return;
    }

    buscando = true;
    mostrarDica("Procurando o endereço no mapa...");

    const resultado = await buscarEndereco(endereco);

    buscando = false;

    // o endereço mudou durante a busca (ex.: digitou o número): busca de novo
    if (buscaPendente) {
        const forcarDeNovo = buscaPendente === "forcar";
        buscaPendente = null;
        localizar(forcarDeNovo);
        return;
    }

    if (!resultado) {
        mostrarDica(
            "Não encontramos o endereço. Toque no mapa no lugar da coleta."
        );
        return;
    }

    ajustadoManual = false;

    const zooms = { numero: 19, rua: 17, cep: 15, cidade: 12 };

    colocarPino(resultado.latitude, resultado.longitude, zooms[resultado.precisao]);

    const textos = {
        numero: "Encontramos o endereço. Confira e, se precisar, arraste o pino até o lugar exato.",
        rua: "Encontramos a rua, mas não o número exato. Arraste o pino até o lugar da coleta.",
        cep: "Localização aproximada pelo CEP. Arraste o pino até o lugar da coleta.",
        cidade: "Localização aproximada da cidade. Arraste o pino até o lugar da coleta."
    };

    mostrarDica(textos[resultado.precisao]);

}

numero.addEventListener("blur", () => localizar(false));

document.getElementById("btnLocalizar").addEventListener("click", () => localizar(true));


// =========================================
// USAR LOCALIZAÇÃO ATUAL (GPS)
// =========================================

document.getElementById("btnGPS").addEventListener("click", () => {

    if (!navigator.geolocation) {
        mostrarDica("Este aparelho não permite usar a localização. Toque no mapa.");
        return;
    }

    mostrarDica("Pegando a sua localização...");

    navigator.geolocation.getCurrentPosition(
        posicaoGPS => {

            ajustadoManual = true;

            colocarPino(
                posicaoGPS.coords.latitude,
                posicaoGPS.coords.longitude,
                19
            );

            mostrarDica(
                "Usamos a sua localização atual. Use isso só se a coleta for onde você está; se não, arraste o pino."
            );

        },
        () => {

            mostrarDica(
                "Não foi possível pegar a localização. Permita o acesso ou toque no mapa."
            );

        },
        { enableHighAccuracy: true, timeout: 15000 }
    );

});

iniciarMapaConfirmacao();


// =========================================
// ENVIAR DOAÇÃO
// =========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    // -----------------------------------------
    // VERIFICAR USUÁRIO
    // -----------------------------------------

    const usuario = await obterUsuario();

    if (!usuario) {

        mostrarMensagem(
            "Você precisa estar logado para realizar uma doação.",
            "#e63946"
        );

        return;

    }

    // -----------------------------------------
    // PEGAR VALORES
    // -----------------------------------------

    const tipo = tipoDoacao.value;
    const quantidadeValor = quantidade.value.trim();

    const cepValor = cep.value.trim();
    const ruaValor = rua.value.trim();
    const numeroValor = numero.value.trim();
    const bairroValor = bairro.value.trim();
    const cidadeValor = cidade.value.trim();
    const estadoValor = estado.value.trim().toUpperCase();
    const complementoValor = complemento.value.trim();

    // -----------------------------------------
    // VALIDAÇÕES
    // -----------------------------------------

    if (tipo === "") {
        mostrarMensagem("Selecione o tipo de doação.", "#e63946");
        tipoDoacao.focus();
        return;
    }

    if (quantidadeValor === "") {
        mostrarMensagem("Informe a quantidade da doação.", "#e63946");
        quantidade.focus();
        return;
    }

    if (cepValor.replace(/\D/g, "").length !== 8) {
        mostrarMensagem("Informe um CEP com 8 números.", "#e63946");
        cep.focus();
        return;
    }

    if (ruaValor === "" || numeroValor === "" || bairroValor === "") {
        mostrarMensagem(
            "Preencha rua, número e bairro do endereço de coleta.",
            "#e63946"
        );
        return;
    }

    if (cidadeValor === "") {
        mostrarMensagem("Informe a cidade.", "#e63946");
        cidade.focus();
        return;
    }

    if (estadoValor === "") {
        mostrarMensagem("Informe o estado.", "#e63946");
        estado.focus();
        return;
    }

    // -----------------------------------------
    // DESABILITAR BOTÃO
    // -----------------------------------------

    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {

        // -----------------------------------------
        // LOCALIZAÇÃO
        // -----------------------------------------

        let coordenadas = posicao; // o que a pessoa confirmou no mapa

        if (!coordenadas) {

            // não confirmou no mapa: tenta pelo endereço
            const achado = await buscarEndereco({
                rua: ruaValor,
                numero: numeroValor,
                cidade: cidadeValor,
                estado: estadoValor,
                cep: cepValor
            });

            coordenadas = achado
                ? { latitude: achado.latitude, longitude: achado.longitude }
                : { latitude: null, longitude: null };

        }

        // endereço completo em uma linha (usado no painel)
        const enderecoCompleto =
            `${ruaValor}, ${numeroValor}` +
            (complementoValor ? ` - ${complementoValor}` : "") +
            ` - ${bairroValor}`;

        // -----------------------------------------
        // INSERIR NO SUPABASE
        // -----------------------------------------

        const { data, error } = await supabaseClient

            .from("doacoes")

            .insert([{

                usuario_id: usuario.id,

                tipo_doacao: tipo,

                quantidade: quantidadeValor,

                endereco: enderecoCompleto,

                cep: cepValor,

                rua: ruaValor,

                numero: numeroValor,

                bairro: bairroValor,

                complemento: complementoValor || null,

                cidade: cidadeValor,

                estado: estadoValor,

                latitude: coordenadas.latitude,

                longitude: coordenadas.longitude,

                data_coleta: dataColeta.value || null,

                observacoes: observacoes.value.trim() || null

            }])

            .select();

        // -----------------------------------------
        // VERIFICAR ERRO
        // -----------------------------------------

        if (error) {

            console.error("Erro ao cadastrar doação:", error);

            mostrarMensagem(
                "Não foi possível registrar sua doação.",
                "#e63946"
            );

            botao.disabled = false;
            botao.textContent = "Confirmar Doação";

            return;

        }

        // -----------------------------------------
        // SUCESSO
        // -----------------------------------------

        console.log("Doação cadastrada:", data);

        mostrarMensagem("Doação registrada com sucesso!", "#6dff8d");

        form.reset();

        // limpa o mapa de confirmação
        if (pino && mapaConf) {
            mapaConf.removeLayer(pino);
            pino = null;
            mapaConf.setView([-14.235, -51.9253], 4);
        }

        posicao = null;
        ajustadoManual = false;
        mostrarDica(DICA_PADRAO);

        botao.disabled = false;
        botao.textContent = "Confirmar Doação";

    } catch (erro) {

        console.error("Erro inesperado:", erro);

        mostrarMensagem("Ocorreu um erro. Tente novamente.", "#e63946");

        botao.disabled = false;
        botao.textContent = "Confirmar Doação";

    }

});


// =========================================
// INICIAR
// =========================================

verificarLogin();

console.log("Doar.js carregado!");