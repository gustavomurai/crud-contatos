// =====================
// 1) UTILITÁRIOS BÁSICOS
// =====================
const $ = (sel) => document.querySelector(sel);

// Debounce simples (para busca)
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

// Gera um id único simples (ok para front-end/localStorage)
const gerarId = () => 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Chaves no localStorage
const STORAGE_KEY = 'contatos';

// =====================
// 1.1) MÁSCARA DE TELEFONE (11 dígitos -> (DD) 99999-9999)
// =====================

// Extrai somente dígitos
function getDigits(str) {
  return (str || '').replace(/\D/g, '');
}

// Formata progressivamente até 11 dígitos
function formatTelefoneFromDigits(digits) {
  const d = (digits || '').slice(0, 11);
  const len = d.length;

  if (len === 0) return '';
  if (len < 3) return `(${d}`;                                // "(" + D
  if (len < 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;      // (DD) 9... (até 4 dígitos)
  if (len < 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; // hífen a partir de 7+
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;            // final
}

// Aplica a máscara durante digitação
function applyTelefoneMask(e) {
  const digits = getDigits(e.target.value);
  e.target.value = formatTelefoneFromDigits(digits);
}

// =====================
// 2) ESTADO DA APLICAÇÃO
// =====================
let contatos = [];          // Array de objetos { id, nome, email, telefone } (telefone salvo só como dígitos)
let modoEdicaoId = null;    // Se != null, estamos editando o contato com esse id

// =====================
// 3) ELEMENTOS DA INTERFACE
// =====================
const form = $('#form-contato');
const inputId = $('#contato-id');
const inputNome = $('#nome');
const inputEmail = $('#email');
const inputTelefone = $('#telefone');

const btnSalvar = $('#btn-salvar');
const btnCancelar = $('#btn-cancelar');

const tbody = $('#tbody');
const msgVazio = $('#vazio');

const inputBusca = $('#busca');
const selectOrdenacao = $('#ordenacao');

// estatísticas e import/export
const statTotal = $('#stat-total');
const statVisiveis = $('#stat-visiveis');
const btnExportar = $('#btn-exportar');
const inputImportar = $('#input-importar');

// Liga máscara e tratamento de colagem no campo telefone
inputTelefone.addEventListener('input', applyTelefoneMask);
inputTelefone.addEventListener('paste', (e) => {
  e.preventDefault();
  const pasted = (e.clipboardData || window.clipboardData).getData('text');
  inputTelefone.value = formatTelefoneFromDigits(getDigits(pasted));
});

// =====================
// 4) LOCALSTORAGE (persistência)
// =====================
function carregarDoStorage() {
  const bruto = localStorage.getItem(STORAGE_KEY);
  contatos = bruto ? JSON.parse(bruto) : [];
}

function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contatos));
}

// =====================
// 5) RENDERIZAÇÃO DA TABELA + STATS
// =====================
function atualizarStats(listaVisivel) {
  if (statTotal) statTotal.textContent = contatos.length;
  if (statVisiveis) statVisiveis.textContent = listaVisivel.length;
}

function renderizarTabela() {
  // Filtro de busca
  const termo = inputBusca.value.trim().toLowerCase();
  let lista = contatos.filter(c => {
    const telFmt = c.telefone && /^\d{11}$/.test(c.telefone) ? formatTelefoneFromDigits(c.telefone) : (c.telefone || '');
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.email.toLowerCase().includes(termo) ||
      telFmt.toLowerCase().includes(termo)
    );
  });

  // Ordenação
  const ord = selectOrdenacao.value;
  const [campo, direcao] = ord.split('-'); // ex: "nome-asc"
  lista.sort((a,b) => {
    const getVal = (obj) => {
      if (campo === 'nome' || campo === 'email') return (obj[campo] || '').toLowerCase();
      return (obj.nome || '').toLowerCase(); // fallback
    };
    const A = getVal(a);
    const B = getVal(b);
    if (A < B) return direcao === 'asc' ? -1 : 1;
    if (A > B) return direcao === 'asc' ? 1 : -1;
    return 0;
  });

  // Atualiza stats
  atualizarStats(lista);

  // Limpa o corpo da tabela
  tbody.innerHTML = '';

  if (lista.length === 0) {
    msgVazio.hidden = false;
    return;
  }
  msgVazio.hidden = true;

  // Cria linhas
  for (const contato of lista) {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = contato.nome;

    const tdEmail = document.createElement('td');
    tdEmail.textContent = contato.email;

    const tdTel = document.createElement('td');
    const tel = contato.telefone || '';
    const telFmt = /^\d{11}$/.test(tel) ? formatTelefoneFromDigits(tel) : (tel || '—');
    tdTel.textContent = telFmt || '—';

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'col-acoes';

    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Editar';
    btnEdit.className = 'btn btn-edit';
    btnEdit.addEventListener('click', () => iniciarEdicao(contato.id));

    const btnDel = document.createElement('button');
    btnDel.textContent = 'Excluir';
    btnDel.className = 'btn btn-del';
    btnDel.addEventListener('click', () => excluirContato(contato.id));

    tdAcoes.append(btnEdit, ' ', btnDel);
    tr.append(tdNome, tdEmail, tdTel, tdAcoes);
    tbody.appendChild(tr);
  }
}

// =====================
// 6) CRUD — FUNÇÕES
// =====================

// CREATE
function criarContato({ nome, email, telefone }) {
  const novo = {
    id: gerarId(),
    nome: nome.trim(),
    email: email.trim(),
    // salva apenas dígitos
    telefone: getDigits(telefone)
  };
  contatos.push(novo);
  salvarNoStorage();
  renderizarTabela();
}

// READ -> já é o renderizarTabela + carregarDoStorage

// UPDATE
function iniciarEdicao(id) {
  const c = contatos.find(x => x.id === id);
  if (!c) return;

  modoEdicaoId = id;
  inputId.value = id;
  inputNome.value = c.nome;
  inputEmail.value = c.email;

  // Campo de telefone: mostrar formatado no input
  const tel = c.telefone || '';
  inputTelefone.value = /^\d{11}$/.test(tel) ? formatTelefoneFromDigits(tel) : tel;

  btnCancelar.hidden = false;
  btnSalvar.textContent = 'Atualizar';
  inputNome.focus();
}

function cancelarEdicao() {
  modoEdicaoId = null;
  inputId.value = '';
  form.reset();
  btnCancelar.hidden = true;
  btnSalvar.textContent = 'Salvar';
  inputNome.focus();
}

function atualizarContato(id, { nome, email, telefone }) {
  const idx = contatos.findIndex(x => x.id === id);
  if (idx === -1) return;

  contatos[idx].nome = nome.trim();
  contatos[idx].email = email.trim();
  // salva apenas dígitos
  contatos[idx].telefone = getDigits(telefone);

  salvarNoStorage();
  renderizarTabela();
}

// DELETE
function excluirContato(id) {
  const c = contatos.find(x => x.id === id);
  if (!c) return;
  const ok = confirm(`Tem certeza que deseja excluir "${c.nome}"?`);
  if (!ok) return;

  contatos = contatos.filter(x => x.id !== id);
  salvarNoStorage();
  renderizarTabela();

  // Se estava editando esse contato, cancela edição
  if (modoEdicaoId === id) cancelarEdicao();
}

// =====================
// 7) VALIDAÇÃO
// =====================
function validarFormulario() {
  // HTML já valida required e email, mas reforçamos
  if (!inputNome.value.trim()) {
    alert('Informe o nome.');
    inputNome.focus();
    return false;
  }
  if (!inputEmail.value.trim()) {
    alert('Informe o e-mail.');
    inputEmail.focus();
    return false;
  }

  // Telefone OBRIGATÓRIO: 11 dígitos (DDD + número)
  const telDigits = getDigits(inputTelefone.value);
  if (telDigits.length !== 11) {
    alert('Informe o telefone com 11 números (DDD + número).');
    inputTelefone.focus();
    return false;
  }

  return true;
}

// =====================
// 8) IMPORTAR / EXPORTAR (JSON)
// =====================
function exportarJSON(){
  const dataStr = JSON.stringify(contatos, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download = `contatos-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importarJSON(arquivo){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('JSON inválido');
      const norm = data
        .filter(x => x && typeof x === 'object')
        .map(x => ({
          id: x.id && String(x.id) || gerarId(),
          nome: x.nome && String(x.nome) || '',
          email: x.email && String(x.email) || '',
          telefone: x.telefone && getDigits(String(x.telefone)) || ''
        }))
        .filter(x => x.nome && x.email);

      contatos = [...contatos, ...norm];
      salvarNoStorage();
      renderizarTabela();
    }catch(err){
      alert('Falha ao importar JSON.');
      console.error(err);
    }
  };
  reader.readAsText(arquivo);
}

// =====================
// 9) EVENTOS DA INTERFACE
// =====================
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validarFormulario()) return;

  const payload = {
    nome: inputNome.value,
    email: inputEmail.value,
    // enviar o que está no input (formatado) — a função de criar/atualizar salva só os dígitos
    telefone: inputTelefone.value || ''
  };

  if (modoEdicaoId) {
    atualizarContato(modoEdicaoId, payload);
    cancelarEdicao();
  } else {
    criarContato(payload);
    form.reset();
    inputNome.focus();
  }
});

btnCancelar.addEventListener('click', cancelarEdicao);

// Busca (com debounce)
inputBusca.addEventListener('input', debounce(renderizarTabela, 300));

// Ordenação
selectOrdenacao.addEventListener('change', renderizarTabela);

// Importar / Exportar
btnExportar.addEventListener('click', exportarJSON);
inputImportar.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) importarJSON(file);
  e.target.value = '';
});

// =====================
// 10) INICIALIZAÇÃO
// =====================
function init() {
  carregarDoStorage();
  renderizarTabela();
  inputNome.focus();
}
document.addEventListener('DOMContentLoaded', init);
