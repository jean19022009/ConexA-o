/* =====================================================
   CONEXAÇÃO — DASHBOARD ADMINISTRATIVO
===================================================== */

let map = null;
let marcadores = [];
let paginaAtual = "inicio";
let dashboardIniciado = false;


/* =====================================================
   PÁGINAS
===================================================== */

const paginas = {

    inicio: {
        titulo: "Visão geral",
        descricao: "Acompanhe tudo o que está acontecendo no ConexAção."
    },

    mapa: {
        titulo: "Mapa",
        descricao: "Visualize a localização das solicitações."
    },

    doacoes: {
        titulo: "Doações",
        descricao: "Gerencie as doações cadastradas."
    },

    coletas: {
        titulo: "Coletas",
        descricao: "Acompanhe as operações de coleta."
    },

    familias: {
        titulo: "Famílias",
        descricao: "Consulte as famílias cadastradas."
    },

    parceiros: {
        titulo: "Parceiros",
        descricao: "Gerencie a rede de parceiros."
    },

    configuracoes: {
        titulo: "Configurações",
        descricao: "Personalize o painel administrativo."
    }

};


/* =====================================================
   MAPA (Google Maps)
   Pedidos de ajuda (verde) e doações (laranja)
===================================================== */

const CENTRO_BRASIL = { lat: -14.2350, lng: -51.9253 };
const CHAVE_CACHE_GEO = "conexaoGeoCache";
const COR_PRECISA = "#1fc15a";
const COR_DOAR = "#ff9f1c";

const marcadoresPorTipo = { precisa: [], doar: [] };

let cargaMapaId = 0;
let janelaInfo = null;
let iconePrecisa = null;
let iconeDoar = null;


// alfinete em gota com um desenho branco dentro
function criarIcone(cor, desenho) {

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
            <path d="M17 1C8.2 1 1 8 1 16.6 1 28 17 43 17 43s16-15 16-26.4C33 8 25.8 1 17 1z"
                  fill="${cor}" stroke="#ffffff" stroke-width="2"/>
            ${desenho}
        </svg>
    `;

    return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(34, 44),
        anchor: new google.maps.Point(17, 43)
    };

}

// casinha (quem precisa de ajuda)
const DESENHO_CASA =
    '<path d="M17 7.5l9 7.5h-2.6v8.5h-4.9v-5.5h-3v5.5H9.6V15H7z" fill="#ffffff"/>';

// presente (quem quer doar)
const DESENHO_PRESENTE =
    '<rect x="9.5" y="15" width="15" height="9" rx="1" fill="#ffffff"/>' +
    '<rect x="8.5" y="11.5" width="17" height="4.5" rx="1" fill="#ffffff"/>' +
    '<rect x="16" y="11.5" width="2" height="12.5" fill="#ff9f1c"/>' +
    '<path d="M17 11.5c-3.5-5-8-2.5-5.5 0zM17 11.5c3.5-5 8-2.5 5.5 0z" fill="#ffffff"/>';


function iniciarMapa() {

    const elemento = document.getElementById("map");

    if (!elemento) {
        console.error("Elemento do mapa não encontrado.");
        return;
    }

    if (
        typeof google === "undefined" ||
        !google.maps
    ) {

        mostrarErroMapa();

        return;

    }

    if (map) {
        return;
    }

    map = new google.maps.Map(
        elemento,
        {

            center: CENTRO_BRASIL,

            zoom: 4,

            // Inicia no modo satélite com nomes das ruas
            mapTypeId: "hybrid",

            // Permite alternar os tipos de mapa
            mapTypeControl: true,

            mapTypeControlOptions: {

                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,

                position: google.maps.ControlPosition.TOP_RIGHT,

                mapTypeIds: [
                    "roadmap",
                    "satellite",
                    "hybrid"
                ]

            },

            streetViewControl: false,

            fullscreenControl: true

        }
    );

    janelaInfo = new google.maps.InfoWindow();

    iconePrecisa = criarIcone(COR_PRECISA, DESENHO_CASA);
    iconeDoar = criarIcone(COR_DOAR, DESENHO_PRESENTE);

    criarLegenda();

    carregarMapa();

}


// legenda com filtros (marcar/desmarcar cada tipo)
function criarLegenda() {

    const caixa = document.createElement("div");

    caixa.style.cssText =
        "background:rgba(6,37,34,.92);color:#fff;padding:10px 12px;" +
        "margin:0 0 24px 10px;border-radius:10px;" +
        "font:12px/1.9 Inter,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);";

    caixa.innerHTML = `
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="filtroPrecisa" checked>
            <span style="width:12px;height:12px;border-radius:50%;background:${COR_PRECISA};display:inline-block;"></span>
            Precisam de ajuda
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="filtroDoar" checked>
            <span style="width:12px;height:12px;border-radius:50%;background:${COR_DOAR};display:inline-block;"></span>
            Querem doar
        </label>
    `;

    caixa.querySelector("#filtroPrecisa").addEventListener(
        "change",
        evento => alternarTipo("precisa", evento.target.checked)
    );

    caixa.querySelector("#filtroDoar").addEventListener(
        "change",
        evento => alternarTipo("doar", evento.target.checked)
    );

    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(caixa);

}


function alternarTipo(tipo, visivel) {

    marcadoresPorTipo[tipo].forEach(
        marcador => marcador.setVisible(visivel)
    );

}


function tipoVisivel(tipo) {

    const filtro = document.getElementById(
        tipo === "doar" ? "filtroDoar" : "filtroPrecisa"
    );

    return filtro ? filtro.checked : true;

}


/* =====================================================
   ERRO DO MAPA
===================================================== */

function mostrarErroMapa() {

    const elemento = document.getElementById("map");

    if (!elemento) return;

    elemento.innerHTML = `

        <div class="mapa-sem-api">

            <i class="fa-solid fa-map-location-dot"></i>

            <strong>
                Mapa indisponível
            </strong>

            <span>
                Verifique a configuração da chave da API
                e o faturamento do Google Maps.
            </span>

        </div>

    `;

}

// o Google chama esta função se a chave for recusada
window.gm_authFailure = () => {
    mostrarErroMapa();
};


/* ---------- coordenadas a partir da cidade (plano B) ---------- */

function lerCacheGeo() {

    try {
        return JSON.parse(localStorage.getItem(CHAVE_CACHE_GEO)) || {};
    } catch {
        return {};
    }

}


function salvarCacheGeo(cache) {

    try {
        localStorage.setItem(CHAVE_CACHE_GEO, JSON.stringify(cache));
    } catch {
        /* sem espaço ou bloqueado: ignora */
    }

}


const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));


async function geocodificar(texto) {

    const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1" +
        "&countrycodes=br&accept-language=pt-BR&q=" +
        encodeURIComponent(texto);

    try {

        const resposta = await fetch(url);

        if (!resposta.ok) return null;

        const dados = await resposta.json();

        if (!dados.length) return null;

        return {
            latitude: Number(dados[0].lat),
            longitude: Number(dados[0].lon)
        };

    } catch (erro) {

        console.error("Erro ao buscar coordenadas:", erro);

        return null;

    }

}


function montarConteudo(titulo, linhas, aproximado) {

    const conteudo = document.createElement("div");

    conteudo.style.color = "#17332f";
    conteudo.style.padding = "5px";

    const tituloEl = document.createElement("strong");

    tituloEl.textContent = titulo;

    conteudo.appendChild(tituloEl);

    if (aproximado) {
        linhas.push("Localização aproximada (centro da cidade)");
    }

    linhas.forEach(texto => {

        const linha = document.createElement("div");

        linha.textContent = texto;

        conteudo.appendChild(linha);

    });

    return conteudo;

}


function conteudoPedido(item, aproximado) {

    return montarConteudo(
        item.nome || "Sem nome",
        [
            "Precisa de ajuda",
            "Necessidade: " + (item.necessidade || "Não informada"),
            "Pessoas: " + (item.quantidade_pessoas || 0),
            "Local: " + (item.cidade || "") + (item.estado ? " - " + item.estado : ""),
            "Status: " + (item.status || "Pendente")
        ],
        aproximado
    );

}


function conteudoDoacao(item, aproximado) {

    return montarConteudo(
        "Doação: " + (item.tipo_doacao || "Não informada"),
        [
            "Quer doar",
            "Quantidade: " + (item.quantidade || "-"),
            "Endereço: " + (item.endereco || "-"),
            "Local: " + (item.cidade || "") + (item.estado ? " - " + item.estado : ""),
            "Coleta: " + (item.data_coleta || "não informada"),
            "Status: " + (item.status || "Pendente")
        ],
        aproximado
    );

}


/* =====================================================
   CARREGAR MAPA
===================================================== */

async function carregarMapa() {

    if (!map) return;

    const idCarga = ++cargaMapaId;

    try {

        const [pedidos, doacoes] = await Promise.all([

            supabaseClient
                .from("solicitacoes")
                .select(`
                    id,
                    nome,
                    necessidade,
                    quantidade_pessoas,
                    cidade,
                    estado,
                    latitude,
                    longitude,
                    status
                `),

            supabaseClient
                .from("doacoes")
                .select(`
                    id,
                    tipo_doacao,
                    quantidade,
                    endereco,
                    cidade,
                    estado,
                    data_coleta,
                    latitude,
                    longitude,
                    status
                `)

        ]);

        if (pedidos.error) throw pedidos.error;

        if (doacoes.error) {
            console.warn("Doações no mapa:", doacoes.error);
        }

        if (idCarga !== cargaMapaId) return;

        // limpa os alfinetes antigos
        Object.keys(marcadoresPorTipo).forEach(tipo => {

            marcadoresPorTipo[tipo].forEach(
                marcador => marcador.setMap(null)
            );

            marcadoresPorTipo[tipo] = [];

        });

        const registros = [

            ...(pedidos.data || []).map(item => ({ tipo: "precisa", item })),

            ...((doacoes.error ? [] : doacoes.data) || [])
                .map(item => ({ tipo: "doar", item }))

        ];

        const limites = new google.maps.LatLngBounds();
        const semCoordenadas = [];
        let totalPontos = 0;

        const atualizarContador = () => {

            const total = document.getElementById("totalPontosMapa");

            if (total) {
                total.textContent =
                    `${marcadoresPorTipo.precisa.length} pedidos · ` +
                    `${marcadoresPorTipo.doar.length} doações`;
            }

        };

        const ajustarMapa = () => {

            if (totalPontos === 0) return;

            if (totalPontos === 1) {

                map.setCenter(limites.getCenter());
                map.setZoom(15);

            } else {

                map.fitBounds(limites);

            }

        };

        const adicionarMarcador = (registro, lat, lng, aproximado) => {

            const doar = registro.tipo === "doar";

            const marcador = new google.maps.Marker({

                position: { lat, lng },

                map,

                icon: doar ? iconeDoar : iconePrecisa,

                visible: tipoVisivel(registro.tipo),

                title: doar
                    ? "Doação: " + (registro.item.tipo_doacao || "")
                    : registro.item.nome || "Solicitação"

            });

            const conteudo = doar
                ? conteudoDoacao(registro.item, aproximado)
                : conteudoPedido(registro.item, aproximado);

            marcador.addListener("click", () => {

                janelaInfo.setContent(conteudo);

                janelaInfo.open({
                    anchor: marcador,
                    map
                });

            });

            marcadoresPorTipo[registro.tipo].push(marcador);

            limites.extend({ lat, lng });

            totalPontos++;

        };

        // 1) registros que já têm latitude e longitude salvas
        registros.forEach(registro => {

            const item = registro.item;

            const lat = Number(item.latitude);
            const lng = Number(item.longitude);

            const temCoordenadas =
                item.latitude !== null &&
                item.longitude !== null &&
                item.latitude !== "" &&
                item.longitude !== "" &&
                Number.isFinite(lat) &&
                Number.isFinite(lng);

            if (temCoordenadas) {
                adicionarMarcador(registro, lat, lng, false);
            } else if (item.cidade) {
                semCoordenadas.push(registro);
            }

        });

        ajustarMapa();
        atualizarContador();

        // 2) plano B: sem coordenadas, usa o centro da cidade
        const cache = lerCacheGeo();
        const falhas = new Set();
        let adicionouAproximado = false;

        for (const registro of semCoordenadas) {

            if (idCarga !== cargaMapaId) return;

            const item = registro.item;

            const texto = [item.cidade, item.estado, "Brasil"]
                .filter(Boolean)
                .join(", ");

            if (falhas.has(texto)) continue;

            let coords = cache[texto];

            if (!coords) {

                coords = await geocodificar(texto);

                // limite do Nominatim: 1 busca por segundo
                await esperar(1100);

                if (coords) {
                    cache[texto] = coords;
                    salvarCacheGeo(cache);
                } else {
                    falhas.add(texto);
                }

            }

            if (idCarga !== cargaMapaId) return;

            if (!coords) continue;

            // pequeno deslocamento pra pontos da mesma cidade não ficarem empilhados
            const id = (Number(item.id) || 0) + (registro.tipo === "doar" ? 3 : 0);
            const deslocLat = ((id % 7) - 3) * 0.004;
            const deslocLng = (((id * 3) % 7) - 3) * 0.004;

            adicionarMarcador(
                registro,
                coords.latitude + deslocLat,
                coords.longitude + deslocLng,
                true
            );

            adicionouAproximado = true;

            atualizarContador();

        }

        if (adicionouAproximado) ajustarMapa();

    } catch (erro) {

        console.error("Erro ao carregar mapa:", erro);

    }

}



/* =====================================================
   FAMÍLIAS
===================================================== */

async function carregarFamilias() {

    const corpo =
        document.getElementById("familiasBody");

    if (!corpo) return;

    const { data, error } =
        await supabaseClient
            .from("solicitacoes")
            .select(`
                id,
                nome,
                necessidade,
                quantidade_pessoas,
                cidade,
                estado,
                status
            `)
            .order("id", { ascending: false });

    if (error) {

        console.error(error);

        corpo.innerHTML = `
            <tr>
                <td colspan="6">
                    Erro ao carregar famílias.
                </td>
            </tr>
        `;

        return;

    }

    if (!data || data.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="6">
                    Nenhuma família cadastrada.
                </td>
            </tr>
        `;

        return;

    }

    corpo.innerHTML =
        data.map(item => `

            <tr>

                <td>${item.nome || "-"}</td>

                <td>${item.necessidade || "-"}</td>

                <td>${item.quantidade_pessoas || 0}</td>

                <td>
                    ${item.cidade || "-"}
                    ${item.estado ? ` - ${item.estado}` : ""}
                </td>

                <td>
                    <span class="status ${obterClasseStatus(item.status)}">
                        ${item.status || "Pendente"}
                    </span>
                </td>

                <td>
                    <button onclick="verSolicitacao(${item.id})">
                        Ver
                    </button>
                </td>

            </tr>

        `).join("");

}


/* =====================================================
   STATUS
===================================================== */

function obterClasseStatus(status) {

    const valor =
        String(status || "").toLowerCase();

    if (
        valor.includes("conclu") ||
        valor.includes("entreg")
    ) {
        return "entregue";
    }

    if (
        valor.includes("coleta") ||
        valor.includes("aceita") ||
        valor.includes("em coleta")
    ) {
        return "coleta";
    }

    if (
        valor.includes("recus") ||
        valor.includes("cancel")
    ) {
        return "recusado";
    }

    return "pendente";

}


/* =====================================================
   DOAÇÕES
===================================================== */

async function carregarDoacoes() {

    const corpo =
        document.getElementById("doacoesBody");

    if (!corpo) return;

    const { data, error } =
        await supabaseClient
            .from("doacoes")
            .select(`
                id,
                tipo_doacao,
                quantidade,
                cidade,
                estado,
                data_coleta,
                status
            `)
            .order("id", { ascending: false });

    if (error) {

        console.error(error);

        corpo.innerHTML = `
            <tr>
                <td colspan="6">
                    Erro ao carregar doações.
                </td>
            </tr>
        `;

        return;

    }

    if (!data || data.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="6">
                    Nenhuma doação cadastrada.
                </td>
            </tr>
        `;

        return;

    }

    corpo.innerHTML =
        data.map(item => `

            <tr>

                <td>${item.tipo_doacao || "-"}</td>

                <td>${item.quantidade || "-"}</td>

                <td>
                    ${item.cidade || "-"}
                    ${item.estado ? ` - ${item.estado}` : ""}
                </td>

                <td>${item.data_coleta || "-"}</td>

                <td>
                    <span class="status ${obterClasseStatus(item.status)}">
                        ${item.status || "Pendente"}
                    </span>
                </td>

                <td>
                    <button onclick="verDoacao(${item.id})">
                        Ver
                    </button>
                </td>

            </tr>

        `).join("");

}


/* =====================================================
   VER DOAÇÃO
===================================================== */

function verDoacao(id) {

    supabaseClient
        .from("doacoes")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {

            if (error) {

                alert("Não foi possível carregar a doação.");

                return;

            }

            alert(`

Tipo: ${data.tipo_doacao || "-"}
Quantidade: ${data.quantidade || "-"}
Endereço: ${data.endereco || "-"}
Cidade: ${data.cidade || "-"}
Estado: ${data.estado || "-"}
Data de coleta: ${data.data_coleta || "-"}
Observações: ${data.observacoes || "-"}
Status: ${data.status || "Pendente"}

            `);

        });

}


/* =====================================================
   COLETAS
===================================================== */

async function carregarColetas() {

    const corpo =
        document.getElementById("coletasBody");

    if (!corpo) return;

    const { data, error } =
        await supabaseClient
            .from("coletas")
            .select("*")
            .order("id", { ascending: false });

    if (error) {

        console.error("Tabela coletas:", error);

        corpo.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhuma coleta disponível
                    ou a tabela ainda não foi criada.
                </td>
            </tr>
        `;

        return;

    }

    if (!data || data.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhuma coleta cadastrada.
                </td>
            </tr>
        `;

        return;

    }

    corpo.innerHTML =
        data.map(item => `

            <tr>

                <td>${item.doacao_id || "-"}</td>

                <td>${item.endereco || "-"}</td>

                <td>${item.data_coleta || "-"}</td>

                <td>
                    <span class="status ${obterClasseStatus(item.status)}">
                        ${item.status || "Pendente"}
                    </span>
                </td>

                <td>
                    <button onclick="verColeta(${item.id})">
                        Ver
                    </button>
                </td>

            </tr>

        `).join("");

}


/* =====================================================
   VER COLETA
===================================================== */

function verColeta(id) {

    supabaseClient
        .from("coletas")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {

            if (error) {

                alert("Não foi possível carregar a coleta.");

                return;

            }

            alert(`

Doação: ${data.doacao_id || "-"}
Endereço: ${data.endereco || "-"}
Data: ${data.data_coleta || "-"}
Status: ${data.status || "Pendente"}

            `);

        });

}


/* =====================================================
   PARCEIROS
===================================================== */

async function carregarParceiros() {

    const container =
        document.getElementById("parceirosConteudo");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("parceiros")
            .select("*")
            .order("id", { ascending: false });

    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="parceiro-placeholder">
                <div class="icone-vazio">
                    <i class="fa-solid fa-handshake"></i>
                </div>
                <h3>Parceiros</h3>
                <p>
                    A tabela de parceiros ainda não está disponível.
                </p>
            </div>
        `;

        return;

    }

    if (!data || data.length === 0) {

        container.innerHTML = `
            <div class="parceiro-placeholder">
                <div class="icone-vazio">
                    <i class="fa-solid fa-handshake"></i>
                </div>
                <h3>Nenhum parceiro</h3>
                <p>
                    Ainda não existem parceiros cadastrados.
                </p>
            </div>
        `;

        return;

    }

    container.innerHTML =
        data.map(item => `

            <div class="parceiro-placeholder">

                <div class="icone-vazio">
                    <i class="fa-solid fa-handshake"></i>
                </div>

                <h3>${item.nome || "Parceiro"}</h3>

                <p>
                    ${item.descricao || "Parceiro da rede ConexAção"}
                </p>

            </div>

        `).join("");

}


/* =====================================================
   CARDS
===================================================== */

async function atualizarCards() {

    const totalDoacoes =
        document.getElementById("totalDoacoes");

    const totalColetas =
        document.getElementById("totalColetas");

    const totalFamilias =
        document.getElementById("totalFamilias");

    const totalPendentes =
        document.getElementById("totalPendentes");

    const resumoDoacoes =
        document.getElementById("resumoDoacoes");

    const resumoColetas =
        document.getElementById("resumoColetas");

    const resumoFamilias =
        document.getElementById("resumoFamilias");

    const doacoes =
        await supabaseClient
            .from("doacoes")
            .select("id", {
                count: "exact",
                head: true
            });

    const familias =
        await supabaseClient
            .from("solicitacoes")
            .select("id", {
                count: "exact",
                head: true
            });

    const pendentes =
        await supabaseClient
            .from("solicitacoes")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("status", "Pendente");

    const coletas =
        await supabaseClient
            .from("coletas")
            .select("id", {
                count: "exact",
                head: true
            });

    const quantidadeDoacoes =
        doacoes.error ? 0 : doacoes.count || 0;

    const quantidadeFamilias =
        familias.error ? 0 : familias.count || 0;

    const quantidadePendentes =
        pendentes.error ? 0 : pendentes.count || 0;

    const quantidadeColetas =
        coletas.error ? 0 : coletas.count || 0;

    if (totalDoacoes) {
        totalDoacoes.textContent = quantidadeDoacoes;
    }

    if (totalColetas) {
        totalColetas.textContent = quantidadeColetas;
    }

    if (totalFamilias) {
        totalFamilias.textContent = quantidadeFamilias;
    }

    if (totalPendentes) {
        totalPendentes.textContent = quantidadePendentes;
    }

    if (resumoDoacoes) {
        resumoDoacoes.textContent = quantidadeDoacoes;
    }

    if (resumoColetas) {
        resumoColetas.textContent = quantidadeColetas;
    }

    if (resumoFamilias) {
        resumoFamilias.textContent = quantidadeFamilias;
    }

}


/* =====================================================
   VER SOLICITAÇÃO
===================================================== */

function verSolicitacao(id) {

    supabaseClient
        .from("solicitacoes")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {

            if (error) {

                alert("Não foi possível carregar a solicitação.");

                return;

            }

            alert(`

Nome: ${data.nome || "-"}
CPF: ${data.cpf || "-"}
Telefone: ${data.telefone || "-"}
Pessoas: ${data.quantidade_pessoas || 0}
Crianças: ${data.tem_criancas ? "Sim" : "Não"}
Idosos: ${data.tem_idosos ? "Sim" : "Não"}
Cidade: ${data.cidade || "-"}
Estado: ${data.estado || "-"}
Necessidade: ${data.necessidade || "-"}
Descrição: ${data.descricao_necessidade || "-"}
História: ${data.historia || "-"}
Status: ${data.status || "Pendente"}

            `);

        });

}


/* =====================================================
   TROCAR SEÇÃO
===================================================== */

function trocarPagina(nomePagina) {

    const secoes =
        document.querySelectorAll(".dashboard-secao");

    secoes.forEach(secao => {
        secao.style.display = "none";
    });

    const secao =
        document.getElementById(nomePagina);

    if (secao) {
        secao.style.display = "block";
    }

    document
        .querySelectorAll(".menu-item")
        .forEach(item => {
            item.classList.remove("ativo");
        });

    const itemAtivo =
        document.querySelector(
            `.menu-item[data-section="${nomePagina}"]`
        );

    if (itemAtivo) {
        itemAtivo.classList.add("ativo");
    }

    const titulo =
        document.getElementById("tituloPagina");

    const descricao =
        document.getElementById("descricaoPagina");

    if (titulo && paginas[nomePagina]) {
        titulo.textContent = paginas[nomePagina].titulo;
    }

    if (descricao && paginas[nomePagina]) {
        descricao.textContent = paginas[nomePagina].descricao;
    }

    paginaAtual = nomePagina;

    if (nomePagina === "mapa") {

        if (map) {

            setTimeout(() => {

                google.maps.event.trigger(map, "resize");

                map.setCenter(CENTRO_BRASIL);

                carregarMapa();

            }, 200);

        } else if (
            typeof google !== "undefined" &&
            google.maps
        ) {

            iniciarMapa();

        }

    }

    if (nomePagina === "doacoes") {
        carregarDoacoes();
    }

    if (nomePagina === "coletas") {
        carregarColetas();
    }

    if (nomePagina === "familias") {
        carregarFamilias();
    }

    if (nomePagina === "parceiros") {
        carregarParceiros();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =====================================================
   MENU
===================================================== */

function configurarMenu() {

    document
        .querySelectorAll(".menu-item[data-section]")
        .forEach(item => {

            item.addEventListener("click", event => {

                event.preventDefault();

                const secao = item.dataset.section;

                trocarPagina(secao);

            });

        });


    document
        .querySelectorAll(".acoes-grid a")
        .forEach(botao => {

            botao.addEventListener("click", event => {

                event.preventDefault();

                const destino =
                    botao.getAttribute("href").replace("#", "");

                trocarPagina(destino);

            });

        });

}


/* =====================================================
   CONFIGURAÇÕES
===================================================== */

function configurarConfiguracoes() {

    const modal =
        document.getElementById("modalConfiguracoes");

    const abrir =
        document.getElementById("abrirConfiguracoes");

    const fechar =
        document.getElementById("fecharConfiguracoes");

    if (!modal || !abrir || !fechar) {
        return;
    }

    abrir.addEventListener("click", () => {

        modal.classList.add("aberto");

        carregarPerfil();

    });

    fechar.addEventListener("click", () => {

        modal.classList.remove("aberto");

    });

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            modal.classList.remove("aberto");
        }

    });

    document
        .querySelectorAll(".config-menu-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                const nome = item.dataset.config;

                document
                    .querySelectorAll(".config-menu-item")
                    .forEach(botao => {
                        botao.classList.remove("ativo");
                    });

                document
                    .querySelectorAll(".config-pagina")
                    .forEach(pagina => {
                        pagina.classList.remove("ativa");
                    });

                item.classList.add("ativo");

                const pagina =
                    document.querySelector(
                        `[data-config-page="${nome}"]`
                    );

                if (pagina) {
                    pagina.classList.add("ativa");
                }

            });

        });

}


/* =====================================================
   CARREGAR PERFIL
===================================================== */

async function carregarPerfil() {

    try {

        const { data, error } =
            await supabaseClient.auth.getUser();

        if (error) {

            console.error("Erro ao buscar usuário:", error);

            return;

        }

        const usuario = data?.user;

        if (!usuario) {
            return;
        }

        const nome =
            usuario.user_metadata?.nome ||
            usuario.user_metadata?.name ||
            "Administrador";

        const telefone =
            usuario.user_metadata?.telefone || "";

        const foto =
            usuario.user_metadata?.avatar_url ||
            localStorage.getItem("conexaoAvatar") ||
            "";

        const campoNome =
            document.getElementById("perfilNome");

        const campoEmail =
            document.getElementById("perfilEmail");

        const campoTelefone =
            document.getElementById("perfilTelefone");

        if (campoNome) {
            campoNome.value = nome;
        }

        if (campoEmail) {
            campoEmail.value = usuario.email || "";
        }

        if (campoTelefone) {
            campoTelefone.value = telefone;
        }

        atualizarInformacoesPerfil(nome, foto);

    } catch (erro) {

        console.error("Erro ao carregar perfil:", erro);

    }

}


/* =====================================================
   ATUALIZAR INFORMAÇÕES DO PERFIL
===================================================== */

function atualizarInformacoesPerfil(nome, foto) {

    const imagens =
        document.querySelectorAll(
            ".admin-mini img, .perfil-topo img"
        );

    const nomes =
        document.querySelectorAll(
            ".admin-mini strong, .perfil-topo strong"
        );

    nomes.forEach(elemento => {

        if (nome) {
            elemento.textContent = nome;
        }

    });

    if (foto) {

        imagens.forEach(imagem => {
            imagem.src = foto;
        });

    }

}


/* =====================================================
   SALVAR PERFIL
===================================================== */

async function salvarPerfil() {

    const campoNome =
        document.getElementById("perfilNome");

    const campoEmail =
        document.getElementById("perfilEmail");

    const campoTelefone =
        document.getElementById("perfilTelefone");

    if (!campoNome || !campoEmail || !campoTelefone) {
        return;
    }

    const nome = campoNome.value.trim();

    const email = campoEmail.value.trim();

    const telefone = campoTelefone.value.trim();

    if (!nome) {

        alert("Digite seu nome.");

        campoNome.focus();

        return;

    }

    if (!email) {

        alert("Digite seu e-mail.");

        campoEmail.focus();

        return;

    }

    try {

        const { data: usuarioData, error: usuarioError } =
            await supabaseClient.auth.getUser();

        if (usuarioError) {
            throw usuarioError;
        }

        const usuario = usuarioData?.user;

        if (!usuario) {

            alert("Sua sessão não foi encontrada.");

            return;

        }

        const emailAtual = usuario.email || "";

        const dadosAtualizados = {

            data: {

                ...usuario.user_metadata,

                nome: nome,

                telefone: telefone

            }

        };

        if (email && email !== emailAtual) {
            dadosAtualizados.email = email;
        }

        const { data, error } =
            await supabaseClient.auth.updateUser(
                dadosAtualizados
            );

        if (error) {
            throw error;
        }

        atualizarInformacoesPerfil(
            nome,
            data?.user?.user_metadata?.avatar_url ||
            localStorage.getItem("conexaoAvatar") ||
            ""
        );

        alert(
            email !== emailAtual
                ? "Perfil atualizado. Verifique seu novo e-mail para confirmar a alteração."
                : "Perfil atualizado com sucesso!"
        );

    } catch (erro) {

        console.error("Erro ao salvar perfil:", erro);

        alert(
            "Não foi possível salvar o perfil: " +
            erro.message
        );

    }

}


/* =====================================================
   ALTERAR FOTO
===================================================== */

function configurarFotoPerfil() {

    const botao =
        document.querySelector(
            ".perfil-config-topo .btn-secundario"
        );

    if (!botao) return;

    const input =
        document.createElement("input");

    input.type = "file";

    input.accept = "image/png,image/jpeg,image/webp";

    input.style.display = "none";

    document.body.appendChild(input);

    botao.addEventListener("click", () => {
        input.click();
    });

    input.addEventListener("change", event => {

        const arquivo = event.target.files?.[0];

        if (!arquivo) return;

        if (!arquivo.type.startsWith("image/")) {

            alert("Escolha uma imagem válida.");

            return;

        }

        if (arquivo.size > 2 * 1024 * 1024) {

            alert("A imagem deve ter no máximo 2 MB.");

            return;

        }

        const leitor = new FileReader();

        leitor.onload = () => {

            const imagem = leitor.result;

            localStorage.setItem("conexaoAvatar", imagem);

            atualizarInformacoesPerfil(
                document.getElementById("perfilNome")?.value ||
                "Administrador",
                imagem
            );

            alert("Foto atualizada com sucesso!");

        };

        leitor.readAsDataURL(arquivo);

    });

}


/* =====================================================
   MOBILE
===================================================== */

function configurarMobile() {

    const botao =
        document.getElementById("btnMobile");

    const sidebar =
        document.querySelector(".sidebar");

    if (!botao || !sidebar) {
        return;
    }

    botao.addEventListener("click", () => {

        sidebar.classList.toggle("aberta");

    });

    document
        .querySelectorAll(".menu-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                sidebar.classList.remove("aberta");

            });

        });

}


/* =====================================================
   NOTIFICAÇÕES
===================================================== */

function configurarNotificacoes() {

    const botao =
        document.getElementById("btnNotificacoes");

    if (!botao) return;

    botao.addEventListener("click", () => {

        alert("Central de notificações em desenvolvimento.");

    });

}


/* =====================================================
   DATA
===================================================== */

function configurarData() {

    const elemento =
        document.getElementById("dataAtual");

    if (!elemento) return;

    const agora = new Date();

    elemento.textContent =
        agora.toLocaleDateString(
            "pt-BR",
            {

                weekday: "long",

                day: "2-digit",

                month: "long",

                year: "numeric"

            }
        );

}


/* =====================================================
   SAIR
===================================================== */

function configurarSair() {

    const botoes = [

        document.getElementById("btnSair"),

        document.getElementById("btnSairMenu")

    ];

    botoes.forEach(botao => {

        if (!botao) return;

        botao.addEventListener("click", async () => {

            const confirmar =
                confirm("Deseja realmente sair da conta?");

            if (!confirmar) return;

            await supabaseClient.auth.signOut();

            window.location.href = "Login.html";

        });

    });

}


/* =====================================================
   APARÊNCIA
===================================================== */

function configurarAparencia() {

    const tema =
        document.getElementById("temaEscuro");

    const menu =
        document.getElementById("menuCompacto");

    if (tema) {

        tema.addEventListener("change", () => {

            if (tema.checked) {

                document.body.classList.remove("tema-claro");

            } else {

                document.body.classList.add("tema-claro");

            }

        });

    }

    if (menu) {

        menu.addEventListener("change", () => {

            const sidebar =
                document.querySelector(".sidebar");

            const conteudo =
                document.querySelector(".conteudo");

            if (sidebar && conteudo) {

                sidebar.classList.toggle(
                    "compacto",
                    menu.checked
                );

                conteudo.classList.toggle(
                    "menu-compacto",
                    menu.checked
                );

            }

        });

    }

}


/* =====================================================
   BOTÕES DE ATUALIZAÇÃO
===================================================== */

function configurarAtualizacoes() {

    const doacoes =
        document.getElementById("btnAtualizarDoacoes");

    const coletas =
        document.getElementById("btnAtualizarColetas");

    const familias =
        document.getElementById("btnAtualizarFamilias");

    if (doacoes) {

        doacoes.addEventListener("click", () => {
            carregarDoacoes();
        });

    }

    if (coletas) {

        coletas.addEventListener("click", () => {
            carregarColetas();
        });

    }

    if (familias) {

        familias.addEventListener("click", () => {
            carregarFamilias();
        });

    }

}


/* =====================================================
   PERFIL — CONFIGURAÇÃO
===================================================== */

function configurarPerfil() {

    const botaoSalvar =
        document.getElementById("btnSalvarPerfil");

    if (botaoSalvar) {

        botaoSalvar.addEventListener(
            "click",
            salvarPerfil
        );

    }

    configurarFotoPerfil();

}


/* =====================================================
   INICIAR DASHBOARD
===================================================== */

function iniciarDashboard() {

    if (dashboardIniciado) {
        return;
    }

    dashboardIniciado = true;

    configurarMenu();

    configurarConfiguracoes();

    configurarMobile();

    configurarNotificacoes();

    configurarData();

    configurarSair();

    configurarAparencia();

    configurarAtualizacoes();

    configurarPerfil();

    atualizarCards();

    carregarFamilias();

    carregarDoacoes();

}


/* =====================================================
   DOM
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarDashboard();

    }
);


/* =====================================================
   GOOGLE MAPS
   (o script do Google chama iniciarMapa sozinho)
===================================================== */