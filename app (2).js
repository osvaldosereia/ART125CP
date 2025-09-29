/* ===========================
   Sistema de Pedidos — SPA localStorage (Rotas)
   =========================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- Estado ---------- */
const KEY = {
  clientes: "sp_clientes",
  produtos: "sp_produtos",
  pedidos:  "sp_pedidos"
};

const state = {
  clientes: load(KEY.clientes, []),
  produtos: load(KEY.produtos, []),
  pedidos:  load(KEY.pedidos,  [])
};

const ROTAS = ["VG","COXIPO","CUIABA","CPA"];

/* ---------- Helpers ---------- */
function uid(){ return Math.random().toString(36).slice(2,10) }
function load(k, fallback){ try{ return JSON.parse(localStorage.getItem(k)) ?? fallback }catch{ return fallback } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

function money(n){
  if (n==null || n==="") return "0,00";
  const v = Number(n)||0;
  return v.toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function openView(id){
  $$(".view").forEach(v=>v.classList.add("hidden"));
  $("#view-"+id).classList.remove("hidden");
}

function refreshSelects(){
  const selCli = $("#vdCliente");
  const selPrd = $("#vdProduto");
  if (selCli){
    selCli.innerHTML = '<option value="">Selecione…</option>' + state.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
  }
  if (selPrd){
    selPrd.innerHTML = '<option value="">Selecione…</option>' + state.produtos.map(p=>`<option value="${p.id}">${p.nome} — R$ ${money(p.valor)}</option>`).join("");
  }
}

/* ---------- UI Home ---------- */
document.addEventListener("click", (ev)=>{
  const btn = ev.target.closest("[data-goto]");
  if (btn){
    openView(btn.dataset.goto);
    if (btn.dataset.goto === "vender"){
      refreshSelects();
      renderRotasStack();
    }
    return;
  }
});

/* ---------- Export/Import global ---------- */
$("#btnExportAll")?.addEventListener("click", ()=>{
  const data = {clientes: state.clientes, produtos: state.produtos, pedidos: state.pedidos};
  downloadText(`backup_${Date.now()}.json`, JSON.stringify(data, null, 2));
});

$("#importAll")?.addEventListener("change", (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const d = JSON.parse(rd.result);
      if (Array.isArray(d.clientes)) state.clientes = d.clientes;
      if (Array.isArray(d.produtos)) state.produtos = d.produtos;
      if (Array.isArray(d.pedidos))  state.pedidos  = d.pedidos;
      save(KEY.clientes, state.clientes);
      save(KEY.produtos, state.produtos);
      save(KEY.pedidos,  state.pedidos);
      refreshSelects();
      alert("Importado com sucesso.");
    }catch(err){
      alert("JSON inválido.");
    }
  };
  rd.readAsText(f);
});

/* ---------- Clientes ---------- */
$("#btnSalvarCliente")?.addEventListener("click", ()=>{
  const nome = $("#clNome").value.trim();
  const zap  = $("#clZap").value.trim();
  const end  = $("#clEnd").value.trim();
  if (!nome){ alert("Informe o nome."); return; }
  state.clientes.push({id:uid(), nome, zap, end});
  save(KEY.clientes, state.clientes);
  $("#clNome").value = $("#clZap").value = $("#clEnd").value = "";
  renderClientes();
  refreshSelects();
});

function renderClientes(){
  const box = $("#listaClientes"); if (!box) return;
  box.innerHTML = state.clientes.map(c=>`
    <div class="card">
      <h4>${c.nome}</h4>
      <div class="small">${c.zap||"—"} · ${c.end||"—"}</div>
    </div>
  `).join("") || "<div class='small'>Nenhum cliente.</div>";
}
renderClientes();

/* ---------- Produtos ---------- */
$("#btnSalvarProduto")?.addEventListener("click", ()=>{
  const nome = $("#prdNome").value.trim();
  const tam  = $("#prdTam").value.trim();
  const tipo = $("#prdTipo").value.trim();
  const valor = Number($("#prdValor").value||0);
  if (!nome){ alert("Informe o nome."); return; }
  state.produtos.push({id:uid(), nome, tam, tipo, valor});
  save(KEY.produtos, state.produtos);
  $("#prdNome").value = $("#prdTam").value = $("#prdTipo").value = $("#prdValor").value = "";
  renderProdutos();
  refreshSelects();
});

function renderProdutos(){
  const box = $("#listaProdutos"); if(!box) return;
  box.innerHTML = state.produtos.map(p=>`
    <div class="card">
      <h4>${p.nome}</h4>
      <div class="small">${[p.tam,p.tipo].filter(Boolean).join(" · ")||"—"}</div>
      <div class="small"><b>R$ ${money(p.valor)}</b></div>
    </div>
  `).join("") || "<div class='small'>Nenhum produto.</div>";
}
renderProdutos();

/* ---------- Vender: adicionar pedido ---------- */
$("#btnAddPedido")?.addEventListener("click", ()=>{
  const clienteId = $("#vdCliente").value;
  const produtoId = $("#vdProduto").value;
  const qtd = Number($("#vdQtd").value||1);
  const valor = Number($("#vdValor").value||0);
  const rota = $("#vdRota").value;
  const obs = $("#vdObs").value.trim();

  if (!clienteId){ alert("Selecione o cliente."); return; }
  if (!produtoId){ alert("Selecione o produto."); return; }
  if (!rota){ alert("Selecione a ROTA."); return; }

  const cli = state.clientes.find(c=>c.id===clienteId);
  const prd = state.produtos.find(p=>p.id===produtoId);

  const pedido = {
    id: uid(),
    clienteId, produtoId, qtd, valor, rota, obs,
    entregue:false,
    createdAt: new Date().toISOString()
  };
  state.pedidos.push(pedido);
  save(KEY.pedidos, state.pedidos);

  $("#vdQtd").value = "1"; $("#vdValor").value = ""; $("#vdObs").value = "";
  $("#vdResumo").textContent = `Pedido adicionado: ${cli?.nome||""} · ${prd?.nome||""} (${qtd}) · R$ ${money(valor)} · ROTA ${rota}`;
  renderRotasStack();
});

function pedidosPorRota(){
  const map = new Map();
  for (const r of ROTAS) map.set(r, []);
  for (const p of state.pedidos){
    const r = ROTAS.includes(p.rota)? p.rota : ROTAS[0];
    map.get(r).push(p);
  }
  return map;
}

function renderRotasStack(){
  const stack = $("#rotasStack"); if (!stack) return;
  const map = pedidosPorRota();
  stack.innerHTML = "";
  for (const rota of ROTAS){
    const list = map.get(rota);
    const total = list.reduce((s,p)=>s+(Number(p.valor)||0),0);
    const group = document.createElement("div");
    group.className = "group";
    group.innerHTML = `
      <div class="group-head">
        <div><span class="badge">ROTA</span> <b>${rota}</b> · <span class="small">${list.length} pedido(s) · Total R$ ${money(total)}</span></div>
        <div class="row">
          <button class="btn ghost" data-export-rota="${rota}">Exportar JSON</button>
          <button class="btn ghost" data-whats-rota="${rota}">WhatsApp</button>
        </div>
      </div>
      <div class="cards" id="cards-${rota}"></div>
    `;
    stack.appendChild(group);
    const cards = group.querySelector(`#cards-${rota}`);
    cards.innerHTML = list.map(p=>renderPedidoCard(p)).join("") || "<div class='small'>Sem pedidos nesta rota.</div>";
  }
}

function renderPedidoCard(p){
  const cli = state.clientes.find(c=>c.id===p.clienteId);
  const prd = state.produtos.find(x=>x.id===p.produtoId);
  return `
    <div class="card" data-pedido="${p.id}">
      <h4>${cli?.nome||"Cliente"}</h4>
      <div class="small">${cli?.end||"—"} · ${cli?.zap||"—"}</div>
      <div>${prd?.nome||"Produto"} · qtd ${p.qtd} · <b>R$ ${money(p.valor)}</b></div>
      <div class="row" style="margin-top:8px">
        <label class="small">ROTA:</label>
        <select data-change-rota="${p.id}">
          ${ROTAS.map(r=>`<option ${r===p.rota?"selected":""}>${r}</option>`).join("")}
        </select>
        <button class="btn ghost" data-del="${p.id}">Excluir</button>
      </div>
      ${p.obs? `<div class="small">Obs.: ${p.obs}</div>`:""}
    </div>
  `;
}

/* Trocar rota / excluir */
document.addEventListener("change", (ev)=>{
  const sel = ev.target.closest("select[data-change-rota]");
  if (sel){
    const id = sel.dataset.changeRota;
    const pedido = state.pedidos.find(x=>x.id===id);
    if (pedido){
      pedido.rota = sel.value;
      save(KEY.pedidos, state.pedidos);
      renderRotasStack();
    }
  }
});
document.addEventListener("click", (ev)=>{
  const del = ev.target.closest("[data-del]");
  if (del){
    const id = del.dataset.del;
    state.pedidos = state.pedidos.filter(x=>x.id!==id);
    save(KEY.pedidos, state.pedidos);
    renderRotasStack();
  }
  const expR = ev.target.closest("[data-export-rota]");
  if (expR){
    const rota = expR.dataset.exportRota;
    const json = JSON.stringify(buildRotaPayload(rota), null, 2);
    downloadText(`rota_${rota}_${Date.now()}.json`, json);
  }
  const wR = ev.target.closest("[data-whats-rota]");
  if (wR){
    const rota = wR.dataset.whatsRota;
    const json = JSON.stringify(buildRotaPayload(rota));
    const url = "https://wa.me/?text=" + encodeURIComponent(json);
    window.open(url, "_blank");
  }
});

function buildRotaPayload(rota){
  const map = pedidosPorRota();
  const list = map.get(rota)||[];
  // payload minimal para o entregador
  return list.map(p=>{
    const cli = state.clientes.find(c=>c.id===p.clienteId)||{};
    const prd = state.produtos.find(x=>x.id===p.produtoId)||{};
    return {
      id: p.id,
      cliente: cli.nome,
      zap: cli.zap||"",
      end: cli.end||"",
      produto: prd.nome,
      qtd: p.qtd,
      valor: Number(p.valor)||0,
      obs: p.obs||"",
      rota: p.rota,
      createdAt: p.createdAt
    };
  });
}

/* ---------- Abrir Rota (JSON) ---------- */
$("#rotaFile")?.addEventListener("change", (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const data = JSON.parse(rd.result);
      if (!Array.isArray(data)) throw new Error("Formato inválido");
      $("#rotaInfo").textContent = `${data.length} pedido(s) carregados.`;
      renderRotaCards(data);
    }catch(err){
      $("#rotaInfo").textContent = "JSON inválido.";
    }
  };
  rd.readAsText(f);
});

function renderRotaCards(list){
  const box = $("#rotaCards");
  box.innerHTML = list.map(p=>`
    <div class="card">
      <h4>${p.cliente||"Cliente"}</h4>
      <div class="small">${p.end||"—"} · ${p.zap||"—"}</div>
      <div>${p.produto||"Produto"} · qtd ${p.qtd||1} · <b>R$ ${money(p.valor||0)}</b></div>
      ${p.obs? `<div class="small">Obs.: ${p.obs}</div>`:""}
      <div class="small">ROTA: ${p.rota||"—"}</div>
    </div>
  `).join("") || "<div class='small'>Nenhum pedido na rota.</div>";
}

/* ---------- Inicial ---------- */
openView("home");
refreshSelects();
renderRotasStack();

/* ---------- Utils ---------- */
function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
