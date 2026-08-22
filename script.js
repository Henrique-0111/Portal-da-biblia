
const BIBLE_URL = "bible-acf.json";

// a Bíblia protestante tem 66 livros: os 39 primeiros são o Antigo Testamento
const TOTAL_LIVROS_AT = 39;

const LS_MARCADOS = "pb_versiculos_marcados";
const LS_POSICAO = "pb_ultima_leitura";
const LS_FONTE = "pb_tamanho_fonte";

let bibleData = null;      // [{ abbrev, book, chapters: [[versos...], ...] }, ...]
let livroAtual = 0;        // índice do livro
let capituloAtual = 0;     // índice do capítulo (0-based)
let livroSelecionadoIndice = null; // livro aberto dentro do painel de índice
let primeiraRenderizacao = true;   // evita rolar a tela no carregamento inicial

// ---------- elementos ----------
const elTitulo = document.getElementById("tituloCapitulo");
const elVersiculos = document.getElementById("conteudoVersiculos");
const elListaMarcados = document.getElementById("listaMarcados");

const elBtnAnterior = document.getElementById("btnAnterior");
const elBtnProximo = document.getElementById("btnProximo");
const elBtnAnteriorRodape = document.getElementById("btnAnteriorRodape");
const elBtnProximoRodape = document.getElementById("btnProximoRodape");

const elPosicaoLivro = document.getElementById("posicaoLivro");
const elPosicaoCapitulo = document.getElementById("posicaoCapitulo");
const elBtnAbrirIndice = document.getElementById("btnAbrirIndice");

const elPainelIndice = document.getElementById("painelIndice");
const elIndiceTitulo = document.getElementById("indiceTitulo");
const elIndiceLivros = document.getElementById("indiceLivros");
const elIndiceCapitulos = document.getElementById("indiceCapitulos");
const elVoltarLivros = document.getElementById("voltarLivros");
const elFecharIndice = document.getElementById("fecharIndice");

const elFormBusca = document.getElementById("formBusca");
const elInputBusca = document.getElementById("inputBusca");
const elResultadosBusca = document.getElementById("resultadosBusca");
const elListaResultados = document.getElementById("listaResultados");
const elTituloBusca = document.getElementById("tituloBusca");
const elFecharBusca = document.getElementById("fecharBusca");
const elAreaLeitura = document.getElementById("areaLeitura");

const elFontMais = document.getElementById("fontMais");
const elFontMenos = document.getElementById("fontMenos");

// ---------- utilidade: só liga o evento se o elemento existir ----------
// evita que um único ID ausente no HTML quebre o script inteiro
function on(elemento, evento, handler) {
  if (elemento) elemento.addEventListener(evento, handler);
}

// ---------- utilidade: escapa HTML antes de injetar texto dinâmico ----------
function escapeHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// ---------- utilidades de marcação (localStorage) ----------
function getMarcados() {
  try {
    return JSON.parse(localStorage.getItem(LS_MARCADOS)) || [];
  } catch {
    return [];
  }
}

function salvarMarcados(lista) {
  localStorage.setItem(LS_MARCADOS, JSON.stringify(lista));
}

function estaMarcado(b, c, v) {
  return getMarcados().some(m => m.b === b && m.c === c && m.v === v);
}

function alternarMarcado(b, c, v, texto) {
  let lista = getMarcados();
  const existe = lista.find(m => m.b === b && m.c === c && m.v === v);

  if (existe) {
    lista = lista.filter(m => !(m.b === b && m.c === c && m.v === v));
  } else {
    lista.push({ b, c, v, livro: bibleData[b].name, texto, salvoEm: Date.now() });
  }

  salvarMarcados(lista);
  renderMarcados();
}

function renderMarcados() {
  if (!elListaMarcados) return;

  const lista = getMarcados().sort((a, z) => z.salvoEm - a.salvoEm);

  if (lista.length === 0) {
    elListaMarcados.innerHTML = `<li class="marcados-vazio">Nenhum versículo marcado ainda.</li>`;
    return;
  }

  elListaMarcados.innerHTML = lista.map(m => `
    <li class="marcado-item" data-b="${m.b}" data-c="${m.c}" data-v="${m.v}">
      <span class="marcado-ref">${escapeHTML(m.livro)} ${m.c + 1}:${m.v + 1}</span>
      <span class="marcado-texto">${escapeHTML(m.texto)}</span>
      <button class="marcado-remover" title="Remover marcação" aria-label="Remover marcação">✕</button>
    </li>
  `).join("");

  elListaMarcados.querySelectorAll(".marcado-item").forEach(item => {
    const b = Number(item.dataset.b);
    const c = Number(item.dataset.c);
    const v = Number(item.dataset.v);

    item.querySelector(".marcado-ref").addEventListener("click", () => irParaCapitulo(b, c, v));
    item.querySelector(".marcado-texto").addEventListener("click", () => irParaCapitulo(b, c, v));
    item.querySelector(".marcado-remover").addEventListener("click", (e) => {
      e.stopPropagation();
      alternarMarcado(b, c, v, "");
      if (b === livroAtual && c === capituloAtual) {
        const versoEl = elVersiculos?.querySelector(`[data-v="${v}"]`);
        if (versoEl) versoEl.classList.remove("marcado");
      }
    });
  });
}

// ---------- posição de leitura ----------
function salvarPosicao() {
  localStorage.setItem(LS_POSICAO, JSON.stringify({ livroAtual, capituloAtual }));
}

function carregarPosicao() {
  try {
    const pos = JSON.parse(localStorage.getItem(LS_POSICAO));
    if (pos && bibleData[pos.livroAtual] && bibleData[pos.livroAtual].chapters[pos.capituloAtual]) {
      return pos;
    }
  } catch {
    /* ignora */
  }
  return { livroAtual: 0, capituloAtual: 0 };
}

// ---------- tamanho da fonte ----------
function aplicarFonte() {
  if (!elVersiculos) return;
  const tamanho = Number(localStorage.getItem(LS_FONTE)) || 19;
  elVersiculos.style.fontSize = tamanho + "px";
}

on(elFontMais, "click", () => {
  const atual = Number(localStorage.getItem(LS_FONTE)) || 19;
  localStorage.setItem(LS_FONTE, Math.min(atual + 2, 30));
  aplicarFonte();
});

on(elFontMenos, "click", () => {
  const atual = Number(localStorage.getItem(LS_FONTE)) || 19;
  localStorage.setItem(LS_FONTE, Math.max(atual - 2, 15));
  aplicarFonte();
});

// ---------- índice: livros e capítulos ----------
function construirIndiceLivros() {
  if (!elIndiceLivros) return;

  const grupos = [
    { titulo: "Antigo Testamento", inicio: 0, fim: TOTAL_LIVROS_AT },
    { titulo: "Novo Testamento", inicio: TOTAL_LIVROS_AT, fim: bibleData.length }
  ];

  elIndiceLivros.innerHTML = grupos.map(grupo => {
    const botoes = bibleData.slice(grupo.inicio, grupo.fim).map((livro, i) => {
      const indice = grupo.inicio + i;
      return `<button class="indice-livro-btn" data-b="${indice}">${escapeHTML(livro.name)}</button>`;
    }).join("");

    return `
      <h4 class="indice-grupo-titulo">${grupo.titulo}</h4>
      <div class="indice-livros-grid">${botoes}</div>
    `;
  }).join("");

  elIndiceLivros.querySelectorAll(".indice-livro-btn").forEach(btn => {
    btn.addEventListener("click", () => abrirCapitulosIndice(Number(btn.dataset.b)));
  });
}

function abrirCapitulosIndice(bookIndex) {
  if (!elIndiceCapitulos || !elIndiceTitulo) return;

  livroSelecionadoIndice = bookIndex;
  const livro = bibleData[bookIndex];

  elIndiceTitulo.textContent = livro.name;
  elVoltarLivros?.classList.remove("hidden");

  let botoes = "";
  for (let i = 0; i < livro.chapters.length; i++) {
    const ativo = bookIndex === livroAtual && i === capituloAtual ? " capitulo-ativo" : "";
    botoes += `<button class="indice-capitulo-btn${ativo}" data-c="${i}">${i + 1}</button>`;
  }
  elIndiceCapitulos.innerHTML = `<div class="indice-capitulos-grid">${botoes}</div>`;

  elIndiceCapitulos.querySelectorAll(".indice-capitulo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      renderCapitulo(bookIndex, Number(btn.dataset.c));
      fecharIndice();
    });
  });

  elIndiceLivros?.classList.add("hidden");
  elIndiceCapitulos.classList.remove("hidden");
}

function voltarParaLivros() {
  if (elIndiceTitulo) elIndiceTitulo.textContent = "Livros da Bíblia";
  elVoltarLivros?.classList.add("hidden");
  elIndiceCapitulos?.classList.add("hidden");
  elIndiceLivros?.classList.remove("hidden");
}

function abrirIndice() {
  voltarParaLivros();
  elPainelIndice?.classList.remove("hidden");
}

function fecharIndice() {
  elPainelIndice?.classList.add("hidden");
}

on(elBtnAbrirIndice, "click", abrirIndice);
on(elFecharIndice, "click", fecharIndice);
on(elVoltarLivros, "click", voltarParaLivros);
on(elPainelIndice, "click", (e) => {
  if (e.target === elPainelIndice) fecharIndice();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  fecharIndice();
  esconderResultadosBusca();
});

// ---------- renderização do capítulo (texto corrido, como uma bíblia de verdade) ----------
function renderCapitulo(bookIndex, chapterIndex) {
  if (!elVersiculos || !elTitulo) return;

  livroAtual = bookIndex;
  capituloAtual = chapterIndex;

  const livro = bibleData[bookIndex];
  const versos = livro.chapters[chapterIndex];

  elTitulo.textContent = `${livro.name} ${chapterIndex + 1}`;
  if (elPosicaoLivro) elPosicaoLivro.textContent = livro.name;
  if (elPosicaoCapitulo) elPosicaoCapitulo.textContent = chapterIndex + 1;

  const versosHtml = versos.map((texto, v) => `<span class="versiculo${estaMarcado(bookIndex, chapterIndex, v) ? " marcado" : ""}" data-v="${v}"><sup class="num">${v + 1}</sup>${escapeHTML(texto)} </span>`).join("");

  elVersiculos.innerHTML = `<p class="pagina-texto">${versosHtml}</p>`;

  elVersiculos.querySelectorAll(".versiculo").forEach(el => {
    const v = Number(el.dataset.v);
    const texto = el.textContent.replace(/^\d+\s*/, "").trim();

    el.addEventListener("click", () => {
      el.classList.toggle("marcado");
      alternarMarcado(bookIndex, chapterIndex, v, texto);
    });
  });

  salvarPosicao();

  // não rola a tela na primeira renderização (carregamento inicial da página);
  // só rola em navegações subsequentes (próximo/anterior, índice, busca)
  if (!primeiraRenderizacao && elAreaLeitura) {
    window.scrollTo({ top: elAreaLeitura.offsetTop - 90, behavior: "smooth" });
  }
  primeiraRenderizacao = false;
}

function irParaCapitulo(b, c, v) {
  esconderResultadosBusca();
  renderCapitulo(b, c);
  setTimeout(() => {
    const versoEl = elVersiculos?.querySelector(`[data-v="${v}"]`);
    if (versoEl) {
      versoEl.classList.add("destacado-temp");
      versoEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => versoEl.classList.remove("destacado-temp"), 1800);
    }
  }, 60);
}

// ---------- navegação anterior / próximo ----------
function capituloAnterior() {
  if (capituloAtual > 0) {
    renderCapitulo(livroAtual, capituloAtual - 1);
  } else if (livroAtual > 0) {
    const novoLivro = livroAtual - 1;
    renderCapitulo(novoLivro, bibleData[novoLivro].chapters.length - 1);
  }
}

function proximoCapitulo() {
  const totalCapitulos = bibleData[livroAtual].chapters.length;
  if (capituloAtual < totalCapitulos - 1) {
    renderCapitulo(livroAtual, capituloAtual + 1);
  } else if (livroAtual < bibleData.length - 1) {
    renderCapitulo(livroAtual + 1, 0);
  }
}

[elBtnAnterior, elBtnAnteriorRodape].forEach(b => on(b, "click", capituloAnterior));
[elBtnProximo, elBtnProximoRodape].forEach(b => on(b, "click", proximoCapitulo));

// ---------- busca por palavra/trecho ----------
function normalizar(txt) {
  return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buscar(termo) {
  const termoNorm = normalizar(termo.trim());
  if (!termoNorm || !bibleData) return;

  const resultados = [];

  bibleData.forEach((livro, b) => {
    livro.chapters.forEach((versos, c) => {
      versos.forEach((texto, v) => {
        if (normalizar(texto).includes(termoNorm)) {
          resultados.push({ b, c, v, livro: livro.name, texto });
        }
      });
    });
  });

  mostrarResultadosBusca(termo, resultados);
}

function mostrarResultadosBusca(termo, resultados) {
  if (!elTituloBusca || !elListaResultados) return;

  elTituloBusca.textContent = `${resultados.length} resultado(s) para "${termo}"`;

  if (resultados.length === 0) {
    elListaResultados.innerHTML = `<p class="sem-resultados">Nenhum versículo encontrado. Tente outra palavra.</p>`;
  } else {
    elListaResultados.innerHTML = resultados.slice(0, 100).map(r => `
      <p class="resultado-item" data-b="${r.b}" data-c="${r.c}" data-v="${r.v}">
        <strong>${escapeHTML(r.livro)} ${r.c + 1}:${r.v + 1}</strong> — ${escapeHTML(r.texto)}
      </p>
    `).join("");

    if (resultados.length > 100) {
      elListaResultados.innerHTML += `<p class="sem-resultados">Mostrando os 100 primeiros resultados.</p>`;
    }

    elListaResultados.querySelectorAll(".resultado-item").forEach(item => {
      item.addEventListener("click", () => {
        irParaCapitulo(Number(item.dataset.b), Number(item.dataset.c), Number(item.dataset.v));
      });
    });
  }

  elResultadosBusca?.classList.remove("hidden");
  elAreaLeitura?.classList.add("hidden");
}

function esconderResultadosBusca() {
  elResultadosBusca?.classList.add("hidden");
  elAreaLeitura?.classList.remove("hidden");
  if (elInputBusca) elInputBusca.value = "";
}

on(elFormBusca, "submit", (e) => {
  e.preventDefault();
  buscar(elInputBusca ? elInputBusca.value : "");
});

on(elFecharBusca, "click", esconderResultadosBusca);

// ---------- inicialização ----------
async function iniciar() {
  aplicarFonte();
  renderMarcados();

  // feedback visual enquanto o texto da Bíblia (arquivo grande) é baixado
  if (elTitulo) elTitulo.textContent = "Carregando a Bíblia...";
  if (elVersiculos) elVersiculos.innerHTML = `<p class="carregando-texto">Isso pode levar alguns segundos na primeira vez.</p>`;

  try {
    const resposta = await fetch(BIBLE_URL);
    if (!resposta.ok) throw new Error("Falha ao buscar o texto bíblico");
    bibleData = await resposta.json();

    construirIndiceLivros();

    const posicao = carregarPosicao();
    renderCapitulo(posicao.livroAtual, posicao.capituloAtual);

  } catch (erro) {
    if (elTitulo) elTitulo.textContent = "Não foi possível carregar a Bíblia";
    if (elVersiculos) {
      elVersiculos.innerHTML = `
        <p class="erro-carregamento">
          Verifique sua conexão com a internet e recarregue a página.
          O texto da Bíblia é carregado a partir de uma fonte externa gratuita.
        </p>`;
    }
    console.error(erro);
  }
}

if (elVersiculos && elTitulo) {
  iniciar();
}

/* ============================================================
   LOGIN E CADASTRO
   (roda apenas nas páginas que têm esses formulários —
   login.html e cadastro.html)
============================================================ */

// true = simula sucesso sem chamar o Supabase de verdade.
// Trocar para false quando o banco/tabelas estiverem prontos.
const MODO_MOCK = true;
const LS_SESSAO = "pb_sessao_mock";
const LS_USUARIOS = "pb_usuarios_mock";

function salvarSessaoMock(email) {
  localStorage.setItem(LS_SESSAO, JSON.stringify({ email }));
}

function getSessaoMock() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSAO));
  } catch {
    return null;
  }
}

// ---- "banco" de usuários mock (fica só no seu navegador, em localStorage) ----
function getUsuariosMock() {
  try {
    return JSON.parse(localStorage.getItem(LS_USUARIOS)) || {};
  } catch {
    return {};
  }
}

function upsertUsuarioMock(email, dadosParciais) {
  const diretorio = getUsuariosMock();
  const existente = diretorio[email] || { nome: "", email, criadoEm: Date.now() };
  diretorio[email] = { ...existente, ...dadosParciais, email };
  localStorage.setItem(LS_USUARIOS, JSON.stringify(diretorio));
  return diretorio[email];
}

function obterIniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ---- mostra/esconde os botões Entrar/Criar conta vs. o chip de conta logada ----
// roda em toda página que tiver o header padrão (index.html, bible.html, perfil.html)
function atualizarHeaderAuth() {
  const sessao = getSessaoMock();
  const elGuest = document.querySelectorAll('[data-auth="guest"]');
  const elUser = document.querySelectorAll('[data-auth="user"]');

  if (sessao) {
    const usuario = getUsuariosMock()[sessao.email];
    const nome = usuario?.nome || sessao.email.split("@")[0];

    elGuest.forEach(el => { el.hidden = true; });
    elUser.forEach(el => { el.hidden = false; });

    const elAvatar = document.getElementById("headerContaAvatar");
    const elNome = document.getElementById("headerContaNome");

    if (elAvatar) {
      if (usuario?.avatar) {
        elAvatar.style.backgroundImage = `url("${usuario.avatar}")`;
        elAvatar.textContent = "";
      } else {
        elAvatar.style.backgroundImage = "";
        elAvatar.textContent = obterIniciais(nome);
      }
    }
    if (elNome) elNome.textContent = nome;

  } else {
    elGuest.forEach(el => { el.hidden = false; });
    elUser.forEach(el => { el.hidden = true; });
  }
}

atualizarHeaderAuth();

function mostrarMensagemAuth(elemento, texto, tipo) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = tipo; // 'erro' ou 'sucesso'
}

// ---------- LOGIN ----------
const elFormLogin = document.getElementById("loginForm");

if (elFormLogin) {
  const elMensagemLogin = document.getElementById("mensagem");

  elFormLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const senha = document.getElementById("senha")?.value;
    const botao = elFormLogin.querySelector("button[type='submit']");

    if (elMensagemLogin) elMensagemLogin.textContent = "";

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Entrando...";
    }

    if (MODO_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      upsertUsuarioMock(email, {}); // garante que exista um registro, mesmo sem nome conhecido
      salvarSessaoMock(email);
      // login sempre com sucesso em modo mock -> vai direto pro perfil
      window.location.href = "perfil.html";
      return;
    }

    // ---- Quando MODO_MOCK for false, substituir o bloco abaixo pela
    // chamada real: await supabaseClient.auth.signInWithPassword({ email, password: senha })
    try {
      throw new Error("Integração real com Supabase ainda não implementada. Deixe MODO_MOCK = true.");
    } catch (erro) {
      mostrarMensagemAuth(elMensagemLogin, "E-mail ou senha incorretos.", "erro");
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Entrar";
      }
    }
  });
}

// ---------- CADASTRO ----------
const elFormCadastro = document.getElementById("cadastroForm");

if (elFormCadastro) {
  const elMensagemCadastro = document.getElementById("mensagem");

  elFormCadastro.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nome = document.getElementById("nome")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const senha = document.getElementById("senha")?.value;
    const confirmarSenha = document.getElementById("confirmarSenha")?.value;
    const botao = elFormCadastro.querySelector("button[type='submit']");

    if (elMensagemCadastro) elMensagemCadastro.textContent = "";

    if (senha !== confirmarSenha) {
      mostrarMensagemAuth(elMensagemCadastro, "As senhas não coincidem.", "erro");
      return;
    }

    if (senha.length < 6) {
      mostrarMensagemAuth(elMensagemCadastro, "A senha deve ter pelo menos 6 caracteres.", "erro");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Criando conta...";
    }

    if (MODO_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      upsertUsuarioMock(email, { nome });
      salvarSessaoMock(email);
      // cadastro sempre com sucesso em modo mock -> vai direto pro perfil
      window.location.href = "perfil.html";
      return;
    }

    // ---- Quando MODO_MOCK for false, substituir o bloco abaixo pela
    // chamada real: await supabaseClient.auth.signUp({ email, password: senha, options: {...} })
    try {
      throw new Error("Integração real com Supabase ainda não implementada. Deixe MODO_MOCK = true.");
    } catch (erro) {
      mostrarMensagemAuth(elMensagemCadastro, "Não foi possível criar a conta. Tente novamente.", "erro");
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Cadastrar";
      }
    }
  });
}

/* ============================================================
   PERFIL
   (roda apenas em perfil.html — visualização + edição estilo Instagram)
============================================================ */

const elPerfilView = document.getElementById("perfil-visualizacao");
const elPerfilEdit = document.getElementById("perfil-edicao");
const elBtnSair = document.getElementById("btnSair");

on(elBtnSair, "click", async () => {
  if (MODO_MOCK) {
    localStorage.removeItem(LS_SESSAO);
    window.location.href = "login.html";
    return;
  }

  // ---- Quando MODO_MOCK for false, substituir pela chamada real:
  // await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

if (elPerfilView && elPerfilEdit) {
  const sessaoAtual = getSessaoMock();

  if (!sessaoAtual) {
    // ninguém logado (acessou perfil.html direto) -> manda pro login
    window.location.href = "login.html";
  } else {

    const elFotoView = document.getElementById("perfilFotoView");
    const elIniciaisView = document.getElementById("perfilIniciaisView");
    const elNomeView = document.getElementById("perfilNomeView");
    const elEmailView = document.getElementById("perfilEmailView");
    const elBadgeTelefone = document.getElementById("badgeTelefone");
    const elTelefoneView = document.getElementById("perfilTelefoneView");
    const elBadgeIdade = document.getElementById("badgeIdade");
    const elIdadeView = document.getElementById("perfilIdadeView");
    const elDataCadastro = document.getElementById("perfilDataCadastro");

    const elBtnEditar = document.getElementById("btnEditarPerfil");
    const elBtnCancelar = document.getElementById("btnCancelarEdicao");
    const elPerfilForm = document.getElementById("perfilForm");
    const elNomeInput = document.getElementById("nomeExibicao");
    const elTelefoneInput = document.getElementById("telefone");
    const elIdadeInput = document.getElementById("idade");
    const elFotoInput = document.getElementById("perfilFotoInput");
    const elFotoPreview = document.getElementById("perfilFotoPreview");
    const elIniciaisPreview = document.getElementById("perfilIniciaisPreview");
    const elMensagemEdicao = document.getElementById("mensagemEdicao");

    let fotoTemporaria = null; // dataURL escolhida na edição, só vira definitiva ao salvar

    function renderPerfil() {
      const usuario = getUsuariosMock()[sessaoAtual.email] || { nome: "", email: sessaoAtual.email, criadoEm: Date.now() };
      const nome = usuario.nome || sessaoAtual.email.split("@")[0];

      if (elNomeView) elNomeView.textContent = nome;
      if (elEmailView) elEmailView.textContent = usuario.email;

      if (elFotoView && elIniciaisView) {
        if (usuario.avatar) {
          elFotoView.src = usuario.avatar;
          elFotoView.hidden = false;
          elIniciaisView.hidden = true;
        } else {
          elFotoView.hidden = true;
          elIniciaisView.hidden = false;
          elIniciaisView.textContent = obterIniciais(nome);
        }
      }

      if (elBadgeTelefone && elTelefoneView) {
        if (usuario.telefone) {
          elTelefoneView.textContent = usuario.telefone;
          elBadgeTelefone.hidden = false;
        } else {
          elBadgeTelefone.hidden = true;
        }
      }

      if (elBadgeIdade && elIdadeView) {
        if (usuario.idade) {
          elIdadeView.textContent = usuario.idade + " anos";
          elBadgeIdade.hidden = false;
        } else {
          elBadgeIdade.hidden = true;
        }
      }

      if (elDataCadastro) {
        const data = new Date(usuario.criadoEm || Date.now());
        elDataCadastro.textContent = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      }

      atualizarHeaderAuth();
    }

    function abrirEdicao() {
      const usuario = getUsuariosMock()[sessaoAtual.email] || {};

      if (elNomeInput) elNomeInput.value = usuario.nome || "";
      if (elTelefoneInput) elTelefoneInput.value = usuario.telefone || "";
      if (elIdadeInput) elIdadeInput.value = usuario.idade || "";
      fotoTemporaria = usuario.avatar || null;

      if (elFotoPreview && elIniciaisPreview) {
        if (fotoTemporaria) {
          elFotoPreview.src = fotoTemporaria;
          elFotoPreview.hidden = false;
          elIniciaisPreview.hidden = true;
        } else {
          elFotoPreview.hidden = true;
          elIniciaisPreview.hidden = false;
          elIniciaisPreview.textContent = obterIniciais(usuario.nome || sessaoAtual.email);
        }
      }

      if (elMensagemEdicao) { elMensagemEdicao.textContent = ""; elMensagemEdicao.className = ""; }

      elPerfilView.hidden = true;
      elPerfilEdit.hidden = false;
    }

    function fecharEdicao() {
      elPerfilEdit.hidden = true;
      elPerfilView.hidden = false;
    }

    on(elBtnEditar, "click", abrirEdicao);
    on(elBtnCancelar, "click", fecharEdicao);

    on(elFotoInput, "change", () => {
      const arquivo = elFotoInput.files?.[0];
      if (!arquivo) return;

      const leitor = new FileReader();
      leitor.onload = () => {
        fotoTemporaria = leitor.result;
        if (elFotoPreview && elIniciaisPreview) {
          elFotoPreview.src = fotoTemporaria;
          elFotoPreview.hidden = false;
          elIniciaisPreview.hidden = true;
        }
      };
      leitor.readAsDataURL(arquivo);
    });

    on(elPerfilForm, "submit", (evento) => {
      evento.preventDefault();

      const nome = elNomeInput ? elNomeInput.value.trim() : "";
      if (!nome) {
        mostrarMensagemAuth(elMensagemEdicao, "O nome é obrigatório.", "erro");
        return;
      }

      upsertUsuarioMock(sessaoAtual.email, {
        nome,
        telefone: elTelefoneInput ? elTelefoneInput.value.trim() : "",
        idade: elIdadeInput ? elIdadeInput.value.trim() : "",
        avatar: fotoTemporaria
      });

      renderPerfil();
      fecharEdicao();
    });

    renderPerfil();
  }
}