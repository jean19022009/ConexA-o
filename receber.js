// ==========================================
// CONEXAÇÃO - QUERO RECEBER
// ==========================================

const form = document.getElementById("receberForm");
const mensagem = document.getElementById("mensagem");
const botao = form.querySelector("button[type='submit']");
const dicaMapa = document.getElementById("dicaMapa");

const DICA_PADRAO = dicaMapa ? dicaMapa.textContent : "";

function mostrarMensagem(texto, cor = "#333") {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

function mostrarDica(texto) {
    if (dicaMapa) dicaMapa.textContent = texto;
}

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));


// ==========================================
// VERIFICAR USUÁRIO LOGADO
// ==========================================

async function obterUsuario() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Erro ao verificar usuário:", error);
        return null;
    }

    return data.user;
}


// ==========================================
// BUSCAR CEP
// ==========================================

async function buscarCEP() {
    const valor = document.getElementById("cep").value.replace(/\D/g, "");

    if (valor.length !== 8) return;

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);

        if (!resposta.ok) throw new Error("Não foi possível consultar o CEP.");

        const dados = await resposta.json();

        if (dados.erro) {
            mostrarMensagem("CEP não encontrado. Confira o número.", "#ff7777");
            return;
        }

        document.getElementById("estado").value = dados.uf || "";
        document.getElementById("cidade").value = dados.localidade || "";
        document.getElementById("bairro").value = dados.bairro || "";
        document.getElementById("rua").value = dados.logradouro || "";

        mostrarMensagem("");

        // já mostra a rua no mapa; o número refina depois
        localizar(false);
    } catch (erro) {
        console.error("Erro ao buscar CEP:", erro);
        mostrarMensagem(
            "Não foi possível buscar o CEP. Preencha o endereço manualmente.",
            "#ff7777"
        );
    }
}

document.getElementById("cep").addEventListener("blur", buscarCEP);


// ==========================================
// MÁSCARAS SIMPLES
// ==========================================

document.getElementById("cpf").addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, "").slice(0, 11);

    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    this.value = valor;
});

document.getElementById("telefone").addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, "").slice(0, 11);

    if (valor.length > 10) {
        valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (valor.length > 6) {
        valor = valor.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (valor.length > 2) {
        valor = valor.replace(/(\d{2})(\d+)/, "($1) $2");
    }

    this.value = valor;
});

document.getElementById("cep").addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, "").slice(0, 8);

    if (valor.length > 5) {
        valor = valor.replace(/(\d{5})(\d+)/, "$1-$2");
    }

    this.value = valor;
});


// ==========================================
// MAPA DE CONFIRMAÇÃO (Leaflet)
// ==========================================

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


// ==========================================
// LOCALIZAR ENDEREÇO (Nominatim / OpenStreetMap)
// ==========================================

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

function nomeDoEstado(estado) {
    const sigla = String(estado || "").trim().toUpperCase();
    return ESTADOS[sigla] || estado;
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
async function buscarEndereco({ rua, numero, cidade, estado, cep }) {
    const nomeEstado = nomeDoEstado(estado);

    // 1) rua + número + cidade
    if (rua && cidade) {
        const achado = await consultarNominatim({
            street: numero ? `${numero} ${rua}` : rua,
            city: cidade,
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
    const cepLimpo = String(cep || "").replace(/\D/g, "");

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
    if (cidade) {
        const achado = await consultarNominatim({
            city: cidade,
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
        rua: document.getElementById("rua").value.trim(),
        numero: document.getElementById("numero").value.trim(),
        cidade: document.getElementById("cidade").value.trim(),
        estado: document.getElementById("estado").value.trim(),
        cep: document.getElementById("cep").value.trim()
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
            "Não encontramos o endereço. Toque no mapa no lugar onde fica a sua casa."
        );
        return;
    }

    ajustadoManual = false;

    const zooms = { numero: 19, rua: 17, cep: 15, cidade: 12 };

    colocarPino(resultado.latitude, resultado.longitude, zooms[resultado.precisao]);

    const textos = {
        numero: "Encontramos o endereço. Confira e, se precisar, arraste o pino até a sua casa.",
        rua: "Encontramos a rua, mas não o número exato. Arraste o pino até a sua casa.",
        cep: "Localização aproximada pelo CEP. Arraste o pino até a sua casa.",
        cidade: "Localização aproximada da cidade. Arraste o pino até a sua casa."
    };

    mostrarDica(textos[resultado.precisao]);
}

document.getElementById("numero").addEventListener("blur", () => localizar(false));

document.getElementById("btnLocalizar").addEventListener("click", () => localizar(true));


// ==========================================
// USAR LOCALIZAÇÃO ATUAL (GPS)
// ==========================================

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
                "Usamos a sua localização atual. Use isso só se você estiver em casa; se não, arraste o pino."
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


// ==========================================
// ENVIO DO FORMULÁRIO
// ==========================================

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    botao.disabled = true;
    botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    mostrarMensagem("Enviando sua solicitação...", "#b8cfc3");

    try {
        // USUÁRIO

        const user = await obterUsuario();

        if (!user) {
            mostrarMensagem(
                "Você precisa estar logado para solicitar ajuda.",
                "#ff7777"
            );
            return;
        }

        // CAMPOS

        const nome = document.getElementById("nome").value.trim();
        const cpf = document.getElementById("cpf").value.trim();
        const telefone = document.getElementById("telefone").value.trim();

        const pessoas = Number(document.getElementById("pessoas").value);
        const criancas = document.getElementById("criancas").value;
        const idosos = document.getElementById("idosos").value;

        const cep = document.getElementById("cep").value.trim();
        const estado = document.getElementById("estado").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const bairro = document.getElementById("bairro").value.trim();
        const rua = document.getElementById("rua").value.trim();
        const numero = document.getElementById("numero").value.trim();
        const complemento = document.getElementById("complemento").value.trim();

        const necessidade = document.getElementById("necessidade").value;
        const descricao = document.getElementById("descricaoNecessidade").value.trim();
        const historia = document.getElementById("historia").value.trim();

        // VALIDAÇÕES

        if (!nome || !cpf || !telefone) {
            mostrarMensagem("Preencha seus dados pessoais.", "#ff7777");
            return;
        }

        if (cpf.replace(/\D/g, "").length !== 11) {
            mostrarMensagem("Confira se o CPF possui 11 números.", "#ff7777");
            return;
        }

        if (!Number.isInteger(pessoas) || pessoas < 1) {
            mostrarMensagem("Informe uma quantidade válida de pessoas.", "#ff7777");
            return;
        }

        if (!criancas || !idosos) {
            mostrarMensagem(
                "Informe se há crianças e idosos na família.",
                "#ff7777"
            );
            return;
        }

        if (
            cep.replace(/\D/g, "").length !== 8 ||
            !estado ||
            !cidade ||
            !bairro ||
            !rua ||
            !numero
        ) {
            mostrarMensagem(
                "Preencha todos os campos obrigatórios do endereço.",
                "#ff7777"
            );
            return;
        }

        if (!necessidade || !descricao) {
            mostrarMensagem(
                "Informe sua principal necessidade e descreva o que precisa.",
                "#ff7777"
            );
            return;
        }

        // LOCALIZAÇÃO

        mostrarMensagem("Registrando sua solicitação...", "#b8cfc3");

        let coordenadas = posicao; // o que a pessoa confirmou no mapa

        if (!coordenadas) {
            // não confirmou no mapa: tenta pelo endereço
            const achado = await buscarEndereco({ rua, numero, cidade, estado, cep });

            coordenadas = achado
                ? { latitude: achado.latitude, longitude: achado.longitude }
                : { latitude: null, longitude: null };
        }

        // DADOS PARA O SUPABASE

        const solicitacao = {
            usuario_id: user.id,
            nome: nome,
            cpf: cpf,
            telefone: telefone,
            quantidade_pessoas: pessoas,
            tem_criancas: criancas === "sim",
            tem_idosos: idosos === "sim",
            cep: cep,
            estado: estado,
            cidade: cidade,
            bairro: bairro,
            rua: rua,
            numero: numero,
            complemento: complemento || null,
            necessidade: necessidade,
            descricao_necessidade: descricao,
            historia: historia || null,
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
            status: "Pendente"
        };

        // CADASTRAR NO SUPABASE

        const { error } = await supabaseClient
            .from("solicitacoes")
            .insert([solicitacao]);

        if (error) {
            console.error("Erro Supabase:", error);

            mostrarMensagem(
                "Erro ao cadastrar a solicitação: " + error.message,
                "#ff7777"
            );
            return;
        }

        // SUCESSO

        mostrarMensagem("Solicitação enviada com sucesso! ❤️", "#47e681");

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

    } catch (erro) {
        console.error("Erro inesperado:", erro);

        mostrarMensagem("Ocorreu um erro. Tente novamente.", "#ff7777");
    } finally {
        botao.disabled = false;
        botao.innerHTML =
            'Enviar solicitação <i class="fa-solid fa-arrow-right"></i>';
    }
});


// ==========================================
// VERIFICAR LOGIN AO ABRIR
// ==========================================

obterUsuario().then(user => {
    if (!user) {
        mostrarMensagem("Faça login para solicitar ajuda.", "#ff7777");

        botao.disabled = true;
    }
});