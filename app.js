/* ===============================
   Sistema de Pedidos — 100% front
   =============================== */

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

/* ---- storage ---- */
const KEY = {
  produtos: "sp_produtos",
  clientes: "sp_clientes",
  pedidos:  "sp_pedidos",
  config:   "sp_config"
};

const state = {
  produtos: load(KEY.produtos, []),
  clientes: load(KEY.clientes, []),
  pedidos:  load(KEY.pedidos,  []),
  config:   load(KEY.config,   { formasPagamento: ["Dinheiro","Pix","Débito","Crédito"] })
};

function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
function load(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch(e){ return d } }
function uid(){ return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
function brMoney(n){ if(n===""||n==null||isNaN(n)) return "R$ 0,00"; return n.toLocaleString('pt-BR',{style:'currency', currency:'BRL'}); }
function onlyDigits(s){ return (s||"").replace(/\D+/g,""); }
function nowISO(){ return new Date().toISOString(); }

/* ---- views ---- */
const views = {
  vender:   $("#viewVender"),
  produtos: $("#viewProdutos"),
  clientes: $("#viewClientes"),
  backup:   $("#viewBackup"),
};

// nav
$("#navVender").onclick   = ()=>show("vender");
$("#navProdutos").onclick = ()=>show("produtos");
$("#navClientes").onclick = ()=>show("clientes");
$("#navBackup").onclick   = ()=>show("backup");

function show(name){
  Object.values(views).forEach(v=>v.classList.add("hidden"));
  views[name].classList.remove("hidden");
  if(name==="vender"){ mountVender(); }
  if(name==="produtos"){ renderProdutos(); }
  if(name==="clientes"){ renderClientes(); }
}

show("vender"); // default

/* ---- VENDER ---- */
const saleProduto   = $("#saleProduto");
const saleValor     = $("#saleValor");
const salePagamento = $("#salePagamento");
const saleCliente   = $("#saleCliente");
const saleObs       = $("#saleObs");

function mountVender(){
  // produtos
  saleProduto.innerHTML = `<option value="">Selecione...</option>` +
    state.produtos.map(p=>`<option value="${p.id}" data-valor="${p.valor}">${escapeHtml(p.nome)}</option>`).join("");
  // valor: atualiza ao trocar produto
  saleProduto.onchange = (e)=>{
    const opt = saleProduto.selectedOptions[0];
    saleValor.value = opt?.dataset.valor ?? "";
  };
  // formas de pagamento
  salePagamento.innerHTML = state.config.formasPagamento.map(fp=>`<option>${escapeHtml(fp)}</option>`).join("");
  // clientes
  saleCliente.innerHTML = `<option value="">Selecione...</option>` +
    state.clientes.map(c=>`<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
  // pedidos list
  renderPedidos();
}

$("#btnSalvar").onclick = ()=>{
  const order = buildOrder();
  if(!order) return;
  state.pedidos.unshift(order);
  save(KEY.pedidos, state.pedidos);
  alert("Pedido salvo.");
  renderPedidos();
};

$("#btnImprimir").onclick = ()=>{
  const order = buildOrder();
  if(!order) return;
  fillTicket(order);
  window.print();
};

$("#btnWhatsapp").onclick = ()=>{
  const order = buildOrder();
  if(!order) return;
  // Mensagem curta + link para viewer (Plano B)
  const resumo = formatResumo(order);
  const viewerUrl = makeViewerUrl(order);
  const texto = `${resumo}\n\nPágina do pedido (com botões):\n${viewerUrl}`;
  const url = "https://wa.me/?text=" + encodeURIComponent(texto);
  window.open(url, "_blank");

  // Botão especial para 65984491018 com 'entregue'
  const textoEntrega = `${resumo}\n\nPágina do pedido (com botões):\n${viewerUrl}\n\nentregue`;
  const urlEntrega = "https://wa.me/5565984491018?text=" + encodeURIComponent(textoEntrega);
  // também abrir em nova aba para facilitar
  window.open(urlEntrega, "_blank");
};

function buildOrder(){
  const prodId = saleProduto.value;
  const cliId  = saleCliente.value;
  if(!prodId){ alert("Selecione um produto."); return null; }
  if(!cliId){ alert("Selecione um cliente."); return null; }

  const prod = state.produtos.find(p=>p.id===prodId);
  const cli  = state.clientes.find(c=>c.id===cliId);
  const valor = parseFloat(saleValor.value||prod?.valor||0) || 0;

  return {
    id: uid(),
    createdAt: nowISO(),
    produtoId: prod.id,
    produtoNome: prod.nome,
    valor: valor,
    pagamento: salePagamento.value,
    clienteId: cli.id,
    clienteNome: cli.nome,
    clienteFone: onlyDigits(cli.telefone),
    endereco: cli.endereco,
    complemento: cli.complemento,
    observacao: saleObs.value.trim()
  };
}

function formatResumo(o){
  const foneFmt = formatFoneBR(o.clienteFone);
  const valorFmt = brMoney(o.valor);
  return [
    `Pedido ${o.id}`,
    `Nome: ${o.clienteNome}`,
    `Telefone: ${foneFmt}`,
    `Endereço: ${o.endereco||"-"}`,
    `Complemento: ${o.complemento||"-"}`,
    `Produto: ${o.produtoNome}`,
    `Valor: ${valorFmt}`,
    `Observação: ${o.observacao||"-"}`
  ].join("\n");
}

function fillTicket(o){
  $("#ticketDate").textContent = new Date(o.createdAt).toLocaleString("pt-BR");
  $("#ticketBody").innerHTML = `
    <div><b>Pedido:</b> ${escapeHtml(o.id)}</div>
    <div><b>Nome:</b> ${escapeHtml(o.clienteNome)}</div>
    <div><b>Telefone:</b> ${escapeHtml(formatFoneBR(o.clienteFone))}</div>
    <div><b>Endereço:</b> ${escapeHtml(o.endereco||"-")}</div>
    <div><b>Compl.:</b> ${escapeHtml(o.complemento||"-")}</div>
    <div><b>Produto:</b> ${escapeHtml(o.produtoNome)}</div>
    <div><b>Valor:</b> ${escapeHtml(brMoney(o.valor))}</div>
    <div><b>Pgto:</b> ${escapeHtml(o.pagamento)}</div>
    <div><b>Obs:</b> ${escapeHtml(o.observacao||"-")}</div>
  `;
  // mostrar área de impressão
  $(".print-ticket").style.display = "block";
}

function makeViewerUrl(o){
  const payload = {
    id:o.id,
    createdAt:o.createdAt,
    cliente:{nome:o.clienteNome, telefone:o.clienteFone, endereco:o.endereco, complemento:o.complemento},
    produto:{nome:o.produtoNome, valor:o.valor},
    pagamento:o.pagamento,
    observacao:o.observacao
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/,'')}viewer.html#data=${b64}`;
  return url;
}

function renderPedidos(){
  const el = $("#ordersList");
  if(state.pedidos.length===0){ el.innerHTML = `<div class="muted">Nenhum pedido.</div>`; return; }
  el.innerHTML = state.pedidos.map(o=>{
    const dt = new Date(o.createdAt).toLocaleString("pt-BR");
    return `<div class="row">
      <div>
        <div class="title">${escapeHtml(o.clienteNome)} — ${escapeHtml(o.produtoNome)} <span class="meta">(${escapeHtml(dt)})</span></div>
        <div class="meta">${escapeHtml(brMoney(o.valor))} • ${escapeHtml(o.pagamento)}</div>
      </div>
      <div class="actions">
        <button data-id="${o.id}" class="openOrder">Abrir</button>
        <button data-id="${o.id}" class="danger delOrder">Excluir</button>
      </div>
    </div>`;
  }).join("");

  $$(".openOrder").forEach(b=>b.onclick = ()=>{
    const o = state.pedidos.find(x=>x.id===b.dataset.id);
    if(!o) return;
    const viewer = makeViewerUrl(o);
    window.open(viewer, "_blank");
  });

  $$(".delOrder").forEach(b=>b.onclick = ()=>{
    const id = b.dataset.id;
    if(!confirm("Excluir este pedido?")) return;
    state.pedidos = state.pedidos.filter(x=>x.id!==id);
    save(KEY.pedidos, state.pedidos);
    renderPedidos();
  });
}

/* ---- PRODUTOS ---- */
$("#btnAddProduto").onclick = ()=>{
  const nome = $("#prodNome").value.trim();
  const valor = parseFloat($("#prodValor").value||0) || 0;
  if(!nome){ alert("Informe o nome do produto."); return; }
  state.produtos.unshift({ id:uid(), nome, valor });
  save(KEY.produtos, state.produtos);
  $("#prodNome").value=""; $("#prodValor").value="";
  renderProdutos();
};

function renderProdutos(){
  const el = $("#produtosList");
  if(state.produtos.length===0){ el.innerHTML = `<div class="muted">Nenhum produto.</div>`; return; }
  el.innerHTML = state.produtos.map(p=>`
  <div class="row">
    <div>
      <div class="title">${escapeHtml(p.nome)}</div>
      <div class="meta">${escapeHtml(brMoney(p.valor))}</div>
    </div>
    <div class="actions">
      <button data-id="${p.id}" class="editProd">Editar</button>
      <button data-id="${p.id}" class="danger delProd">Excluir</button>
    </div>
  </div>`).join("");

  $$(".editProd").forEach(b=>b.onclick = ()=>editProduto(b.dataset.id));
  $$(".delProd").forEach(b=>b.onclick = ()=>{
    const id = b.dataset.id;
    if(!confirm("Excluir produto?")) return;
    state.produtos = state.produtos.filter(x=>x.id!==id);
    save(KEY.produtos, state.produtos);
    renderProdutos();
  });
}

function editProduto(id){
  const p = state.produtos.find(x=>x.id===id); if(!p) return;
  const nome = prompt("Nome do produto:", p.nome); if(nome==null) return;
  const valor = parseFloat(prompt("Valor (R$):", p.valor)||p.valor)||p.valor;
  p.nome = nome.trim()||p.nome; p.valor = valor;
  save(KEY.produtos, state.produtos);
  renderProdutos();
}

/* ---- CLIENTES ---- */
$("#btnAddCliente").onclick = ()=>{
  const nome = $("#cliNome").value.trim();
  const telefone = onlyDigits($("#cliFone").value);
  const endereco = $("#cliEndereco").value.trim();
  const complemento = $("#cliCompl").value.trim();
  if(!nome){ alert("Informe o nome."); return; }
  state.clientes.unshift({ id:uid(), nome, telefone, endereco, complemento });
  save(KEY.clientes, state.clientes);
  $("#cliNome").value=$("#cliFone").value=$("#cliEndereco").value=$("#cliCompl").value="";
  renderClientes();
};

function renderClientes(){
  const el = $("#clientesList");
  if(state.clientes.length===0){ el.innerHTML = `<div class="muted">Nenhum cliente.</div>`; return; }
  el.innerHTML = state.clientes.map(c=>`
  <div class="row">
    <div>
      <div class="title">${escapeHtml(c.nome)}</div>
      <div class="meta">${escapeHtml(formatFoneBR(c.telefone))} • ${escapeHtml(c.endereco||"-")} ${escapeHtml(c.complemento?("("+c.complemento+")"):"")}</div>
    </div>
    <div class="actions">
      <button data-id="${c.id}" class="editCli">Editar</button>
      <button data-id="${c.id}" class="danger delCli">Excluir</button>
    </div>
  </div>`).join("");

  $$(".editCli").forEach(b=>b.onclick = ()=>editCliente(b.dataset.id));
  $$(".delCli").forEach(b=>b.onclick = ()=>{
    const id = b.dataset.id;
    if(!confirm("Excluir cliente?")) return;
    state.clientes = state.clientes.filter(x=>x.id!==id);
    save(KEY.clientes, state.clientes);
    renderClientes();
  });
}

function editCliente(id){
  const c = state.clientes.find(x=>x.id===id); if(!c) return;
  const nome = prompt("Nome:", c.nome); if(nome==null) return;
  const tel  = onlyDigits(prompt("Telefone (apenas dígitos):", c.telefone)||c.telefone);
  const end  = prompt("Endereço:", c.endereco??"") ?? c.endereco;
  const comp = prompt("Complemento:", c.complemento??"") ?? c.complemento;
  c.nome = nome.trim()||c.nome; c.telefone = tel; c.endereco = (end||"").trim(); c.complemento = (comp||"").trim();
  save(KEY.clientes, state.clientes);
  renderClientes();
}

/* ---- Importar CSV (Clientes) ---- */
$("#csvImport").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text();
  const entries = parseCSV(text);
  // Espera-se colunas: Nome, Telefone, Endereco, Complemento
  let added=0, updated=0;
  for(const row of entries){
    const nome = (row.Nome||row.nome||"").trim();
    const telefone = onlyDigits(row.Telefone||row.telefone||"");
    const endereco = (row.Endereco||row.endereco||"").trim();
    const complemento = (row.Complemento||row.complemento||"").trim();
    if(!nome) continue;
    // matching por telefone ou nome
    let c = state.clientes.find(x=> (telefone && x.telefone===telefone) || x.nome.toLowerCase()===nome.toLowerCase());
    if(c){ c.nome=nome; c.telefone=telefone; c.endereco=endereco; c.complemento=complemento; updated++; }
    else{ state.clientes.push({id:uid(), nome, telefone, endereco, complemento}); added++; }
  }
  save(KEY.clientes, state.clientes);
  alert(`Importação CSV concluída. Inseridos: ${added}, Atualizados: ${updated}`);
  renderClientes();
  e.target.value = "";
});

function parseCSV(text){
  // simples: separa por linhas e vírgulas/; com cabeçalho
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(lines.length===0) return [];
  const header = lines[0].split(/[,;]\s*/);
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(/[,;]\s*/);
    const obj = {};
    header.forEach((h,idx)=> obj[h.trim()] = cols[idx]??"");
    rows.push(obj);
  }
  return rows;
}

/* ---- BACKUP ---- */
$("#btnExport").onclick = ()=>{
  const payload = {
    version: 1,
    exportedAt: nowISO(),
    produtos: state.produtos,
    clientes: state.clientes,
    pedidos:  state.pedidos,
    config:   state.config
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup_sistema_pedidos.json";
  a.click();
};

let snapshotBeforeImport = null;

$("#jsonImport").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text();
  $("#importPreview").textContent = text.slice(0, 1500);
  let data;
  try { data = JSON.parse(text); } catch(err){ alert("JSON inválido."); e.target.value=""; return; }
  const mode = document.querySelector('input[name="importMode"]:checked')?.value || "merge";
  if(mode==="replace"){
    if(!confirm("Substituir TODOS os dados atuais pelo backup? Essa ação não pode ser desfeita após fechar a aba.")) { e.target.value=""; return; }
  }
  snapshotBeforeImport = {
    produtos: [...state.produtos],
    clientes: [...state.clientes],
    pedidos:  [...state.pedidos],
    config:   JSON.parse(JSON.stringify(state.config))
  };

  const report = importData(data, mode);
  $("#importReport").textContent = `Importação finalizada. ${report}`;
  e.target.value="";
  // atualizar views se estiver nelas
  renderProdutos(); renderClientes(); renderPedidos(); mountVender();
});

function importData(data, mode){
  if(!data || typeof data!=="object") return "Arquivo inválido.";
  const must = ["produtos","clientes","pedidos","config"];
  for(const k of must){ if(!(k in data)) return "JSON sem chaves obrigatórias.";
  }
  let added=0, updated=0, skipped=0;
  if(mode==="replace"){
    state.produtos = Array.isArray(data.produtos)? data.produtos : [];
    state.clientes = Array.isArray(data.clientes)? data.clientes : [];
    state.pedidos  = Array.isArray(data.pedidos)? data.pedidos : [];
    state.config   = data.config || { formasPagamento: ["Dinheiro","Pix","Débito","Crédito"] };
  } else {
    // merge por id
    const mergeList = (dst, src)=>{
      for(const item of src||[]){
        if(!item || !item.id){ skipped++; continue; }
        const ix = dst.findIndex(d=>d.id===item.id);
        if(ix>=0){ dst[ix]=item; updated++; } else { dst.push(item); added++; }
      }
    };
    mergeList(state.produtos, data.produtos);
    mergeList(state.clientes, data.clientes);
    mergeList(state.pedidos,  data.pedidos);
    // config simples
    state.config = data.config || state.config;
  }
  save(KEY.produtos, state.produtos);
  save(KEY.clientes, state.clientes);
  save(KEY.pedidos,  state.pedidos);
  save(KEY.config,   state.config);
  return `Inseridos: ${added}, Atualizados: ${updated}, Ignorados: ${skipped}`;
}

/* ---- helpers UI ---- */
function formatFoneBR(digits){
  if(!digits) return "";
  if(digits.length===11) return `(${digits.slice(0,2)}) ${digits.slice(2,3)} ${digits.slice(3,7)}-${digits.slice(7)}`.replace(" ", "");
  if(digits.length===10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return digits;
}
function escapeHtml(s){ return (s??"").replace(/[&<>'"]/g, c=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c])); }

