// =====================
// Utilitários
// =====================
const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'contatos';
const gerarId = () => 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function getDigits(str){ return (str||'').replace(/\D/g,''); }
function formatTelefoneFromDigits(d){
  d = (d||'').slice(0,11);
  if(!d) return '';
  if(d.length<3) return `(${d}`;
  if(d.length<7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
}

// =====================
// Estado
// =====================
let contatos = [];
let modoEdicaoId = null;

// =====================
// DOM
// =====================
const tbody = $('#tbody');
const inputBusca = $('#busca');
const selectOrdenacao = $('#ordenacao');
const vazio = $('#vazio');
const resumo = $('#resumo');
const btnExportar = $('#btn-exportar');
const fabAdd = $('#fab-add');
const btnAbrirModal = $('#btn-abrir-modal');

// Modal
const modal = $('#modal');
const btnFechar = $('#btn-fechar');
const btnCancelar = $('#btn-cancelar');
const formModal = $('#form-modal');
const inputId = $('#contato-id');
const inputNome = $('#nome');
const inputEmail = $('#email');
const inputTelefone = $('#telefone');

// Toast
function toast(msg, ms=2000){
  const el = document.querySelector('.toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), ms);
}

// =====================
// Storage
// =====================
function carregar(){ const raw = localStorage.getItem(STORAGE_KEY); contatos = raw ? JSON.parse(raw) : []; }
function salvar(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(contatos)); }

// =====================
// Render
// =====================
function atualizarResumo(visiveis){ resumo.textContent = `Mostrando ${visiveis} de ${contatos.length} contatos`; }

function render(){
  const termo = (inputBusca.value||'').trim().toLowerCase();
  let lista = contatos.filter(c=>{
    const telFmt = c.telefone && /^\d{11}$/.test(c.telefone) ? formatTelefoneFromDigits(c.telefone) : (c.telefone||'');
    return c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo) || telFmt.toLowerCase().includes(termo);
  });

  const [campo,dir] = selectOrdenacao.value.split('-');
  lista.sort((a,b)=>{
    const va = (campo==='email'?a.email:a.nome).toLowerCase();
    const vb = (campo==='email'?b.email:b.nome).toLowerCase();
    if(va<vb) return dir==='asc'?-1:1;
    if(va>vb) return dir==='asc'?1:-1;
    return 0;
  });

  tbody.innerHTML = '';
  if(lista.length===0){ vazio.hidden=false; atualizarResumo(0); return; }
  vazio.hidden=true;

  for(const c of lista){
    const tr=document.createElement('tr');

    // Nome com avatar
    const tdNome=document.createElement('td');
    const init=(c.nome?.trim()[0]||'?').toUpperCase();
    tdNome.innerHTML=`<div class="name-cell"><span class="avatar">${init}</span>${c.nome}</div>`;

    const tdEmail=document.createElement('td'); tdEmail.textContent=c.email;

    const tdTel=document.createElement('td');
    const tel=c.telefone||'';
    tdTel.textContent=/^\d{11}$/.test(tel)?formatTelefoneFromDigits(tel):(tel||'—');

    const tdAcoes=document.createElement('td'); tdAcoes.className='col-acoes';
    const wrap=document.createElement('div'); wrap.className='action-wrap';

    const bEdit=document.createElement('button');
    bEdit.className='icon-btn';
    bEdit.innerHTML=`<img src="imagens/editar.svg" alt="Editar" width="20" height="20">`;
    bEdit.addEventListener('click',()=>iniciarEdicao(c.id));

    const bDel=document.createElement('button');
    bDel.className='icon-btn danger';
    bDel.innerHTML=`<img src="imagens/excluir.svg" alt="Excluir" width="20" height="20">`;
    bDel.addEventListener('click',()=>excluirContato(c.id));

    wrap.append(bEdit,bDel);
    tdAcoes.appendChild(wrap);
    tr.append(tdNome,tdEmail,tdTel,tdAcoes);
    tbody.appendChild(tr);
  }

  atualizarResumo(lista.length);
}

// =====================
// CRUD
// =====================
function criar({nome,email,telefone}){
  contatos.push({ id:gerarId(), nome:nome.trim(), email:email.trim(), telefone:getDigits(telefone) });
  salvar(); render(); toast('Contato adicionado');
}
function atualizar(id,{nome,email,telefone}){
  const i=contatos.findIndex(x=>x.id===id); if(i===-1) return;
  contatos[i]={...contatos[i], nome:nome.trim(), email:email.trim(), telefone:getDigits(telefone)};
  salvar(); render(); toast('Contato atualizado');
}
function excluirContato(id){
  const c=contatos.find(x=>x.id===id); if(!c) return;
  if(!confirm(`Excluir "${c.nome}"?`)) return;
  contatos=contatos.filter(x=>x.id!==id);
  salvar(); render(); toast('Contato excluído');
}

// =====================
// Modal
// =====================
function abrirModal(){ modal.classList.add('show'); setTimeout(()=>inputNome.focus(),50); }
function fecharModal(){
  modal.classList.remove('show'); formModal.reset(); modoEdicaoId=null; $('#titulo-modal').textContent='Novo contato';
}
function iniciarEdicao(id){
  const c=contatos.find(x=>x.id===id); if(!c) return;
  modoEdicaoId=id; $('#titulo-modal').textContent='Editar contato';
  inputId.value=id; inputNome.value=c.nome; inputEmail.value=c.email;
  inputTelefone.value=/^\d{11}$/.test(c.telefone||'')?formatTelefoneFromDigits(c.telefone):c.telefone;
  abrirModal();
}

// =====================
// Eventos
// =====================
fabAdd?.addEventListener('click',abrirModal);
btnAbrirModal?.addEventListener('click',abrirModal);
btnFechar.addEventListener('click',fecharModal);
btnCancelar.addEventListener('click',fecharModal);
document.querySelector('.modal-backdrop').addEventListener('click',fecharModal);

inputTelefone.addEventListener('input',e=>{
  const d=getDigits(e.target.value);
  e.target.value=formatTelefoneFromDigits(d);
});

inputBusca.addEventListener('input',render);
selectOrdenacao.addEventListener('change',render);

btnExportar.addEventListener('click',()=>{
  const dataStr=JSON.stringify(contatos,null,2);
  const blob=new Blob([dataStr],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url;
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download=`contatos-${stamp}.json`; a.click(); URL.revokeObjectURL(url);
});

formModal.addEventListener('submit',e=>{
  e.preventDefault();
  if(!inputNome.value.trim()){ alert('Informe o nome'); inputNome.focus(); return; }
  if(!inputEmail.value.trim()){ alert('Informe o e-mail'); inputEmail.focus(); return; }
  const tel=getDigits(inputTelefone.value);
  if(tel.length!==11){ alert('Telefone deve ter 11 dígitos'); inputTelefone.focus(); return; }
  const payload={nome:inputNome.value,email:inputEmail.value,telefone:inputTelefone.value};
  modoEdicaoId?atualizar(modoEdicaoId,payload):criar(payload);
  fecharModal();
});

// =====================
// Init
// =====================
document.addEventListener('DOMContentLoaded',()=>{ carregar(); render(); });
