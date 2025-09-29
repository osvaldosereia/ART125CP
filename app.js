/* ===============================
   Sistema de Pedidos — 100% front
   =============================== */

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

/* ---- storage ---- */
const KEY = {
  clientes: "sp_clientes",
  produtos: "sp_produtos",
  pedidos:  "sp_pedidos",
  entregas: "sp_entregadores",
  rota:     (name)=>`sp_rota_${name}` // rota “arquivo” por entregador
};

const state = {
  clientes: load(KEY.clientes, []),
  produtos: load(KEY.produtos, []),
  pedidos:  load(KEY.pedidos,  []),
  entregadores: load(KEY.entregas, [])
};

// defaults (só na 1ª vez)
if (state.entregadores.length===0){
  state.entregadores = [
    {id:uid(), nome:"André",   zap:""},
    {id:uid(), nome:"Cláudio", zap:""},
    {id:uid(), nome:"Júnior",  zap:""}
  ];
  persist("entregadores");
}

function load(k, fallback){ try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;} }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
function persist(which){
  if (which==="clientes") save(KEY.clientes, state.clientes);
  if (which==="produtos") save(KEY.produtos, state.produtos);
  if (which==="pedidos")  save(KEY.pedidos,  state.pedidos);
  if (which==="entregadores") save(KEY.entregas, state.entregadores);
}

const uid = ()=>Math.random().toString(36).slice(2,10);
const norm = s => (s||"").replace(/\s+/g," ").trim();
const money = n => (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const telDigits = s => (s||"").replace(/\D/g,"");
const escapeHTML = s => String(s??"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

/* ---- navegação ---- */
$$(".tile").forEach(btn=>btn.addEventListener("click",()=>openView(btn.dataset.view)));
function openView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));
  const el=$("#view-"+name); if(el) el.classList.add("active");

  if(name==="vender"){ hydrateVender(); }
  if(name==="clientes"){ renderClientes(); }
  if(name==="produtos"){ renderProdutos(); }
  if(name==="entregadores"){ renderEntregadores(); renderRotasPane(); }
  if(["andre","claudio","junior"].includes(name)){ renderEntregadorPage(name); }
}

/* ---- vender ---- */
function hydrateVender(){
  // clientes
  const dl=$("#clientesList");
  dl.innerHTML=state.clientes.slice().sort((a,b)=>a.nome.localeCompare(b.nome))
    .map(c=>`<option value="${escapeHTML(c.nome)}">${escapeHTML(c.nome)}</option>`).join("");
  // produtos
  $("#pedidoProduto").innerHTML = state.produtos.map(p=>`
    <option value="${p.id}">${escapeHTML(p.tam)} — ${escapeHTML(p.arroz)} — ${money(p.valor)}</option>
  `).join("");
  // entregadores
  $("#pedidoEntregador").innerHTML = state.entregadores.map(e=>`
    <option>${escapeHTML(e.nome)}</option>
  `).join("");
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

  if(!cliente) return alert("Selecione um cliente existente.");
  if(!produto) return alert("Selecione um produto.");
  if(!pagamento) return alert("Selecione a forma de pagamento.");

  const pedido = {
    id:uid(), clienteId:cliente.id, produtoId:produto.id,
    obs, pagamento, entregador, dia,
    status:"Pendente", createdAt:Date.now(), sort:Date.now()
  };
  state.pedidos.push(pedido); persist("pedidos");
  $("#pedidoObs").value="";
  alert("Pedido salvo!");
});

/* ---- clientes ---- */
$("#btnSalvarCliente").addEventListener("click", ()=>{
  const nome=norm($("#cliNome").value), tel=norm($("#cliTel").value),
        end=norm($("#cliEnd").value), comp=norm($("#cliComp").value);
  if(!nome || !tel || !end) return alert("Preencha nome, telefone e endereço.");

  state.clientes.push({id:uid(), nome, tel, end, comp});
  persist("clientes");
  $("#cliNome").value=$("#cliTel").value=$("#cliEnd").value=$("#cliComp").value="";
  renderClientes(); hydrateVender(); alert("Cliente salvo!");
});

function renderClientes(){
  const box=$("#listaClientes"); box.innerHTML="";
  state.clientes.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(c=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <span><strong>${escapeHTML(c.nome)}</strong> — ${escapeHTML(c.tel)} — ${escapeHTML(c.end)} ${c.comp?("("+escapeHTML(c.comp)+")"):""}</span>
      <span class="item-actions">
        <button class="ghost" data-act="zap" data-id="${c.id}">Whats</button>
        <button class="ghost" data-act="map" data-id="${c.id}">Maps</button>
        <button class="ghost" data-act="del" data-id="${c.id}">Excluir</button>
      </span>`;
    box.appendChild(div);
  });
  box.onclick = (e)=>{
    const b=e.target.closest("button[data-act]"); if(!b) return;
    const id=b.dataset.id; const c=state.clientes.find(x=>x.id===id); if(!c) return;
    if(b.dataset.act==="del"){
      if(confirm("Excluir cliente?")){
        state.clientes=state.clientes.filter(x=>x.id!==id); persist("clientes");
        renderClientes(); hydrateVender();
      }
    }
    if(b.dataset.act==="zap"){
      const msg=encodeURIComponent("Olá! Tudo bem?");
      window.open(`https://wa.me/55${telDigits(c.tel)}?text=${msg}`,"_blank");
    }
    if(b.dataset.act==="map"){
      window.open(`https://maps.google.com/?q=${encodeURIComponent(c.end+" "+(c.comp||""))}`,"_blank");
    }
  };
}

/* Importar/Exportar CSV clientes */
$("#csvClientes").addEventListener("change", async (e)=>{
  const f=e.target.files[0]; if(!f) return;
  const text=await f.text();
  const rows=text.split(/\r?\n/).map(r=>r.trim()).filter(Boolean);
  let ok=0,fail=0;
  for(const r of rows){
    const [nome,tel,end,comp]=(r.split(",").map(s=>s?.trim()||""));
    if(!nome||!tel||!end){fail++; continue;}
    state.clientes.push({id:uid(), nome,tel,end,comp}); ok++;
  }
  persist("clientes"); renderClientes(); hydrateVender();
  alert(`Importados: ${ok}. Ignorados: ${fail}.`);
});
$("#btnExportClientes").addEventListener("click", ()=>{
  const header="nome,telefone,endereco,complemento\n";
  const body=state.clientes.map(c=>[c.nome,c.tel,c.end,c.comp||""].map(s=>String(s).replace(/,/g," ")).join(",")).join("\n");
  downloadText("clientes.csv", header+body);
});

/* ---- produtos ---- */
$("#btnSalvarProduto").addEventListener("click", ()=>{
  const tam=norm($("#prdTam").value), arroz=norm($("#prdArroz").value), valor=Number($("#prdValor").value||0);
  if(!tam || !arroz || !valor) return alert("Preencha tamanho, tipo e valor.");
  state.produtos.push({id:uid(), tam, arroz, valor}); persist("produtos");
  $("#prdTam").value=$("#prdArroz").value=$("#prdValor").value="";
  renderProdutos(); hydrateVender(); alert("Produto salvo!");
});

function renderProdutos(){
  const box=$("#listaProdutos"); box.innerHTML="";
  state.produtos.forEach(p=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<span><strong>${escapeHTML(p.tam)}</strong> — ${escapeHTML(p.arroz)} — ${money(p.valor)}</span>
      <span class="item-actions"><button class="ghost" data-id="${p.id}">Excluir</button></span>`;
    box.appendChild(div);
  });
  box.onclick=(e)=>{
    const id=e.target.dataset.id; if(!id) return;
    if(confirm("Excluir produto?")){
      state.produtos=state.produtos.filter(x=>x.id!==id); persist("produtos");
      renderProdutos(); hydrateVender();
    }
  };
}

/* ---- entregadores (cadastro) ---- */
$("#btnSalvarEntregador").addEventListener("click", ()=>{
  const nome=norm($("#entNome").value), zap=telDigits($("#entZap").value);
  if(!nome) return alert("Informe o nome.");
  state.entregadores.push({id:uid(), nome, zap}); persist("entregadores");
  $("#entNome").value=$("#entZap").value="";
  renderEntregadores(); hydrateVender(); renderRotasPane();
  alert("Entregador salvo!");
});

function renderEntregadores(){
  const box=$("#listaEntregadores"); box.innerHTML="";
  state.entregadores.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(e=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <span><strong>${escapeHTML(e.nome)}</strong> — Whats: ${e.zap?("+55 "+e.zap):"não informado"}</span>
      <span class="item-actions">
        <button class="ghost" data-edit="${e.id}">Editar</button>
        <button class="ghost" data-del="${e.id}">Excluir</button>
      </span>`;
    box.appendChild(div);
  });
  box.onclick=(ev)=>{
    const t=ev.target;
    if(t.dataset.del){
      if(confirm("Excluir entregador?")){
        state.entregadores=state.entregadores.filter(x=>x.id!==t.dataset.del);
        persist("entregadores"); renderEntregadores(); hydrateVender(); renderRotasPane();
      }
    }
    if(t.dataset.edit){
      const e=state.entregadores.find(x=>x.id===t.dataset.edit);
      const nome=prompt("Nome do entregador:", e.nome); if(nome===null) return;
      const zap=prompt("WhatsApp (apenas números):", e.zap||""); if(zap===null) return;
      e.nome=norm(nome); e.zap=telDigits(zap); persist("entregadores");
      renderEntregadores(); hydrateVender(); renderRotasPane();
    }
  };
}

/* ---- rotas: gerar e enviar por WhatsApp ---- */
function renderRotasPane(){
  const pane=$("#rotasPane"); pane.innerHTML="";
  state.entregadores.forEach(e=>{
    const pedidos = state.pedidos.filter(p=>p.entregador===e.nome && p.status!=="Entregue")
                                 .sort((a,b)=>(a.sort||0)-(b.sort||0));
    const div=document.createElement("div");
    div.className="rota-card";
    div.innerHTML=`
      <h4>${escapeHTML(e.nome)}</h4>
      <div class="row">
        <button class="ghost small" data-gen="${e.nome}">Gerar arquivo</button>
        <button class="ghost small" data-send="${e.nome}">Enviar via WhatsApp</button>
      </div>
      <div class="hint">${pedidos.length} pedidos pendentes</div>
    `;
    pane.appendChild(div);
  });

  pane.onclick=async (ev)=>{
    const gen=ev.target.dataset.gen; const send=ev.target.dataset.send;
    if(gen){ const blob = buildRotaBlob(gen); downloadBlob(`rota_${slug(gen)}.json`, blob); }
    if(send){ const blob = buildRotaBlob(send); await shareToWhats(send, blob); }
  };
}

function buildRotaBlob(nomeEntregador){
  const pedidos = state.pedidos.filter(p=>p.entregador===nomeEntregador && p.status!=="Entregue")
                               .sort((a,b)=>(a.sort||0)-(b.sort||0));
  const data = {
    entregador: nomeEntregador,
    geradoEm: new Date().toISOString(),
    pedidos: pedidos.map(p=>({
      id:p.id, cliente: pick(state.clientes.find(c=>c.id===p.clienteId),["nome","tel","end","comp"]),
      produto: pick(state.produtos.find(x=>x.id===p.produtoId),["tam","arroz","valor"]),
      obs:p.obs, pagamento:p.pagamento, dia:p.dia, sort:p.sort
    }))
  };
  return new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
}

async function shareToWhats(nomeEntregador, blob){
  const e = state.entregadores.find(x=>x.nome===nomeEntregador);
  const file = new File([blob], `rota_${slug(nomeEntregador)}.json`, {type:"application/json"});
  const text = `Rota de entregas — ${nomeEntregador}.\nAbra esse arquivo no site para carregar seus pedidos.`;

  if (navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({ files:[file], text });
      return;
    }catch(err){ /* usuário cancelou */ }
  }
  // fallback: baixa o arquivo e abre wa.me com mensagem
  downloadBlob(file.name, blob);
  if (e?.zap) window.open(`https://wa.me/55${e.zap}?text=${encodeURIComponent(text)}`,"_blank");
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
}

function slug(s){ return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-"); }
function pick(obj,keys){ if(!obj) return null; const o={}; keys.forEach(k=>o[k]=obj[k]); return o; }

/* ---- páginas individuais do entregador ---- */
function renderEntregadorPage(view){
  const mapName = {"andre":"André","claudio":"Cláudio","junior":"Júnior"};
  const nome = mapName[view] || view;
  // origem: site/arquivo
  const radios = $$(`input[name="orig-${view}"]`);
  const origin = (radios.find(r=>r.checked)?.value)||"site";

  // handler de upload (rota recebida)
  const up = $(`#upload-${view}`);
  up.onchange = async (e)=>{
    const f=e.target.files[0]; if(!f) return;
    try{
      const json = JSON.parse(await f.text());
      // compat: aceitar {pedidos:[...]} ou array direto
      const pedidos = Array.isArray(json)? json : (json.pedidos||[]);
      localStorage.setItem(KEY.rota(nome), JSON.stringify(pedidos));
      alert("Rota carregada. Selecione 'Origem: Arquivo'.");
      renderEntregadorPage(view);
    }catch(err){ alert("Arquivo inválido."); }
  };

  // botão enviar rota (atalho)
  const btnSend = $(`#view-${view} [data-send="${nome}"]`);
  btnSend.onclick = async ()=>{ const blob = buildRotaBlob(nome); await shareToWhats(nome, blob); };

  // render cards
  const box = $(`#cards-${view}`); box.innerHTML="";
  let pedidos=[];
  if(origin==="arquivo"){
    pedidos = load(KEY.rota(nome), []);
  }else{
    pedidos = state.pedidos.filter(p=>p.entregador===nome && p.status!=="Entregue");
  }
  // sort por campo sort
  pedidos.sort((a,b)=>(a.sort||0)-(b.sort||0));

  for(const p of pedidos){
    // compat: quando origem=arquivo, p.cliente & p.produto já vêm prontos
    const c = p.cliente || state.clientes.find(x=>x.id===p.clienteId) || {};
    const pr= p.produto || state.produtos.find(x=>x.id===p.produtoId) || {};
    const id = p.id || uid();

    const card=document.createElement("article");
    card.className="card"; card.draggable=true; card.dataset.id=id;
    card.innerHTML=`
      <h3>${escapeHTML(c.nome||"Cliente")}</h3>
      <div class="meta">
        <span class="badge">${escapeHTML(p.dia||"-")}</span>
        <span class="badge">${escapeHTML(p.pagamento||"-")}</span>
        ${p.obs?`<span class="badge">Obs</span>`:""}
      </div>
      <div><strong>Telefone:</strong> ${escapeHTML(c.tel||"-")}</div>
      <div><strong>Endereço:</strong> ${escapeHTML(c.end||"-")} ${c.comp?("("+escapeHTML(c.comp)+")"):""}</div>
      <div><strong>Produto:</strong> ${pr.tam?`${escapeHTML(pr.tam)} — ${escapeHTML(pr.arroz||"")}`:"-"} | <strong>Valor:</strong> ${pr.valor!=null?money(pr.valor):"-"}</div>
      ${p.obs?`<div><strong>Obs:</strong> ${escapeHTML(p.obs)}</div>`:""}
      <div class="btns">
        <button class="btn" data-act="zap" data-id="${id}">Whats</button>
        <button class="btn" data-act="maps" data-id="${id}">Maps</button>
        <button class="btn" data-act="call" data-id="${id}">Ligar</button>
        <button class="btn warn" data-act="msg" data-id="${id}">Mensagem pronta</button>
        <button class="btn print" data-act="print" data-id="${id}">Imprimir</button>
        <label class="btn"><input type="checkbox" data-payok="${id}"> Pagamento confirmado</label>
        ${origin==="site" ? `<button class="btn ok" data-act="done" data-id="${id}">Entregue</button>` : ""}
      </div>
    `;
    // guardo dados no elemento para handlers
    card._data = {p,c,pr,origin,nome};
    box.appendChild(card);
  }

  enableDrag(box, view);
  box.onclick = entregadorActions;
  // alternar origem
  radios.forEach(r=>r.onchange=()=>renderEntregadorPage(view));
}

function entregadorActions(ev){
  const btn=ev.target.closest("button[data-act]"); if(!btn) return;
  const card=btn.closest(".card"); const data=card._data; const {p,c,pr,origin,nome}=data;
  if(btn.dataset.act==="zap"){
    const msg=encodeURIComponent("Olá, em poucos minutos a sua cesta básica vai chegar.");
    window.open(`https://wa.me/55${telDigits(c.tel||"")}?text=${msg}`,"_blank");
  }
  if(btn.dataset.act==="maps"){
    window.open(`https://maps.google.com/?q=${encodeURIComponent((c.end||"")+" "+(c.comp||""))}`,"_blank");
  }
  if(btn.dataset.act==="call"){
    location.href=`tel:${telDigits(c.tel||"")}`;
  }
  if(btn.dataset.act==="msg"){
    const msg=encodeURIComponent("Olá, em poucos minutos a sua cesta básica vai chegar.");
    window.open(`sms:${telDigits(c.tel||"")}?&body=${msg}`,"_self");
  }
  if(btn.dataset.act==="print"){
    printPedido({ ...p, clienteId:p.clienteId, produtoId:p.produtoId, entregador:nome,
      pagamento:p.pagamento, dia:p.dia, obs:p.obs
    }, c, pr);
  }
  if(btn.dataset.act==="done"){
    const payok = document.querySelector(`input[data-payok="${btn.dataset.id}"]`);
    if(!payok?.checked) return alert("Confirme o pagamento antes de marcar como Entregue.");
    // marca entregue no estado (apenas quando origem=site)
    const idx = state.pedidos.findIndex(x=>x.id===p.id);
    if(idx>-1){ state.pedidos[idx].status="Entregue"; state.pedidos[idx].deliveredAt=Date.now(); persist("pedidos"); }
    alert("Pedido entregue."); 
    // re-render
    const sect=btn.closest("section.view").id.replace("view-","");
    renderEntregadorPage(sect);
  }
}

/* drag & drop (persiste ordem) */
function enableDrag(container, view){
  let dragEl=null;
  container.ondragstart=(e)=>{ const c=e.target.closest(".card"); if(!c) return; dragEl=c; c.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; };
  container.ondragend  =(e)=>{ const c=e.target.closest(".card"); if(c) c.classList.remove("dragging"); persistOrder(container, view); dragEl=null; };
  container.ondragover =(e)=>{ e.preventDefault(); const after=getAfter(container,e.clientY); if(!dragEl) return; if(after==null) container.appendChild(dragEl); else container.insertBefore(dragEl, after); };
  function getAfter(cont,y){
    const els=[...cont.querySelectorAll(".card:not(.dragging)")];
    return els.reduce((closest,child)=>{const box=child.getBoundingClientRect();const offset=y-box.top-box.height/2;if(offset<0&&offset>closest.offset){return{offset,element:child}}return closest},{offset:-Infinity}).element;
  }
}
function persistOrder(container, view){
  const ids=[...container.querySelectorAll(".card")].map(c=>c.dataset.id);
  const now=Date.now();
  // origem = site? atualiza state.pedidos.sort
  const radios = $$(`input[name="orig-${view}"]`);
  const origin = (radios.find(r=>r.checked)?.value)||"site";
  if(origin==="site"){
    ids.forEach((id,i)=>{ const p=state.pedidos.find(x=>x.id===id); if(p) p.sort=now+i; });
    persist("pedidos");
  }else{
    // origem = arquivo: reordena a rota local
    const mapName = {"andre":"André","claudio":"Cláudio","junior":"Júnior"};
    const nome = mapName[view] || view;
    let rota = load(KEY.rota(nome), []);
    const byId = Object.fromEntries(rota.map(p=>[p.id, p]));
    rota = ids.map(id=>byId[id]).filter(Boolean).map((p,i)=>({...p, sort:now+i}));
    // 🔧 salva como OBJETO (sem JSON.stringify aqui)
    save(KEY.rota(nome), rota);
  }
}

/* impressão 58mm */
function printPedido(ped, cliOpt, prdOpt){
  const cli = cliOpt || state.clientes.find(c=>c.id===ped.clienteId) || {};
  const prd = prdOpt || state.produtos.find(x=>x.id===ped.produtoId) || {};
  const mount = `
    <div class="receipt">
      <h4>*** PEDIDO ***</h4>
      <div class="row"><strong>Cliente</strong><span>${escapeHTML(cli.nome||"-")}</span></div>
      <div class="row"><strong>Telefone</strong><span>${escapeHTML(cli.tel||"-")}</span></div>
      <hr>
      <div><strong>Endereço:</strong><br>${escapeHTML(cli.end||"-")} ${cli.comp?("("+escapeHTML(cli.comp)+")"):""}</div>
      <hr>
      <div><strong>Produto:</strong><br>${prd.tam?`${escapeHTML(prd.tam)} — ${escapeHTML(prd.arroz||"")}`:"-"}</div>
      <div class="row"><strong>Valor</strong><span>${prd.valor!=null?money(prd.valor):"-"}</span></div>
      <div class="row"><strong>Pagamento</strong><span>${escapeHTML(ped.pagamento||"-")}</span></div>
      ${ped.obs?`<div><strong>Obs:</strong><br>${escapeHTML(ped.obs)}</div>`:""}
      <hr>
      <div class="row"><span>${escapeHTML(ped.entregador||"-")}</span><span>${escapeHTML(ped.dia||"-")}</span></div>
      <div class="center">--------------------</div>
      <div class="center">${new Date().toLocaleString("pt-BR")}</div>
      <div class="center">Obrigado!</div>
    </div>`;
  const root=$("#print-root"); root.innerHTML=mount; window.print(); setTimeout(()=>{root.innerHTML="";},500);
}

/* exportar/importar JSON completo */
$("#btnExportFull").addEventListener("click", ()=>{
  const data = {
    clientes: state.clientes,
    produtos: state.produtos,
    entregadores: state.entregadores,
    pedidos: state.pedidos
  };
  downloadText(`backup_full_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data,null,2));
});
$("#importJsonFull").addEventListener("change", async (e)=>{
  const f=e.target.files[0]; if(!f) return;
  try{
    const data=JSON.parse(await f.text());
    if(data.clientes) state.clientes=data.clientes;
    if(data.produtos) state.produtos=data.produtos;
    if(data.entregadores) state.entregadores=data.entregadores;
    if(data.pedidos) state.pedidos=data.pedidos;
    persist("clientes"); persist("produtos"); persist("entregadores"); persist("pedidos");
    hydrateVender(); renderClientes(); renderProdutos(); renderEntregadores(); renderRotasPane();
    alert("Importado com sucesso.");
  }catch{ alert("Arquivo inválido."); }
});

/* utils download */
function downloadText(filename, text){
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"}); downloadBlob(filename, blob);
}
function downloadBlob(filename, blob){
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

/* inicial */
openView("vender"); hydrateVender();
