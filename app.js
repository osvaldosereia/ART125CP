/* ===========================
   Sistema de Pedidos — SPA localStorage
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

function load(k, fallback){
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch(e){ return fallback; }
}
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- Navegação ---------- */
$$(".tile").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    openView(btn.dataset.view);
  });
});
function openView(name){
  $$(".view").forEach(v => v.classList.remove("active"));
  const el = $("#view-"+name);
  if (el){ el.classList.add("active"); }
  // pós-abertura
  if (name==="vender") { hydrateVender(); }
  if (name==="clientes") { renderClientes(); }
  if (name==="produtos") { renderProdutos(); }
  if (["andre","claudio","junior"].includes(name)) { renderEntregador(name); }
}

/* ---------- Helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n) => (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const norm = (s) => (s||"").replace(/\s+/g," ").trim();
const telDigits = (s) => (s||"").replace(/\D/g,"");

function toast(msg){
  alert(msg); // simples por ora; depois trocamos por toast bonitinho
}

/* ---------- Clientes ---------- */
$("#btnSalvarCliente").addEventListener("click", ()=>{
  const nome = norm($("#cliNome").value);
  const tel  = norm($("#cliTel").value);
  const end  = norm($("#cliEnd").value);
  const comp = norm($("#cliComp").value);

  if (!nome || !tel || !end){
    toast("Preencha nome, telefone e endereço.");
    return;
  }
  state.clientes.push({id:uid(), nome, tel, end, comp});
  save(KEY.clientes, state.clientes);
  $("#cliNome").value=$("#cliTel").value=$("#cliEnd").value=$("#cliComp").value="";
  renderClientes();
  hydrateVender();
  toast("Cliente salvo!");
});

function renderClientes(){
  const box = $("#listaClientes");
  box.innerHTML = "";
  state.clientes
    .slice()
    .sort((a,b)=>a.nome.localeCompare(b.nome))
    .forEach(c=>{
      const div = document.createElement("div");
      div.className="item";
      div.innerHTML = `
        <span><strong>${c.nome}</strong> — ${c.tel} — ${c.end} ${c.comp?("("+c.comp+")"):""}</span>
        <span class="item-actions">
          <button class="ghost" data-act="zap" data-id="${c.id}">Whats</button>
          <button class="ghost" data-act="map" data-id="${c.id}">Maps</button>
          <button class="ghost" data-act="del" data-id="${c.id}">Excluir</button>
        </span>`;
      box.appendChild(div);
    });

  box.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    const cli = state.clientes.find(x=>x.id===id);
    if (!cli) return;

    const act = btn.dataset.act;
    if (act==="del"){
      if (confirm("Excluir cliente?")){
        state.clientes = state.clientes.filter(x=>x.id!==id);
        save(KEY.clientes, state.clientes);
        renderClientes();
        hydrateVender();
      }
    }
    if (act==="zap"){
      const msg = encodeURIComponent("Olá! Tudo bem?");
      window.open(`https://wa.me/55${telDigits(cli.tel)}?text=${msg}`,"_blank");
    }
    if (act==="map"){
      window.open(`https://maps.google.com/?q=${encodeURIComponent(cli.end+" "+(cli.comp||""))}`,"_blank");
    }
  }, {once:true});
}

/* Importar CSV de clientes: nome,telefone,endereco,complemento */
$("#csvClientes").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(Boolean);
  let ok=0, fail=0;
  for (const r of rows){
    const [nome,tel,end,comp] = r.split(",").map(s=>s?.trim()||"");
    if (!nome || !tel || !end){ fail++; continue; }
    state.clientes.push({id:uid(), nome, tel, end, comp});
    ok++;
  }
  save(KEY.clientes, state.clientes);
  renderClientes(); hydrateVender();
  toast(`Importados: ${ok}. Ignorados: ${fail}.`);
});

/* Exportar clientes CSV */
$("#btnExportClientes").addEventListener("click", ()=>{
  const header = "nome,telefone,endereco,complemento\n";
  const body = state.clientes.map(c=>[
    c.nome, c.tel, c.end, c.comp||""
  ].map(s=>String(s).replace(/,/g," ")).join(",")).join("\n");
  downloadText("clientes.csv", header+body);
});

/* ---------- Produtos ---------- */
$("#btnSalvarProduto").addEventListener("click", ()=>{
  const tam = norm($("#prdTam").value);
  const arroz = norm($("#prdArroz").value);
  const valor = Number($("#prdValor").value||0);

  if (!tam || !arroz || !valor){
    toast("Preencha tamanho, tipo de arroz e valor.");
    return;
  }
  state.produtos.push({id:uid(), tam, arroz, valor});
  save(KEY.produtos, state.produtos);
  $("#prdTam").value=$("#prdArroz").value=$("#prdValor").value="";
  renderProdutos(); hydrateVender();
  toast("Produto salvo!");
});

function renderProdutos(){
  const box = $("#listaProdutos");
  box.innerHTML = "";
  state.produtos.forEach(p=>{
    const div = document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <span><strong>${p.tam}</strong> — ${p.arroz} — ${money(p.valor)}</span>
      <span class="item-actions">
        <button class="ghost" data-act="del" data-id="${p.id}">Excluir</button>
      </span>`;
    box.appendChild(div);
  });

  box.addEventListener("click",(e)=>{
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act==="del"){
      if (confirm("Excluir produto?")){
        state.produtos = state.produtos.filter(x=>x.id!==id);
        save(KEY.produtos, state.produtos);
        renderProdutos(); hydrateVender();
      }
    }
  }, {once:true});
}

/* ---------- Vender ---------- */
function hydrateVender(){
  // datalist clientes
  const dl = $("#clientesList");
  dl.innerHTML = state.clientes
    .slice().sort((a,b)=>a.nome.localeCompare(b.nome))
    .map(c=>`<option value="${c.nome}">${c.nome}</option>`).join("");

  // produtos
  const sel = $("#pedidoProduto");
  sel.innerHTML = state.produtos
    .map(p=>`<option value="${p.id}">${p.tam} — ${p.arroz} — ${money(p.valor)}</option>`)
    .join("");
}

$("#btnSalvarPedido").addEventListener("click", ()=>{
  const nomeCli = norm($("#pedidoCliente").value);
  const produtoId = $("#pedidoProduto").value;
  const obs = norm($("#pedidoObs").value);
  const pagamento = $("#pedidoPagamento").value;
  const entregador = $("#pedidoEntregador").value;
  const dia = $("#pedidoDia").value;

  const cliente = state.clientes.find(c=>c.nome.toLowerCase()===nomeCli.toLowerCase());
  const produto = state.produtos.find(p=>p.id===produtoId);

  if (!cliente){ toast("Selecione um cliente existente (digite e escolha)."); return; }
  if (!produto){ toast("Selecione um produto."); return; }
  if (!pagamento){ toast("Selecione a forma de pagamento."); return; }

  const pedido = {
    id: uid(),
    clienteId: cliente.id,
    produtoId: produto.id,
    obs, pagamento, entregador, dia,
    status: "Pendente",
    createdAt: Date.now(),
    sort: Date.now() // default: usa timestamp como ordem
  };

  state.pedidos.push(pedido);
  save(KEY.pedidos, state.pedidos);
  $("#pedidoObs").value=""; // mantém outros campos
  toast("Pedido salvo!");
});

/* ---------- Entregadores (cards + drag & drop + ações) ---------- */
function renderEntregador(view){
  const nome = view[0].toUpperCase()+view.slice(1); // "Andre"->"Andre" (ok) / "claudio"->"Claudio"
  const entregador = ({"andre":"André","claudio":"Cláudio","junior":"Júnior"})[view] || nome;

  const container = $("#cards-"+view);
  container.innerHTML = "";

  const pedidos = state.pedidos
    .filter(p=>p.entregador===entregador && p.status!=="Entregue")
    .sort((a,b)=> (a.sort||0)-(b.sort||0));

  for (const p of pedidos){
    const c = state.clientes.find(x=>x.id===p.clienteId);
    const pr = state.produtos.find(x=>x.id===p.produtoId);

    const card = document.createElement("article");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = p.id;
    card.innerHTML = `
      <h3>${c?.nome||"Cliente"}</h3>
      <div class="meta">
        <span class="badge">${p.dia}</span>
        <span class="badge">${p.pagamento||"—"}</span>
        ${p.obs?`<span class="badge">Obs</span>`:""}
      </div>
      <div><strong>Telefone:</strong> ${c?.tel||"-"}</div>
      <div><strong>Endereço:</strong> ${c?.end||"-"} ${c?.comp?("("+c.comp+")"):""}</div>
      <div><strong>Produto:</strong> ${pr?`${pr.tam} — ${pr.arroz}`:"-"} | <strong>Valor:</strong> ${money(pr?.valor)}</div>
      ${p.obs?`<div><strong>Obs:</strong> ${p.obs}</div>`:""}
      <div class="btns">
        <button class="btn" data-act="zap" data-id="${p.id}">Whats</button>
        <button class="btn" data-act="maps" data-id="${p.id}">Maps</button>
        <button class="btn" data-act="call" data-id="${p.id}">Ligar</button>
        <button class="btn warn" data-act="msg" data-id="${p.id}">Mensagem pronta</button>
        <button class="btn print" data-act="print" data-id="${p.id}">Imprimir</button>
        <label class="btn">
          <input type="checkbox" data-payok="${p.id}"> Pagamento confirmado
        </label>
        <button class="btn ok" data-act="done" data-id="${p.id}">Entregue</button>
      </div>
    `;
    container.appendChild(card);
  }

  enableDrag(container);
  container.addEventListener("click", entregadorActions, {once:true});
}

function entregadorActions(e){
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  const ped = state.pedidos.find(x=>x.id===id);
  if (!ped) return;

  const cli = state.clientes.find(c=>c.id===ped.clienteId);
  const prd = state.produtos.find(p=>p.id===ped.produtoId);

  const act = btn.dataset.act;
  if (act==="zap"){
    const msg = encodeURIComponent(`Olá, em poucos minutos a sua cesta básica vai chegar.`);
    window.open(`https://wa.me/55${telDigits(cli?.tel)}?text=${msg}`,"_blank");
  }
  if (act==="maps"){
    window.open(`https://maps.google.com/?q=${encodeURIComponent(cli?.end+" "+(cli?.comp||""))}`,"_blank");
  }
  if (act==="call"){
    location.href = `tel:${telDigits(cli?.tel)}`;
  }
  if (act==="msg"){
    const msg = encodeURIComponent(`Olá, em poucos minutos a sua cesta básica vai chegar.`);
    window.open(`sms:${telDigits(cli?.tel)}?&body=${msg}`,"_self");
  }
  if (act==="print"){
    printPedido(ped);
  }
  if (act==="done"){
    const payok = document.querySelector(`input[data-payok="${id}"]`);
    if (!payok?.checked){
      toast("Confirme o pagamento antes de marcar como Entregue.");
      return;
    }
    ped.status = "Entregue";
    ped.deliveredAt = Date.now();
    save(KEY.pedidos, state.pedidos);
    toast("Pedido marcado como Entregue.");
    // recarrega a lista do entregador atual
    const sect = btn.closest("section.view").id.replace("view-","");
    renderEntregador(sect);
  }
  // reatacha o listener para múltiplos cliques
  btn.closest(".cards").addEventListener("click", entregadorActions, {once:true});
}

/* Drag & Drop para reordenar */
function enableDrag(container){
  let dragEl=null;

  container.addEventListener("dragstart", (e)=>{
    const card = e.target.closest(".card");
    if (!card) return;
    dragEl = card;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  container.addEventListener("dragend", (e)=>{
    const card = e.target.closest(".card");
    if (card) card.classList.remove("dragging");
    dragEl = null;
    persistOrder(container);
  });
  container.addEventListener("dragover", (e)=>{
    e.preventDefault();
    const after = getDragAfterElement(container, e.clientY);
    if (!dragEl) return;
    if (after==null) container.appendChild(dragEl);
    else container.insertBefore(dragEl, after);
  });

  function getDragAfterElement(container, y){
    const els = [...container.querySelectorAll(".card:not(.dragging)")];
    return els.reduce((closest, child)=>{
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if (offset<0 && offset>closest.offset){ return {offset, element:child}; }
      else return closest;
    }, {offset:Number.NEGATIVE_INFINITY}).element;
  }
}

function persistOrder(container){
  const ids = [...container.querySelectorAll(".card")].map(c=>c.dataset.id);
  const now = Date.now();
  ids.forEach((id, i)=>{
    const p = state.pedidos.find(x=>x.id===id);
    if (p){ p.sort = now + i; }
  });
  save(KEY.pedidos, state.pedidos);
}

/* ---------- Impressão 58mm ---------- */
function printPedido(ped){
  const cli = state.clientes.find(c=>c.id===ped.clienteId);
  const prd = state.produtos.find(p=>p.id===ped.produtoId);

  const mount = `
    <div class="receipt">
      <h4>*** PEDIDO ***</h4>
      <div class="row"><strong>Cliente</strong><span>${escapeHTML(cli?.nome)}</span></div>
      <div class="row"><strong>Telefone</strong><span>${escapeHTML(cli?.tel)}</span></div>
      <hr>
      <div><strong>Endereço:</strong><br>${escapeHTML(cli?.end)} ${cli?.comp?("("+escapeHTML(cli.comp)+")"):""}</div>
      <hr>
      <div><strong>Produto:</strong><br>${prd?`${escapeHTML(prd.tam)} — ${escapeHTML(prd.arroz)}`:"-"}</div>
      <div class="row"><strong>Valor</strong><span>${money(prd?.valor)}</span></div>
      <div class="row"><strong>Pagamento</strong><span>${escapeHTML(ped.pagamento)}</span></div>
      ${ped.obs?`<div><strong>Obs:</strong><br>${escapeHTML(ped.obs)}</div>`:""}
      <hr>
      <div class="row"><span>${escapeHTML(ped.entregador)}</span><span>${escapeHTML(ped.dia)}</span></div>
      <div class="center">--------------------</div>
      <div class="center">${new Date().toLocaleString("pt-BR")}</div>
      <div class="center">Obrigado!</div>
    </div>
  `;

  const root = $("#print-root");
  root.innerHTML = mount;
  window.print();
  // limpa (não obrigatório)
  setTimeout(()=>{ root.innerHTML=""; }, 500);
}
function escapeHTML(s){ return String(s??"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }

/* ---------- Exportar / Importar JSON (backup manual) ---------- */
$("#btnExport").addEventListener("click", ()=>{
  const data = {clientes:state.clientes, produtos:state.produtos, pedidos:state.pedidos};
  downloadText(`backup_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data,null,2));
});

$("#importJson").addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  try{
    const text = await f.text();
    const data = JSON.parse(text);
    if (data.clientes) { state.clientes = data.clientes; save(KEY.clientes, state.clientes); }
    if (data.produtos) { state.produtos = data.produtos; save(KEY.produtos, state.produtos); }
    if (data.pedidos)  { state.pedidos  = data.pedidos;  save(KEY.pedidos,  state.pedidos ); }
    hydrateVender(); renderClientes(); renderProdutos();
    toast("Backup importado com sucesso.");
  }catch(err){
    toast("Arquivo inválido.");
  }
});

/* util para download */
function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Inicial ---------- */
openView("vender"); // abre vender por padrão
hydrateVender();
