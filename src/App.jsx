import { useState, useEffect, useCallback } from "react"
import { sb, EID, dbIns, dbUpd, dbDel, signIn, signOut, getCurrentUser, podeAcessar } from "./supabase.js"
import { exportExcel, exportPDF } from "./export.js"

const C = {
  bg:"#F7F8FA",surface:"#FFFFFF",border:"#E8EAF0",
  text:"#111827",muted:"#6B7280",faint:"#9CA3AF",
  accent:"#2563EB",accentLight:"#EFF6FF",accentMid:"#BFDBFE",
  green:"#059669",greenLight:"#ECFDF5",greenMid:"#A7F3D0",
  amber:"#D97706",amberLight:"#FFFBEB",amberMid:"#FDE68A",
  red:"#DC2626",redLight:"#FEF2F2",redMid:"#FECACA",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
  teal:"#0D9488",tealLight:"#F0FDFA",tealMid:"#99F6E4",
  navy:"#1E3A5F",
}
const TODAY = new Date().toISOString().split("T")[0]
const fmt   = n => Number(n||0).toLocaleString("pt-BR")
const fmtR  = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
const fmtD  = d => d?new Date(d+"T12:00:00").toLocaleDateString("pt-BR"):"—"
const pct   = (a,b) => b===0?0:Math.round((a/b)*100)

const STATUS_OP = {
  planejada:{label:"Planejada",color:C.purple,bg:C.purpleLight},
  em_producao:{label:"Em Produção",color:C.accent,bg:C.accentLight},
  atrasada:{label:"Atrasada",color:C.red,bg:C.redLight},
  concluida:{label:"Concluída",color:C.green,bg:C.greenLight},
}
const STATUS_PC = {
  enviado:{label:"Enviado",color:C.muted,bg:"#F3F4F6"},
  confirmado:{label:"Confirmado",color:C.purple,bg:C.purpleLight},
  em_transito:{label:"Em Trânsito",color:C.amber,bg:C.amberLight},
  recebido:{label:"Recebido",color:C.green,bg:C.greenLight},
  cancelado:{label:"Cancelado",color:C.red,bg:C.redLight},
}
const STATUS_FIN = {
  aberta:{label:"Aberta",color:C.amber,bg:C.amberLight},
  paga:{label:"Paga",color:C.green,bg:C.greenLight},
  recebida:{label:"Recebida",color:C.green,bg:C.greenLight},
  vencida:{label:"Vencida",color:C.red,bg:C.redLight},
  cancelada:{label:"Cancelada",color:C.muted,bg:"#F3F4F6"},
}

// ── HOOK ─────────────────────────────────────────────────────────────────────
function useTable(table) {
  const [data,setData] = useState([])
  const [loading,setLd] = useState(true)
  const [error,setErr]  = useState(null)
  const load = useCallback(async()=>{
    setLd(true);setErr(null)
    const {data:rows,error:e} = await sb.from(table).select("*").eq("empresa_id",EID).order("id",{ascending:false})
    if(e) setErr(e.message); else setData(rows||[])
    setLd(false)
  },[table])
  useEffect(()=>{load()},[load])
  return {data,loading,error,reload:load}
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
const Badge = ({status,map=STATUS_OP}) => {
  const s=map[status]||{label:status,color:C.muted,bg:"#F3F4F6"}
  return <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,color:s.color,background:s.bg,whiteSpace:"nowrap"}}>{s.label}</span>
}
const PrioDot = ({p}) => {
  const pr={normal:{l:"Normal",c:C.muted},alta:{l:"Alta",c:C.amber},critica:{l:"Crítica",c:C.red}}[p]||{l:p,c:C.muted}
  return <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:pr.c,fontWeight:500}}><span style={{width:7,height:7,borderRadius:"50%",background:pr.c,display:"inline-block"}}/>{pr.l}</span>
}
const MiniBar = ({val,max,color=C.accent,h=8}) => {
  const p=Math.min(pct(val,max),100)
  return <div style={{height:h,background:C.border,borderRadius:4,overflow:"hidden",flex:1}}><div style={{height:"100%",width:`${p}%`,background:color,borderRadius:4}}/></div>
}
const BarPct = ({val,max}) => {
  const p=Math.min(pct(val,max),100);const c=p>=100?C.green:p>=70?C.accent:p>=40?C.amber:C.red
  return <div style={{width:"100%"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:3}}><span>{fmt(val)}/{fmt(max)}</span><span style={{fontWeight:700,color:c}}>{p}%</span></div><div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c,borderRadius:3}}/></div></div>
}
const Stars = ({n}) => <span style={{color:C.amber}}>{Array.from({length:5},(_,i)=>i<n?"★":"☆").join("")}</span>
const KCard = ({label,value,sub,color=C.text,icon,bg}) =>
  <div style={{background:bg||C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 24px",display:"flex",flexDirection:"column",gap:8,minWidth:0,overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
      <span style={{fontSize:12,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
      {icon&&<span style={{fontSize:18,flexShrink:0}}>{icon}</span>}
    </div>
    <div style={{fontSize:"clamp(20px,2.6vw,32px)",fontWeight:800,color,lineHeight:1.1,overflowWrap:"break-word",wordBreak:"break-word"}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
  </div>
const Spinner = () =>
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48,flexDirection:"column",gap:12}}>
    <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    <span style={{fontSize:13,color:C.muted}}>Carregando do Supabase...</span>
  </div>
const ErrBox = ({msg,onRetry}) =>
  <div style={{background:C.redLight,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"16px 20px",display:"flex",gap:12,alignItems:"center"}}>
    <span style={{fontSize:20}}>⚠️</span>
    <div style={{flex:1}}><div style={{fontWeight:700,color:C.red}}>Erro Supabase</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{msg}</div></div>
    {onRetry&&<button onClick={onRetry} style={{background:C.red,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>Tentar novamente</button>}
  </div>
function Modal({title,onClose,children}) {
  return <div style={{position:"fixed",inset:0,background:"#00000077",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,maxWidth:580,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:C.surface}}>
        <span style={{fontSize:15,fontWeight:800}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted,lineHeight:1}}>×</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
}
const Inp = ({label,...p}) =>
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>}
    <input {...p} style={{padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,color:C.text,background:C.bg,outline:"none",fontFamily:"inherit",width:"100%",...p.style}}/>
  </div>
const Sel = ({label,children,...p}) =>
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>}
    <select {...p} style={{padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,color:C.text,background:C.bg,outline:"none",fontFamily:"inherit",width:"100%",cursor:"pointer"}}>{children}</select>
  </div>
function Btn({children,variant="primary",size="md",sx,...p}) {
  const base={fontFamily:"inherit",fontWeight:700,cursor:p.disabled?"not-allowed":"pointer",border:"none",borderRadius:8,opacity:p.disabled?.5:1,fontSize:size==="sm"?12:13,padding:size==="sm"?"5px 11px":"9px 18px"}
  const v={primary:{background:C.accent,color:"#fff"},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},danger:{background:C.redLight,color:C.red,border:`1px solid ${C.redMid}`},success:{background:C.greenLight,color:C.green,border:`1px solid ${C.greenMid}`},amber:{background:C.amberLight,color:C.amber,border:`1px solid ${C.amberMid}`},teal:{background:C.tealLight,color:C.teal,border:`1px solid ${C.tealMid}`}}
  return <button {...p} style={{...base,...v[variant],...sx}}>{children}</button>
}
const Toast = ({msg,type}) => {
  const colors={success:C.green,error:C.red,info:C.accent,warn:C.amber}
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:999,background:C.surface,border:`1px solid ${C.border}`,borderLeft:`4px solid ${colors[type]||C.accent}`,borderRadius:10,padding:"12px 18px",fontSize:14,fontWeight:600,boxShadow:"0 8px 30px rgba(0,0,0,0.12)",color:C.text,maxWidth:340}}>{msg}</div>
}
const Tabs = ({tabs,active,onChange}) =>
  <div style={{display:"flex",gap:2,borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
    {tabs.map(t=><button key={t.key} onClick={()=>onChange(t.key)} style={{background:"none",border:"none",padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",color:active===t.key?C.accent:C.muted,borderBottom:active===t.key?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>{t.label}</button>)}
  </div>
const Section = ({title,action,children}) =>
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:800}}>{title}</span>{action}
    </div>
    {children}
  </div>
const ExportBtns = ({filename,title,columns,rows}) =>
  <div style={{display:"flex",gap:6}}>
    <button onClick={()=>exportExcel(filename,columns,rows)} title="Exportar Excel" style={{display:"flex",alignItems:"center",gap:5,background:C.greenLight,color:C.green,border:`1px solid ${C.greenMid}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>📊 Excel</button>
    <button onClick={()=>exportPDF(filename,title,columns,rows)} title="Exportar PDF" style={{display:"flex",alignItems:"center",gap:5,background:C.redLight,color:C.red,border:`1px solid ${C.redMid}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>📄 PDF</button>
  </div>
const Th = ({children}) => <th style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",background:C.bg,whiteSpace:"nowrap"}}>{children}</th>
const Td = ({children,style:s}) => <td style={{padding:"11px 14px",...s}}>{children}</td>
const MFoot = ({onCancel,onSave,saving,label="Salvar"}) =>
  <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
    <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
    <Btn onClick={onSave} disabled={saving}>{saving?"Salvando...":label}</Btn>
  </div>
const G2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{children}</div>
const Full = ({children}) => <div style={{gridColumn:"1/-1"}}>{children}</div>

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function ViewDashboard({user}) {
  const {data:ordens,loading:l1,error:e1,reload:r1} = useTable("ordens_producao")
  const {data:centros,loading:l2} = useTable("centros_trabalho")
  const {data:apts} = useTable("apontamentos")
  const {data:estoque} = useTable("estoque_mp")
  const {data:pagar} = useTable("contas_pagar")
  const {data:receber} = useTable("contas_receber")
  const {data:pedidos} = useTable("pedidos_compra")
  const {data:funcs} = useTable("funcionarios")
  const {data:qualidade} = useTable("qualidade")
  if(l1||l2) return <Spinner/>
  if(e1) return <ErrBox msg={e1} onRetry={r1}/>
  const atrasadas=ordens.filter(o=>o.status==="atrasada").length
  const emProd=ordens.filter(o=>o.status==="em_producao").length
  const prodHoje=apts.filter(a=>a.data===TODAY).reduce((s,a)=>s+a.quantidade,0)
  const refugoHoje=apts.filter(a=>a.data===TODAY).reduce((s,a)=>s+a.refugo,0)
  const stockAlerta=estoque.filter(e=>e.saldo<=e.minimo).length
  const valorEstoque=estoque.reduce((s,e)=>s+e.saldo*e.custo_unit,0)
  const totalPagar=pagar.filter(c=>c.status==="aberta").reduce((s,c)=>s+c.valor,0)
  const totalReceber=receber.filter(c=>c.status==="aberta").reduce((s,c)=>s+c.valor,0)
  const pedidosAbertos=pedidos.filter(p=>["enviado","confirmado","em_transito"].includes(p.status)).length
  const efGeral=centros.length?Math.round(centros.reduce((s,c)=>s+pct(c.utilizado,c.capacidade),0)/centros.length):0
  const qualNC=qualidade.filter(q=>q.resultado==="reprovado").length
  const opsCriticas=ordens.filter(o=>o.prioridade==="critica"||o.status==="atrasada")
  const proxVenc=[...pagar,...receber].filter(c=>c.status==="aberta").sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).slice(0,4)
  return <div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{background:`linear-gradient(135deg,${C.navy},${C.accent})`,borderRadius:14,padding:"20px 28px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Bom dia, {user?.nome?.split(" ")[0]||"Usuário"} 👋</div><div style={{fontSize:13,opacity:.8}}>{fmtD(TODAY)} · MetalTech Indústria · Betim/MG</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:12,opacity:.8,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Saldo Projetado</div><div style={{fontSize:30,fontWeight:800}}>{fmtR(totalReceber-totalPagar)}</div></div>
    </div>
    <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Visão Geral</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Em Produção" value={emProd} sub={`${ordens.length} total`} color={C.accent} icon="📋"/>
      <KCard label="Atrasadas" value={atrasadas} color={atrasadas>0?C.red:C.green} icon="⚠️" bg={atrasadas>0?C.redLight:C.surface}/>
      <KCard label="Eficiência" value={`${efGeral}%`} color={efGeral>80?C.red:C.green} icon="⚙️"/>
      <KCard label="NC Qualidade" value={qualNC} color={qualNC>0?C.red:C.green} icon="🔍"/>
      <KCard label="Estoque Alerta" value={stockAlerta} color={stockAlerta>0?C.amber:C.green} icon="📦" bg={stockAlerta>0?C.amberLight:C.surface}/>
      <KCard label="A Pagar" value={fmtR(totalPagar)} color={C.red} icon="📤"/>
      <KCard label="A Receber" value={fmtR(totalReceber)} color={C.green} icon="📥"/>
      <KCard label="Funcionários" value={funcs.filter(f=>f.ativo).length} sub="ativos" color={C.text} icon="👤"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Section title="Carga dos Centros">
        <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {centros.map(c=>{const p=Math.min(pct(c.utilizado,c.capacidade),100);const col=p>=90?C.red:p>=75?C.amber:C.green;return<div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:88,fontSize:13,fontWeight:700,flexShrink:0}}>{c.nome}</div>
            <MiniBar val={p} max={100} color={col}/>
            <div style={{width:38,textAlign:"right",fontSize:13,fontWeight:800,color:col,flexShrink:0}}>{p}%</div>
            {!c.disponivel&&<span style={{fontSize:10,background:C.redLight,color:C.red,padding:"2px 6px",borderRadius:8,fontWeight:700}}>PARADO</span>}
          </div>})}
        </div>
      </Section>
      <Section title="📅 Próximos Vencimentos">
        <div style={{display:"flex",flexDirection:"column"}}>
          {proxVenc.map((c,i)=>{const isPagar=c.fornecedor!==undefined;return<div key={i} style={{padding:"11px 20px",borderTop:i>0?`1px solid ${C.border}`:"none",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:16}}>{isPagar?"📤":"📥"}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.descricao?.substring(0,26)}</div><div style={{fontSize:11,color:C.muted}}>{isPagar?c.fornecedor:c.cliente}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:13,color:isPagar?C.red:C.green}}>{fmtR(c.valor)}</div><div style={{fontSize:11,color:C.muted}}>{fmtD(c.vencimento)}</div></div>
          </div>})}
        </div>
      </Section>
    </div>
    <Section title="⚠️ Ordens Críticas">
      <div style={{display:"flex",flexDirection:"column"}}>
        {opsCriticas.length===0&&<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:13}}>Tudo sob controle 🎉</div>}
        {opsCriticas.map((o,i)=><div key={o.id} style={{padding:"12px 20px",borderTop:i>0?`1px solid ${C.border}`:"none",display:"flex",gap:12,alignItems:"center"}}>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{o.codigo} — {o.produto}</div><div style={{fontSize:12,color:C.muted}}>{o.centro} · Entrega: {fmtD(o.data_entrega)}</div></div>
          <Badge status={o.status}/><PrioDot p={o.prioridade}/>
        </div>)}
      </div>
    </Section>
  </div>
}

// ── ORDENS ───────────────────────────────────────────────────────────────────
function ViewOrdens({showToast}) {
  const {data:ordens,loading,error,reload}=useTable("ordens_producao")
  const {data:centros}=useTable("centros_trabalho")
  const [tab,setTab]=useState("todos")
  const [q,setQ]=useState("")
  const [modal,setModal]=useState(false)
  const [edit,setEdit]=useState(null)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)
  const F=v=>setForm(f=>({...f,...v}))
  const CTRS=centros.map(c=>c.nome).length?centros.map(c=>c.nome):["Tornearia","Fresagem","Solda","Injeção","Acabamento"]
  const list=ordens.filter(o=>(tab==="todos"||o.status===tab)&&(!q||o.codigo.toLowerCase().includes(q.toLowerCase())||o.produto.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>{const m={critica:0,alta:1,normal:2};return(m[a.prioridade]??3)-(m[b.prioridade]??3)})
  const cnt=s=>s==="todos"?ordens.length:ordens.filter(o=>o.status===s).length
  function openNew(){setEdit(null);setForm({status:"planejada",prioridade:"normal",produzido:0,centro:CTRS[0],responsavel:"",quantidade:"",produto:"",codigo:`OP-${new Date().getFullYear()}-${String(ordens.length+1).padStart(3,"0")}`,data_inicio:TODAY,data_entrega:"",mp_consumida:0});setModal(true)}
  function openEdit(o){setEdit(o);setForm({...o});setModal(true)}
  async function save(){if(!form.produto||!form.quantidade)return showToast("Preencha produto e quantidade","error");setSaving(true);const p={...form,quantidade:Number(form.quantidade),produzido:Number(form.produzido||0),mp_consumida:Number(form.mp_consumida||0)};const{error:e}=edit?await dbUpd("ordens_producao",edit.id,p):await dbIns("ordens_producao",p);e?showToast("Erro: "+e.message,"error"):(showToast(edit?"Atualizada":"Criada","success"),await reload());setSaving(false);setModal(false)}
  async function del(o){if(!confirm(`Excluir ${o.codigo}?`))return;await dbDel("ordens_producao",o.id);showToast("Excluída","info");reload()}
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar OP ou produto..." style={{flex:1,minWidth:200,padding:"9px 14px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,fontFamily:"inherit",outline:"none",background:C.surface}}/>
      <Btn onClick={openNew}>+ Nova Ordem</Btn>
    </div>
    <Tabs tabs={["todos","planejada","em_producao","atrasada","concluida"].map(k=>({key:k,label:`${{todos:"Todas",planejada:"Planejadas",em_producao:"Em Produção",atrasada:"Atrasadas",concluida:"Concluídas"}[k]} (${cnt(k)})`}))} active={tab} onChange={setTab}/>
    <Section title={`${list.length} ordens`} action={<ExportBtns filename="ordens-producao" title="Ordens de Produção" columns={[
      {label:"Código",get:o=>o.codigo},{label:"Produto",get:o=>o.produto},{label:"Centro",get:o=>o.centro},
      {label:"Quantidade",get:o=>o.quantidade},{label:"Produzido",get:o=>o.produzido},{label:"Prioridade",get:o=>o.prioridade},
      {label:"Status",get:o=>(STATUS_OP[o.status]||{label:o.status}).label},{label:"Entrega",get:o=>fmtD(o.data_entrega)},
    ]} rows={list}/>}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
        <thead><tr><Th>Código</Th><Th>Produto</Th><Th>Centro</Th><Th>Progresso</Th><Th>Prioridade</Th><Th>Status</Th><Th>Entrega</Th><Th></Th></tr></thead>
        <tbody>
          {list.length===0&&<tr><td colSpan={8} style={{padding:28,textAlign:"center",color:C.muted}}>Nenhuma ordem</td></tr>}
          {list.map((o,i)=><tr key={o.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
            <Td><span style={{fontWeight:800,color:C.accent,fontSize:12}}>{o.codigo}</span></Td>
            <Td><div style={{fontWeight:700}}>{o.produto}</div><div style={{fontSize:11,color:C.muted}}>{o.responsavel}</div></Td>
            <Td style={{color:C.muted}}>{o.centro}</Td>
            <Td style={{minWidth:150}}><BarPct val={o.produzido} max={o.quantidade}/></Td>
            <Td><PrioDot p={o.prioridade}/></Td>
            <Td><Badge status={o.status}/></Td>
            <Td style={{whiteSpace:"nowrap",color:o.status==="atrasada"?C.red:C.muted}}>{fmtD(o.data_entrega)}</Td>
            <Td><div style={{display:"flex",gap:6}}><Btn size="sm" variant="ghost" onClick={()=>openEdit(o)}>Editar</Btn><Btn size="sm" variant="danger" onClick={()=>del(o)}>✕</Btn></div></Td>
          </tr>)}
        </tbody>
      </table></div>
    </Section>
    {modal&&<Modal title={edit?"Editar Ordem":"Nova Ordem"} onClose={()=>setModal(false)}>
      <G2><Inp label="Código OP" value={form.codigo||""} onChange={e=>F({codigo:e.target.value})}/><div/>
        <Full><Inp label="Produto" value={form.produto||""} onChange={e=>F({produto:e.target.value})}/></Full>
        <Inp label="Quantidade" type="number" value={form.quantidade||""} onChange={e=>F({quantidade:e.target.value})}/><Inp label="Produzido" type="number" value={form.produzido||0} onChange={e=>F({produzido:e.target.value})}/>
        <Sel label="Centro" value={form.centro||""} onChange={e=>F({centro:e.target.value})}>{CTRS.map(c=><option key={c}>{c}</option>)}</Sel><Inp label="Responsável" value={form.responsavel||""} onChange={e=>F({responsavel:e.target.value})}/>
        <Sel label="Status" value={form.status||"planejada"} onChange={e=>F({status:e.target.value})}><option value="planejada">Planejada</option><option value="em_producao">Em Produção</option><option value="atrasada">Atrasada</option><option value="concluida">Concluída</option></Sel>
        <Sel label="Prioridade" value={form.prioridade||"normal"} onChange={e=>F({prioridade:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></Sel>
        <Inp label="Data Início" type="date" value={form.data_inicio||""} onChange={e=>F({data_inicio:e.target.value})}/><Inp label="Data Entrega" type="date" value={form.data_entrega||""} onChange={e=>F({data_entrega:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={save} saving={saving} label={edit?"Atualizar":"Criar Ordem"}/>
    </Modal>}
  </div>
}

// ── ESTOQUE ──────────────────────────────────────────────────────────────────
function ViewFinanceiro({showToast}) {
  const {data:pagar,loading,error,reload:rp}=useTable("contas_pagar")
  const {data:receber,reload:rr}=useTable("contas_receber")
  const {data:custos}=useTable("custos_op")
  const [tab,setTab]=useState("resumo")
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)
  const F=v=>setForm(f=>({...f,...v}))
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={rp}/>
  const totalPagar=pagar.filter(c=>c.status==="aberta").reduce((s,c)=>s+c.valor,0)
  const totalReceber=receber.filter(c=>c.status==="aberta").reduce((s,c)=>s+c.valor,0)
  const vencidoPagar=pagar.filter(c=>c.status==="aberta"&&c.vencimento<TODAY).reduce((s,c)=>s+c.valor,0)
  const saldo=totalReceber-totalPagar
  const custosPorOP=[...new Set(custos.map(c=>c.op_codigo))].map(op=>{const cs=custos.filter(c=>c.op_codigo===op);return{op,mp:cs.filter(c=>c.tipo==="materia_prima").reduce((s,c)=>s+c.valor,0),mo:cs.filter(c=>c.tipo==="mao_obra").reduce((s,c)=>s+c.valor,0),oh:cs.filter(c=>c.tipo==="overhead").reduce((s,c)=>s+c.valor,0),total:cs.reduce((s,c)=>s+c.valor,0)}}).sort((a,b)=>b.total-a.total)
  async function savePagar(){if(!form.descricao||!form.valor)return showToast("Preencha descrição e valor","error");setSaving(true);const{error:e}=await dbIns("contas_pagar",{...form,valor:Number(form.valor),status:"aberta"});e?showToast("Erro: "+e.message,"error"):(showToast("Criada","success"),await rp());setSaving(false);setModal(null)}
  async function saveReceber(){if(!form.descricao||!form.valor)return showToast("Preencha descrição e valor","error");setSaving(true);const{error:e}=await dbIns("contas_receber",{...form,valor:Number(form.valor),status:"aberta"});e?showToast("Erro: "+e.message,"error"):(showToast("Criada","success"),await rr());setSaving(false);setModal(null)}
  async function marcarPago(id,tipo){await dbUpd(tipo==="pagar"?"contas_pagar":"contas_receber",id,{status:tipo==="pagar"?"paga":"recebida",data_pagamento:TODAY});showToast("Marcado","success");tipo==="pagar"?rp():rr()}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="A Receber" value={fmtR(totalReceber)} color={C.green} icon="📥"/><KCard label="A Pagar" value={fmtR(totalPagar)} color={C.red} icon="📤"/>
      <KCard label="Saldo Projetado" value={fmtR(saldo)} color={saldo>=0?C.green:C.red} icon="💰"/>
      <KCard label="Vencido" value={fmtR(vencidoPagar)} color={vencidoPagar>0?C.red:C.green} icon="⚠️" bg={vencidoPagar>0?C.redLight:C.surface}/>
    </div>
    <Tabs tabs={[{key:"resumo",label:"Resumo"},{key:"pagar",label:"A Pagar"},{key:"receber",label:"A Receber"},{key:"custos",label:"Custo por OP"}]} active={tab} onChange={setTab}/>
    {tab==="resumo"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Section title="📤 Próximos Pagamentos"><div style={{display:"flex",flexDirection:"column"}}>
        {pagar.filter(c=>c.status==="aberta").sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).slice(0,5).map((c,i)=>{const venc=c.vencimento<TODAY;return<div key={c.id} style={{padding:"11px 18px",borderTop:i>0?`1px solid ${C.border}`:"none",display:"flex",gap:10,alignItems:"center"}}>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{c.descricao?.substring(0,26)}</div><div style={{fontSize:11,color:C.muted}}>{c.fornecedor}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:800,color:venc?C.red:C.text}}>{fmtR(c.valor)}</div><div style={{fontSize:11,color:venc?C.red:C.muted}}>{fmtD(c.vencimento)}</div></div>
          <Btn size="sm" variant="success" onClick={()=>marcarPago(c.id,"pagar")}>✓</Btn>
        </div>})}
      </div></Section>
      <Section title="📥 Próximos Recebimentos"><div style={{display:"flex",flexDirection:"column"}}>
        {receber.filter(c=>c.status==="aberta").sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).slice(0,5).map((c,i)=><div key={c.id} style={{padding:"11px 18px",borderTop:i>0?`1px solid ${C.border}`:"none",display:"flex",gap:10,alignItems:"center"}}>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{c.descricao?.substring(0,26)}</div><div style={{fontSize:11,color:C.muted}}>{c.cliente}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:800,color:C.green}}>{fmtR(c.valor)}</div><div style={{fontSize:11,color:C.muted}}>{fmtD(c.vencimento)}</div></div>
          <Btn size="sm" variant="teal" onClick={()=>marcarPago(c.id,"receber")}>✓</Btn>
        </div>)}
      </div></Section>
    </div>}
    {tab==="pagar"&&<><div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({});setModal("pagar")}}>+ Nova Conta</Btn></div>
      <Section title={`${pagar.length} contas`} action={<ExportBtns filename="contas-pagar" title="Contas a Pagar" columns={[
        {label:"Descrição",get:c=>c.descricao},{label:"Fornecedor",get:c=>c.fornecedor||"—"},{label:"Categoria",get:c=>c.categoria},
        {label:"Valor",get:c=>fmtR(c.valor)},{label:"Vencimento",get:c=>fmtD(c.vencimento)},{label:"Status",get:c=>(STATUS_FIN[c.status]||{label:c.status}).label},
      ]} rows={pagar}/>}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr><Th>Descrição</Th><Th>Fornecedor</Th><Th>Valor</Th><Th>Vencimento</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>{pagar.map((c,i)=><tr key={c.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{fontWeight:600}}>{c.descricao}</Td><Td style={{color:C.muted}}>{c.fornecedor||"—"}</Td>
          <Td style={{fontWeight:800,color:C.red}}>{fmtR(c.valor)}</Td>
          <Td style={{color:c.status==="aberta"&&c.vencimento<TODAY?C.red:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.vencimento)}</Td>
          <Td><Badge status={c.status} map={STATUS_FIN}/></Td>
          <Td>{c.status==="aberta"&&<Btn size="sm" variant="success" onClick={()=>marcarPago(c.id,"pagar")}>Marcar Pago</Btn>}</Td>
        </tr>)}</tbody>
      </table></div></Section></>}
    {tab==="receber"&&<><div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({});setModal("receber")}}>+ Nova Conta</Btn></div>
      <Section title={`${receber.length} contas`} action={<ExportBtns filename="contas-receber" title="Contas a Receber" columns={[
        {label:"Descrição",get:c=>c.descricao},{label:"Cliente",get:c=>c.cliente||"—"},{label:"Categoria",get:c=>c.categoria},
        {label:"Valor",get:c=>fmtR(c.valor)},{label:"Vencimento",get:c=>fmtD(c.vencimento)},{label:"Status",get:c=>(STATUS_FIN[c.status]||{label:c.status}).label},
      ]} rows={receber}/>}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr><Th>Descrição</Th><Th>Cliente</Th><Th>Valor</Th><Th>Vencimento</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>{receber.map((c,i)=><tr key={c.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{fontWeight:600}}>{c.descricao}</Td><Td style={{color:C.muted}}>{c.cliente||"—"}</Td>
          <Td style={{fontWeight:800,color:C.green}}>{fmtR(c.valor)}</Td>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.vencimento)}</Td>
          <Td><Badge status={c.status} map={STATUS_FIN}/></Td>
          <Td>{c.status==="aberta"&&<Btn size="sm" variant="teal" onClick={()=>marcarPago(c.id,"receber")}>Marcar Recebido</Btn>}</Td>
        </tr>)}</tbody>
      </table></div></Section></>}
    {tab==="custos"&&<Section title="Custo por OP"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr><Th>OP</Th><Th>Matéria-Prima</Th><Th>Mão de Obra</Th><Th>Overhead</Th><Th>Total</Th><Th>Composição</Th></tr></thead>
      <tbody>{custosPorOP.map((c,i)=><tr key={c.op} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
        <Td><span style={{fontWeight:800,color:C.accent}}>{c.op}</span></Td><Td>{fmtR(c.mp)}</Td><Td>{fmtR(c.mo)}</Td><Td>{fmtR(c.oh)}</Td>
        <Td style={{fontWeight:800}}>{fmtR(c.total)}</Td>
        <Td style={{minWidth:160}}><MiniBar val={c.total} max={custosPorOP[0]?.total||1} color={C.accent}/></Td>
      </tr>)}</tbody>
    </table></div></Section>}
    {modal==="pagar"&&<Modal title="Nova Conta a Pagar" onClose={()=>setModal(null)}>
      <G2><Full><Inp label="Descrição" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Fornecedor" value={form.fornecedor||""} onChange={e=>F({fornecedor:e.target.value})}/><Inp label="Categoria" value={form.categoria||""} onChange={e=>F({categoria:e.target.value})}/>
        <Inp label="Valor (R$)" type="number" value={form.valor||""} onChange={e=>F({valor:e.target.value})}/><Inp label="Vencimento" type="date" value={form.vencimento||""} onChange={e=>F({vencimento:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={savePagar} saving={saving} label="Criar"/>
    </Modal>}
    {modal==="receber"&&<Modal title="Nova Conta a Receber" onClose={()=>setModal(null)}>
      <G2><Full><Inp label="Descrição" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Cliente" value={form.cliente||""} onChange={e=>F({cliente:e.target.value})}/><Inp label="Categoria" value={form.categoria||""} onChange={e=>F({categoria:e.target.value})}/>
        <Inp label="Valor (R$)" type="number" value={form.valor||""} onChange={e=>F({valor:e.target.value})}/><Inp label="Vencimento" type="date" value={form.vencimento||""} onChange={e=>F({vencimento:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={saveReceber} saving={saving} label="Criar"/>
    </Modal>}
  </div>
}

// ── RH ───────────────────────────────────────────────────────────────────────
function ViewApontamentos({showToast}){
  const {data:apts,loading,error,reload}=useTable("apontamentos");
  const {data:ordens}=useTable("ordens_producao");
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({turno:"manhã",refugo:0});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  const ops=ordens.filter(o=>["planejada","em_producao","atrasada"].includes(o.status));
  const hoje=apts.filter(a=>a.data===TODAY);
  const prodHoje=hoje.reduce((s,a)=>s+a.quantidade,0);
  const refugoHoje=hoje.reduce((s,a)=>s+a.refugo,0);
  async function save(){if(!form.op||!form.quantidade)return showToast("Preencha OP e quantidade","error");setSaving(true);const{error:e}=await dbIns("apontamentos",{...form,quantidade:Number(form.quantidade),refugo:Number(form.refugo||0),data:TODAY});e?showToast("Erro: "+e.message,"error"):(showToast("Registrado","success"),await reload());setSaving(false);setModal(false);setForm({turno:"manhã",refugo:0});}
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>;
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Produzido Hoje" value={fmt(prodHoje)} sub="peças" color={C.accent} icon="📦"/>
      <KCard label="Refugo Hoje" value={refugoHoje} color={refugoHoje>5?C.amber:C.green} icon="🗑️"/>
      <KCard label="Taxa de Refugo" value={prodHoje>0?`${((refugoHoje/prodHoje)*100).toFixed(1)}%`:"—"} color={C.text} icon="📊"/>
      <KCard label="Total Lançamentos" value={apts.length} color={C.text} icon="📝"/>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setModal(true)}>+ Registrar Apontamento</Btn></div>
    <Section title="Histórico">
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
        <thead><tr><Th>Data</Th><Th>OP</Th><Th>Operador</Th><Th>Centro</Th><Th>Turno</Th><Th>Produzido</Th><Th>Refugo</Th><Th>Obs</Th></tr></thead>
        <tbody>{apts.map((a,i)=><tr key={a.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(a.data)}</Td>
          <Td><span style={{fontWeight:700,color:C.accent}}>{a.op}</span></Td>
          <Td>{a.operador}</Td><Td style={{color:C.muted}}>{a.centro}</Td>
          <Td style={{color:C.muted,textTransform:"capitalize"}}>{a.turno}</Td>
          <Td><span style={{fontWeight:700}}>{a.quantidade}</span></Td>
          <Td><span style={{color:a.refugo>0?C.red:C.green,fontWeight:700}}>{a.refugo}</span></Td>
          <Td style={{color:C.muted,fontSize:12}}>{a.obs||"—"}</Td>
        </tr>)}</tbody>
      </table></div>
    </Section>
    {modal&&<Modal title="Registrar Apontamento" onClose={()=>setModal(false)}>
      <G2>
        <Full><Sel label="Ordem de Produção" value={form.op||""} onChange={e=>{const op=ops.find(o=>o.codigo===e.target.value);F({op:e.target.value,centro:op?.centro||form.centro});}}>
          <option value="">Selecione a OP...</option>{ops.map(o=><option key={o.id} value={o.codigo}>{o.codigo} — {o.produto}</option>)}
        </Sel></Full>
        <Inp label="Operador" value={form.operador||""} onChange={e=>F({operador:e.target.value})}/>
        <Sel label="Turno" value={form.turno} onChange={e=>F({turno:e.target.value})}><option value="manhã">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></Sel>
        <Inp label="Qtd Produzida" type="number" value={form.quantidade||""} onChange={e=>F({quantidade:e.target.value})}/>
        <Inp label="Refugo" type="number" value={form.refugo} onChange={e=>F({refugo:e.target.value})}/>
        <Full><Inp label="Centro de Trabalho" value={form.centro||""} onChange={e=>F({centro:e.target.value})}/></Full>
        <Full><Inp label="Observação" value={form.obs||""} onChange={e=>F({obs:e.target.value})}/></Full>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={save} saving={saving} label="Registrar"/>
    </Modal>}
  </div>;
}

// ─── OEE ──────────────────────────────────────────────────────────────────────
function ViewOEE({showToast}){
  const {data:centros,loading,error,reload}=useTable("centros_trabalho");
  const {data:apts}=useTable("apontamentos");
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  function calcOEE(c){const util=c.tempo_produtivo+c.setup;const disp=c.capacidade>0?util/c.capacidade*100:0;const perf=util>0?c.tempo_produtivo/util*100:0;const apt=apts.filter(a=>a.centro===c.nome);const tP=apt.reduce((s,a)=>s+a.quantidade,0);const tR=apt.reduce((s,a)=>s+a.refugo,0);const qual=tP>0?(1-tR/tP)*100:100;const oee=(disp/100)*(perf/100)*(qual/100)*100;return{disp:Math.min(disp,100),perf:Math.min(perf,100),qual:Math.min(qual,100),oee:Math.min(oee,100)};}
  function openEdit(c){setEdit(c);setForm({...c});setModal(true);}
  async function save(){setSaving(true);const nums=["capacidade","utilizado","tempo_produtivo","paradas","setup","operadores","maquinas"];const p={...form,...Object.fromEntries(nums.map(k=>[k,Number(form[k]||0)]))};const{error:e}=await dbUpd("centros_trabalho",edit.id,p);e?showToast("Erro: "+e.message,"error"):(showToast("Atualizado","success"),await reload());setSaving(false);setModal(false);}
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>;
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:C.accentLight,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"14px 20px",display:"flex",gap:20,flexWrap:"wrap"}}>
      {[{l:"Disponibilidade",s:"Tempo útil/Capacidade",c:C.accent},{l:"Performance",s:"Produtivo/Útil",c:C.purple},{l:"Qualidade",s:"Boas peças/Total",c:C.green},{l:"OEE",s:"D×P×Q",c:C.navy},{l:"World Class",s:"≥ 85%",c:C.green},{l:"Bom",s:"65–84%",c:C.amber},{l:"Crítico",s:"< 65%",c:C.red}].map(x=><div key={x.l} style={{flex:1,minWidth:100}}><div style={{fontSize:12,fontWeight:800,color:x.c,marginBottom:1}}>{x.l}</div><div style={{fontSize:11,color:C.muted}}>{x.s}</div></div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
      {centros.map(c=>{const{disp,perf,qual,oee}=calcOEE(c);const col=oee>=85?C.green:oee>=65?C.amber:C.red;const lbl=oee>=85?"World Class ⭐":oee>=65?"Bom":"Crítico";
        return <div key={c.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div><div style={{fontWeight:800,fontSize:15}}>{c.nome}</div><div style={{fontSize:12,color:C.muted}}>Turno {c.turno} · {c.operadores} op. · {c.maquinas} máq.</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:900,color:col,lineHeight:1}}>{oee.toFixed(0)}%</div><div style={{fontSize:11,color:col,fontWeight:700}}>{lbl}</div></div>
          </div>
          {!c.disponivel&&<div style={{background:C.redLight,color:C.red,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,marginBottom:10,textAlign:"center"}}>⛔ MÁQUINA PARADA</div>}
          {[{l:"Disponibilidade",v:disp,c:C.accent},{l:"Performance",v:perf,c:C.purple},{l:"Qualidade",v:qual,c:C.green}].map(r=><div key={r.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:C.muted}}>{r.l}</span><span style={{fontWeight:700,color:r.c}}>{r.v.toFixed(1)}%</span></div><MiniBar val={r.v} max={100} color={r.c}/></div>)}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:11,textAlign:"center"}}>
            <div><div style={{color:C.muted}}>Produtivo</div><div style={{fontWeight:700}}>{c.tempo_produtivo}h</div></div>
            <div><div style={{color:C.muted}}>Paradas</div><div style={{fontWeight:700,color:C.red}}>{c.paradas}h</div></div>
            <div><div style={{color:C.muted}}>Setup</div><div style={{fontWeight:700,color:C.amber}}>{c.setup}h</div></div>
          </div>
          <div style={{marginTop:10}}><Btn size="sm" variant="ghost" sx={{width:"100%"}} onClick={()=>openEdit(c)}>Atualizar Dados</Btn></div>
        </div>;
      })}
    </div>
    {modal&&<Modal title="Atualizar Centro" onClose={()=>setModal(false)}>
      <G2>
        <Full><div style={{fontWeight:700,fontSize:14}}>{edit?.nome}</div></Full>
        <Inp label="Capacidade (h/mês)" type="number" value={form.capacidade||""} onChange={e=>F({capacidade:e.target.value})}/><Inp label="Utilizado (h/mês)" type="number" value={form.utilizado||0} onChange={e=>F({utilizado:e.target.value})}/>
        <Inp label="Tempo Produtivo (h)" type="number" value={form.tempo_produtivo||0} onChange={e=>F({tempo_produtivo:e.target.value})}/><Inp label="Paradas (h)" type="number" value={form.paradas||0} onChange={e=>F({paradas:e.target.value})}/>
        <Inp label="Setup (h)" type="number" value={form.setup||0} onChange={e=>F({setup:e.target.value})}/><Inp label="Operadores" type="number" value={form.operadores||1} onChange={e=>F({operadores:e.target.value})}/>
        <Full><div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={form.disponivel!==false} onChange={e=>F({disponivel:e.target.checked})} style={{width:16,height:16}}/><label style={{fontSize:14,fontWeight:600}}>Centro disponível</label></div></Full>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={save} saving={saving}/>
    </Modal>}
  </div>;
}

// ─── ESTOQUE ──────────────────────────────────────────────────────────────────
function ViewEstoque({showToast}){
  const {data:estoque,loading,error,reload}=useTable("estoque_mp");
  const {data:movs,reload:reloadMovs}=useTable("movimentacoes_estoque");
  const [tab,setTab]=useState("estoque");
  const [modal,setModal]=useState(false);
  const [movModal,setMovModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [form,setForm]=useState({});
  const [movForm,setMovForm]=useState({tipo:"saida"});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  const MFm=v=>setMovForm(f=>({...f,...v}));
  const alertas=estoque.filter(e=>e.saldo<=e.minimo);
  const valorTotal=estoque.reduce((s,e)=>s+e.saldo*e.custo_unit,0);
  const nums=["saldo","minimo","maximo","custo_unit"];
  function openNew(){setEdit(null);setForm({unidade:"kg",saldo:0,minimo:100,maximo:1000,custo_unit:0,categoria:"Aço"});setModal(true);}
  function openEdit(e){setEdit(e);setForm({...e});setModal(true);}
  async function saveItem(){if(!form.codigo||!form.descricao)return showToast("Preencha código e descrição","error");setSaving(true);const p={...form,...Object.fromEntries(nums.map(k=>[k,Number(form[k]||0)]))};const{error:e}=edit?await dbUpd("estoque_mp",edit.id,p):await dbIns("estoque_mp",p);e?showToast("Erro: "+e.message,"error"):(showToast(edit?"Atualizado":"Criado","success"),await reload());setSaving(false);setModal(false);}
  async function saveMov(){if(!movForm.mp_codigo||!movForm.quantidade)return showToast("Preencha item e quantidade","error");setSaving(true);const qtd=Number(movForm.quantidade);await dbIns("movimentacoes_estoque",{...movForm,quantidade:qtd,data:TODAY});const item=estoque.find(e=>e.codigo===movForm.mp_codigo);if(item){const ns=movForm.tipo==="entrada"?item.saldo+qtd:Math.max(0,item.saldo-qtd);await dbUpd("estoque_mp",item.id,{saldo:ns,ultima_entrada:movForm.tipo==="entrada"?TODAY:item.ultima_entrada});}showToast("Movimentação registrada","success");await reload();await reloadMovs();setSaving(false);setMovModal(false);setMovForm({tipo:"saida"});}
  const sSaldo=e=>{if(e.saldo<=e.minimo)return{l:"Crítico",c:C.red,bg:C.redLight};if(e.saldo>=e.maximo*.9)return{l:"Excesso",c:C.amber,bg:C.amberLight};return{l:"OK",c:C.green,bg:C.greenLight};};
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>;
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Itens" value={estoque.length} color={C.text} icon="📦"/>
      <KCard label="Alertas" value={alertas.length} color={alertas.length>0?C.red:C.green} icon="⚠️" bg={alertas.length>0?C.redLight:C.surface}/>
      <KCard label="Valor Total" value={fmtR(valorTotal)} color={C.text} icon="💰"/>
      <KCard label="Movimentações" value={movs.length} color={C.text} icon="🔄"/>
    </div>
    <Tabs tabs={[{key:"estoque",label:"Estoque"},{key:"movimentacoes",label:"Movimentações"},{key:"alertas",label:`Alertas (${alertas.length})`}]} active={tab} onChange={setTab}/>
    {tab==="estoque"&&<><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={()=>setMovModal(true)}>+ Movimentação</Btn><Btn onClick={openNew}>+ Novo Item</Btn></div>
      <Section title={`${estoque.length} itens`} action={<ExportBtns filename="estoque-mp" title="Estoque de Matéria-Prima" columns={[
        {label:"Código",get:e=>e.codigo},{label:"Descrição",get:e=>e.descricao},{label:"Categoria",get:e=>e.categoria},
        {label:"Saldo",get:e=>e.saldo},{label:"Mínimo",get:e=>e.minimo},{label:"Máximo",get:e=>e.maximo},
        {label:"Custo Unit.",get:e=>fmtR(e.custo_unit)},{label:"Valor Total",get:e=>fmtR(e.saldo*e.custo_unit)},
      ]} rows={estoque}/>}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
        <thead><tr><Th>Código</Th><Th>Descrição</Th><Th>Categoria</Th><Th>Saldo</Th><Th>Mín/Máx</Th><Th>Custo</Th><Th>Valor</Th><Th>Status</Th><Th>Ult. Entrada</Th><Th></Th></tr></thead>
        <tbody>{estoque.map((e,i)=>{const s=sSaldo(e);return<tr key={e.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:800,color:C.accent,fontSize:12}}>{e.codigo}</span></Td>
          <Td style={{fontWeight:600}}>{e.descricao}</Td>
          <Td style={{color:C.muted}}>{e.categoria}</Td>
          <Td><span style={{fontWeight:800}}>{fmt(e.saldo)}</span><span style={{fontSize:11,color:C.muted,marginLeft:4}}>{e.unidade}</span></Td>
          <Td style={{color:C.muted,fontSize:12}}>{fmt(e.minimo)}/{fmt(e.maximo)}</Td>
          <Td style={{color:C.muted}}>{fmtR(e.custo_unit)}</Td>
          <Td style={{fontWeight:700}}>{fmtR(e.saldo*e.custo_unit)}</Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:s.c,background:s.bg}}>{s.l}</span></Td>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(e.ultima_entrada)}</Td>
          <Td><Btn size="sm" variant="ghost" onClick={()=>openEdit(e)}>Editar</Btn></Td>
        </tr>;})}
        </tbody></table></div></Section></>}
    {tab==="movimentacoes"&&<Section title="Movimentações"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr><Th>Data</Th><Th>Item</Th><Th>Tipo</Th><Th>Qtd</Th><Th>OP</Th><Th>Motivo</Th><Th>Usuário</Th></tr></thead>
      <tbody>{movs.map((m,i)=><tr key={m.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
        <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(m.data)}</Td>
        <Td><span style={{fontWeight:700,color:C.accent}}>{m.mp_codigo}</span></Td>
        <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:m.tipo==="entrada"?C.green:C.amber,background:m.tipo==="entrada"?C.greenLight:C.amberLight}}>{m.tipo==="entrada"?"Entrada":"Saída"}</span></Td>
        <Td style={{fontWeight:700}}>{fmt(m.quantidade)}</Td><Td style={{color:C.muted}}>{m.op||"—"}</Td>
        <Td style={{color:C.muted}}>{m.motivo}</Td><Td style={{color:C.muted}}>{m.usuario}</Td>
      </tr>)}</tbody></table></div></Section>}
    {tab==="alertas"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {alertas.length===0&&<div style={{background:C.greenLight,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:20,textAlign:"center",fontSize:14,color:C.green,fontWeight:700}}>✅ Todos os itens acima do mínimo!</div>}
      {alertas.map(e=><div key={e.id} style={{background:C.redLight,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"14px 20px",display:"flex",gap:14,alignItems:"center"}}>
        <span style={{fontSize:22}}>⚠️</span>
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{e.codigo} — {e.descricao}</div><div style={{fontSize:13,color:C.red,marginTop:2}}>Saldo: <strong>{fmt(e.saldo)} {e.unidade}</strong> · Mínimo: <strong>{fmt(e.minimo)}</strong> · {e.fornecedor}</div></div>
        <Btn variant="success" size="sm" onClick={()=>{setMovForm({tipo:"entrada",mp_codigo:e.codigo});setMovModal(true);}}>+ Entrada</Btn>
      </div>)}
    </div>}
    {modal&&<Modal title={edit?"Editar Item":"Novo Item"} onClose={()=>setModal(false)}>
      <G2><Inp label="Código" value={form.codigo||""} onChange={e=>F({codigo:e.target.value})}/><Sel label="Categoria" value={form.categoria||""} onChange={e=>F({categoria:e.target.value})}><option>Aço</option><option>Inox</option><option>Bronze</option><option>Plástico</option><option>Consumível</option><option>Outro</option></Sel>
        <Full><Inp label="Descrição" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Fornecedor" value={form.fornecedor||""} onChange={e=>F({fornecedor:e.target.value})}/><Sel label="Unidade" value={form.unidade||"kg"} onChange={e=>F({unidade:e.target.value})}><option value="kg">kg</option><option value="L">L</option><option value="m">m</option><option value="un">un</option></Sel>
        <Inp label="Saldo" type="number" value={form.saldo||0} onChange={e=>F({saldo:e.target.value})}/><Inp label="Custo Unit." type="number" step="0.01" value={form.custo_unit||0} onChange={e=>F({custo_unit:e.target.value})}/>
        <Inp label="Mínimo" type="number" value={form.minimo||0} onChange={e=>F({minimo:e.target.value})}/><Inp label="Máximo" type="number" value={form.maximo||0} onChange={e=>F({maximo:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={saveItem} saving={saving} label={edit?"Atualizar":"Criar"}/>
    </Modal>}
    {movModal&&<Modal title="Registrar Movimentação" onClose={()=>setMovModal(false)}>
      <G2><Sel label="Tipo" value={movForm.tipo} onChange={e=>MFm({tipo:e.target.value})}><option value="entrada">Entrada</option><option value="saida">Saída</option></Sel>
        <Sel label="Item" value={movForm.mp_codigo||""} onChange={e=>MFm({mp_codigo:e.target.value})}><option value="">Selecione...</option>{estoque.map(e=><option key={e.id} value={e.codigo}>{e.codigo}</option>)}</Sel>
        <Inp label="Quantidade" type="number" value={movForm.quantidade||""} onChange={e=>MFm({quantidade:e.target.value})}/><Inp label="OP (opcional)" value={movForm.op||""} onChange={e=>MFm({op:e.target.value})}/>
        <Full><Inp label="Motivo" value={movForm.motivo||""} onChange={e=>MFm({motivo:e.target.value})}/></Full>
        <Full><Inp label="Usuário" value={movForm.usuario||""} onChange={e=>MFm({usuario:e.target.value})}/></Full>
      </G2><MFoot onCancel={()=>setMovModal(false)} onSave={saveMov} saving={saving} label="Registrar"/>
    </Modal>}
  </div>;
}

// ─── QUALIDADE ────────────────────────────────────────────────────────────────
function ViewQualidade({showToast}){
  const {data:qualidade,loading,error,reload}=useTable("qualidade");
  const {data:ordens}=useTable("ordens_producao");
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({resultado:"aprovado",nc:0});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  const ops=ordens.filter(o=>["em_producao","concluida"].includes(o.status));
  const totalInsp=qualidade.reduce((s,q)=>s+q.qtd_insp,0);
  const totalNC=qualidade.reduce((s,q)=>s+q.nc,0);
  const pareto=[...new Set(qualidade.filter(q=>q.tipo_nc).map(q=>q.tipo_nc))].map(t=>({t,n:qualidade.filter(q=>q.tipo_nc===t).reduce((s,q)=>s+q.nc,0)})).sort((a,b)=>b.n-a.n);
  async function save(){if(!form.op)return showToast("Selecione uma OP","error");setSaving(true);const{error:e}=await dbIns("qualidade",{...form,qtd_insp:Number(form.qtd_insp||0),nc:Number(form.nc||0),data:TODAY});e?showToast("Erro: "+e.message,"error"):(showToast("Registrado","success"),await reload());setSaving(false);setModal(false);setForm({resultado:"aprovado",nc:0});}
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>;
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Total Inspecionado" value={fmt(totalInsp)} color={C.text} icon="🔍"/>
      <KCard label="Aprovadas" value={qualidade.filter(q=>q.resultado==="aprovado").length} color={C.green} icon="✅"/>
      <KCard label="Reprovadas" value={qualidade.filter(q=>q.resultado==="reprovado").length} color={qualidade.filter(q=>q.resultado==="reprovado").length>0?C.red:C.green} icon="❌"/>
      <KCard label="Taxa NC" value={totalInsp>0?`${((totalNC/totalInsp)*100).toFixed(2)}%`:"—"} color={C.text} icon="📊"/>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setModal(true)}>+ Registrar Inspeção</Btn></div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
      <Section title="Histórico de Inspeções"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr><Th>Data</Th><Th>OP</Th><Th>Inspetor</Th><Th>Insp.</Th><Th>NC</Th><Th>Tipo</Th><Th>Resultado</Th><Th>Ação</Th></tr></thead>
        <tbody>{qualidade.map((q,i)=><tr key={q.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(q.data)}</Td>
          <Td><span style={{fontWeight:700,color:C.accent}}>{q.op}</span></Td>
          <Td>{q.inspetor}</Td><Td style={{fontWeight:700}}>{q.qtd_insp}</Td>
          <Td><span style={{color:q.nc>0?C.red:C.green,fontWeight:700}}>{q.nc}</span></Td>
          <Td style={{color:C.muted,fontSize:12}}>{q.tipo_nc||"—"}</Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:q.resultado==="aprovado"?C.green:C.red,background:q.resultado==="aprovado"?C.greenLight:C.redLight}}>{q.resultado==="aprovado"?"Aprovado":"Reprovado"}</span></Td>
          <Td style={{fontSize:12,color:C.muted,maxWidth:160}}>{q.acao||"—"}</Td>
        </tr>)}</tbody></table></div></Section>
      <Section title="Pareto de NCs"><div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
        {pareto.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:12}}>Sem dados</div>}
        {pareto.map(r=><div key={r.t}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{fontWeight:600}}>{r.t}</span><span style={{color:C.red,fontWeight:700}}>{r.n}</span></div><MiniBar val={r.n} max={pareto[0]?.n||1} color={C.red} h={6}/></div>)}
      </div></Section>
    </div>
    {modal&&<Modal title="Registrar Inspeção" onClose={()=>setModal(false)}>
      <G2><Full><Sel label="Ordem de Produção" value={form.op||""} onChange={e=>F({op:e.target.value})}><option value="">Selecione...</option>{ops.map(o=><option key={o.id} value={o.codigo}>{o.codigo} — {o.produto}</option>)}</Sel></Full>
        <Inp label="Inspetor" value={form.inspetor||""} onChange={e=>F({inspetor:e.target.value})}/><Inp label="Qtd Inspecionada" type="number" value={form.qtd_insp||""} onChange={e=>F({qtd_insp:e.target.value})}/>
        <Inp label="Qtd NC" type="number" value={form.nc} onChange={e=>F({nc:e.target.value})}/><Sel label="Tipo NC" value={form.tipo_nc||""} onChange={e=>F({tipo_nc:e.target.value})}><option value="">Sem NC</option><option>Dimensional</option><option>Acabamento</option><option>Superfície</option><option>Material</option><option>Montagem</option></Sel>
        <Full><Sel label="Resultado" value={form.resultado} onChange={e=>F({resultado:e.target.value})}><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option></Sel></Full>
        <Full><Inp label="Ação Corretiva" value={form.acao||""} onChange={e=>F({acao:e.target.value})}/></Full>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={save} saving={saving} label="Registrar"/>
    </Modal>}
  </div>;
}

// ─── COMPRAS ──────────────────────────────────────────────────────────────────
function ViewCompras({showToast}){
  const {data:fornecedores,loading:lf,error:ef,reload:rf}=useTable("fornecedores");
  const {data:requisicoes,loading:lr,reload:rr}=useTable("requisicoes_compra");
  const {data:pedidos,loading:lp,reload:rp}=useTable("pedidos_compra");
  const [tab,setTab]=useState("pedidos");
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  if(lf||lr||lp)return <Spinner/>;if(ef)return <ErrBox msg={ef} onRetry={rf}/>;

  const pedidosAbertos=pedidos.filter(p=>["enviado","confirmado","em_transito"].includes(p.status));
  const valorEmAberto=pedidosAbertos.reduce((s,p)=>s+(p.valor_total||p.quantidade*p.valor_unit),0);
  const reqAbertas=requisicoes.filter(r=>r.status==="aberta").length;

  async function saveForn(){if(!form.razao_social)return showToast("Preencha razão social","error");setSaving(true);const{error:e}=await dbIns("fornecedores",{...form,avaliacao:Number(form.avaliacao||3),prazo_entrega:Number(form.prazo_entrega||7)});e?showToast("Erro: "+e.message,"error"):(showToast("Fornecedor criado","success"),await rf());setSaving(false);setModal(null);}
  async function saveReq(){if(!form.descricao||!form.quantidade)return showToast("Preencha descrição e quantidade","error");setSaving(true);const{error:e}=await dbIns("requisicoes_compra",{...form,quantidade:Number(form.quantidade),numero:`RC-${new Date().getFullYear()}-${String(requisicoes.length+1).padStart(3,"0")}`});e?showToast("Erro: "+e.message,"error"):(showToast("Requisição criada","success"),await rr());setSaving(false);setModal(null);}
  async function savePed(){if(!form.fornecedor_id||!form.quantidade)return showToast("Preencha fornecedor e quantidade","error");setSaving(true);const{error:e}=await dbIns("pedidos_compra",{...form,quantidade:Number(form.quantidade),valor_unit:Number(form.valor_unit||0),fornecedor_id:Number(form.fornecedor_id),numero:`PC-${new Date().getFullYear()}-${String(pedidos.length+1).padStart(3,"0")}`});e?showToast("Erro: "+e.message,"error"):(showToast("Pedido criado","success"),await rp());setSaving(false);setModal(null);}
  async function updatePedStatus(id,status){await dbUpd("pedidos_compra",id,{status,data_recebimento:status==="recebido"?TODAY:null});showToast("Status atualizado","success");rp();}

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Pedidos Abertos" value={pedidosAbertos.length} color={C.teal} icon="🛒"/>
      <KCard label="Valor em Aberto" value={fmtR(valorEmAberto)} color={C.text} icon="💰"/>
      <KCard label="Requisições" value={reqAbertas} sub="aguardando aprovação" color={reqAbertas>0?C.amber:C.green} icon="📋"/>
      <KCard label="Fornecedores" value={fornecedores.length} sub="cadastrados" color={C.text} icon="🏢"/>
    </div>
    <Tabs tabs={[{key:"pedidos",label:"Pedidos de Compra"},{key:"requisicoes",label:"Requisições"},{key:"fornecedores",label:"Fornecedores"}]} active={tab} onChange={setTab}/>

    {tab==="pedidos"&&<>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({status:"enviado"});setModal("pedido");}}>+ Novo Pedido</Btn></div>
      <Section title={`${pedidos.length} pedidos`} action={<ExportBtns filename="pedidos-compra" title="Pedidos de Compra" columns={[
        {label:"Número",get:p=>p.numero},{label:"Descrição",get:p=>p.descricao},
        {label:"Fornecedor",get:p=>fornecedores.find(f=>f.id===p.fornecedor_id)?.razao_social||"—"},
        {label:"Quantidade",get:p=>p.quantidade},{label:"Valor Total",get:p=>fmtR(p.valor_total||p.quantidade*p.valor_unit)},
        {label:"Previsão",get:p=>fmtD(p.previsao_entrega)},{label:"Status",get:p=>(STATUS_PC[p.status]||{label:p.status}).label},
      ]} rows={pedidos}/>}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
        <thead><tr><Th>Número</Th><Th>Descrição</Th><Th>Fornecedor</Th><Th>Qtd</Th><Th>Valor Total</Th><Th>Previsão</Th><Th>Status</Th><Th>Ações</Th></tr></thead>
        <tbody>{pedidos.map((p,i)=>{const forn=fornecedores.find(f=>f.id===p.fornecedor_id);return<tr key={p.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:800,color:C.teal,fontSize:12}}>{p.numero}</span></Td>
          <Td style={{fontWeight:600}}>{p.descricao}</Td>
          <Td style={{color:C.muted}}>{forn?.razao_social||"—"}</Td>
          <Td style={{fontWeight:700}}>{fmt(p.quantidade)} {p.unidade}</Td>
          <Td style={{fontWeight:700}}>{fmtR((p.valor_total||p.quantidade*p.valor_unit))}</Td>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(p.previsao_entrega)}</Td>
          <Td><Badge status={p.status} map={STATUS_PC}/></Td>
          <Td><div style={{display:"flex",gap:4}}>
            {p.status==="enviado"&&<Btn size="sm" variant="amber" onClick={()=>updatePedStatus(p.id,"confirmado")}>Confirmar</Btn>}
            {p.status==="confirmado"&&<Btn size="sm" variant="amber" onClick={()=>updatePedStatus(p.id,"em_transito")}>Enviar</Btn>}
            {p.status==="em_transito"&&<Btn size="sm" variant="success" onClick={()=>updatePedStatus(p.id,"recebido")}>Receber</Btn>}
          </div></Td>
        </tr>;})}
        </tbody></table></div></Section>
    </>}

    {tab==="requisicoes"&&<>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({urgencia:"normal",status:"aberta",unidade:"kg"});setModal("requisicao");}}>+ Nova Requisição</Btn></div>
      <Section title={`${requisicoes.length} requisições`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr><Th>Número</Th><Th>Descrição</Th><Th>Qtd</Th><Th>Urgência</Th><Th>Status</Th><Th>Solicitante</Th><Th>Necessidade</Th></tr></thead>
        <tbody>{requisicoes.map((r,i)=><tr key={r.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:800,color:C.accent,fontSize:12}}>{r.numero}</span></Td>
          <Td style={{fontWeight:600}}>{r.descricao}</Td>
          <Td style={{fontWeight:700}}>{fmt(r.quantidade)} {r.unidade}</Td>
          <Td><PrioDot p={r.urgencia}/></Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:{aberta:C.amber,cotando:C.accent,aprovada:C.green,cancelada:C.red}[r.status],background:{aberta:C.amberLight,cotando:C.accentLight,aprovada:C.greenLight,cancelada:C.redLight}[r.status]}}>{r.status}</span></Td>
          <Td style={{color:C.muted}}>{r.solicitante}</Td>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(r.data_necessidade)}</Td>
        </tr>)}
        </tbody></table></div></Section>
    </>}

    {tab==="fornecedores"&&<>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({avaliacao:3,prazo_entrega:7,ativo:true});setModal("fornecedor");}}>+ Novo Fornecedor</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {fornecedores.map(f=><div key={f.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontWeight:800,fontSize:14}}>{f.razao_social}</div><div style={{fontSize:12,color:C.muted}}>{f.categoria} · CNPJ: {f.cnpj||"—"}</div></div>
            <Stars n={f.avaliacao}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,color:C.muted}}>
            <div>📧 {f.email||"—"}</div>
            <div>📞 {f.telefone||"—"}</div>
            <div>⏱ Prazo: {f.prazo_entrega} dias</div>
            <div style={{color:f.ativo?C.green:C.red,fontWeight:700}}>{f.ativo?"✓ Ativo":"✗ Inativo"}</div>
          </div>
        </div>)}
      </div>
    </>}

    {modal==="pedido"&&<Modal title="Novo Pedido de Compra" onClose={()=>setModal(null)}>
      <G2><Sel label="Fornecedor" value={form.fornecedor_id||""} onChange={e=>F({fornecedor_id:e.target.value})}><option value="">Selecione...</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.razao_social}</option>)}</Sel>
        <Inp label="Código MP" value={form.mp_codigo||""} onChange={e=>F({mp_codigo:e.target.value})}/>
        <Full><Inp label="Descrição do Item" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Quantidade" type="number" value={form.quantidade||""} onChange={e=>F({quantidade:e.target.value})}/><Inp label="Valor Unit. (R$)" type="number" step="0.01" value={form.valor_unit||""} onChange={e=>F({valor_unit:e.target.value})}/>
        <Inp label="Previsão de Entrega" type="date" value={form.previsao_entrega||""} onChange={e=>F({previsao_entrega:e.target.value})}/>
        <Sel label="Status" value={form.status||"enviado"} onChange={e=>F({status:e.target.value})}><option value="enviado">Enviado</option><option value="confirmado">Confirmado</option><option value="em_transito">Em Trânsito</option></Sel>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={savePed} saving={saving} label="Criar Pedido"/>
    </Modal>}
    {modal==="requisicao"&&<Modal title="Nova Requisição de Compra" onClose={()=>setModal(null)}>
      <G2><Inp label="Código MP (opcional)" value={form.mp_codigo||""} onChange={e=>F({mp_codigo:e.target.value})}/><Sel label="Urgência" value={form.urgencia||"normal"} onChange={e=>F({urgencia:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></Sel>
        <Full><Inp label="Descrição do Item" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Quantidade" type="number" value={form.quantidade||""} onChange={e=>F({quantidade:e.target.value})}/><Sel label="Unidade" value={form.unidade||"kg"} onChange={e=>F({unidade:e.target.value})}><option value="kg">kg</option><option value="L">L</option><option value="un">un</option></Sel>
        <Inp label="Solicitante" value={form.solicitante||""} onChange={e=>F({solicitante:e.target.value})}/><Inp label="Data Necessidade" type="date" value={form.data_necessidade||""} onChange={e=>F({data_necessidade:e.target.value})}/>
        <Full><Inp label="Motivo" value={form.motivo||""} onChange={e=>F({motivo:e.target.value})}/></Full>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={saveReq} saving={saving} label="Criar Requisição"/>
    </Modal>}
    {modal==="fornecedor"&&<Modal title="Novo Fornecedor" onClose={()=>setModal(null)}>
      <G2><Full><Inp label="Razão Social" value={form.razao_social||""} onChange={e=>F({razao_social:e.target.value})}/></Full>
        <Inp label="CNPJ" value={form.cnpj||""} onChange={e=>F({cnpj:e.target.value})}/><Inp label="Categoria" value={form.categoria||""} onChange={e=>F({categoria:e.target.value})}/>
        <Inp label="Contato" value={form.contato||""} onChange={e=>F({contato:e.target.value})}/><Inp label="Email" type="email" value={form.email||""} onChange={e=>F({email:e.target.value})}/>
        <Inp label="Telefone" value={form.telefone||""} onChange={e=>F({telefone:e.target.value})}/><Inp label="Prazo Entrega (dias)" type="number" value={form.prazo_entrega||7} onChange={e=>F({prazo_entrega:e.target.value})}/>
        <Sel label="Avaliação" value={form.avaliacao||3} onChange={e=>F({avaliacao:e.target.value})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{"★".repeat(n)} ({n}/5)</option>)}</Sel>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={saveForn} saving={saving} label="Criar Fornecedor"/>
    </Modal>}
  </div>;
}

// ─── RH ───────────────────────────────────────────────────────────────────────
function ViewRH({showToast}){
  const {data:funcs,loading,error,reload}=useTable("funcionarios");
  const {data:pontos,reload:reloadP}=useTable("registros_ponto");
  const {data:escalas}=useTable("escalas");
  const [tab,setTab]=useState("funcionarios");
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({turno:"manhã",ativo:true});
  const [pontoForm,setPontoForm]=useState({});
  const [saving,setSaving]=useState(false);
  const F=v=>setForm(f=>({...f,...v}));
  const PF=v=>setPontoForm(f=>({...f,...v}));
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>;

  const funcsAtivos=funcs.filter(f=>f.ativo).length;
  const centros=[...new Set(funcs.map(f=>f.centro).filter(Boolean))];
  const folhaMensal=funcs.filter(f=>f.ativo).reduce((s,f)=>s+f.salario,0);
  const pontosHoje=pontos.filter(p=>p.data===TODAY).length;

  async function saveFunc(){if(!form.nome)return showToast("Preencha o nome","error");setSaving(true);const{error:e}=await dbIns("funcionarios",{...form,salario:Number(form.salario||0),avatar:form.nome.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase(),matricula:form.matricula||`M-${String(funcs.length+1).padStart(3,"0")}`});e?showToast("Erro: "+e.message,"error"):(showToast("Funcionário criado","success"),await reload());setSaving(false);setModal(null);}
  async function savePonto(){if(!pontoForm.funcionario_id)return showToast("Selecione o funcionário","error");setSaving(true);const{error:e}=await dbIns("registros_ponto",{...pontoForm,funcionario_id:Number(pontoForm.funcionario_id),horas_extras:Number(pontoForm.horas_extras||0),data:TODAY});e?showToast("Erro: "+e.message,"error"):(showToast("Ponto registrado","success"),await reloadP());setSaving(false);setModal(null);setPontoForm({});}

  const horasPorFunc=funcs.map(f=>{const pts=pontos.filter(p=>p.funcionario_id===f.id);const total=pts.reduce((s,p)=>s+(p.horas_trabalhadas||0),0);const extras=pts.reduce((s,p)=>s+(p.horas_extras||0),0);return{...f,total_horas:total,total_extras:extras,dias:pts.length};});

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      <KCard label="Funcionários Ativos" value={funcsAtivos} sub={`de ${funcs.length} total`} color={C.text} icon="👤"/>
      <KCard label="Folha Mensal" value={fmtR(folhaMensal)} sub="salários base" color={C.text} icon="💰"/>
      <KCard label="Pontos Hoje" value={pontosHoje} sub="registros" color={C.accent} icon="🕐"/>
      <KCard label="Centros" value={centros.length} sub="de trabalho" color={C.text} icon="🏭"/>
    </div>
    <Tabs tabs={[{key:"funcionarios",label:"Funcionários"},{key:"ponto",label:"Registros de Ponto"},{key:"produtividade",label:"Produtividade"}]} active={tab} onChange={setTab}/>

    {tab==="funcionarios"&&<>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({turno:"manhã",ativo:true});setModal("func");}}>+ Novo Funcionário</Btn></div>
      <Section title={`${funcs.length} funcionários`} action={<ExportBtns filename="funcionarios" title="Funcionários" columns={[
        {label:"Matrícula",get:f=>f.matricula},{label:"Nome",get:f=>f.nome},{label:"Cargo",get:f=>f.cargo},
        {label:"Centro",get:f=>f.centro},{label:"Turno",get:f=>f.turno},{label:"Salário",get:f=>fmtR(f.salario)},
        {label:"Status",get:f=>f.ativo?"Ativo":"Inativo"},
      ]} rows={funcs}/>}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
        <thead><tr><Th>Matrícula</Th><Th>Nome</Th><Th>Cargo</Th><Th>Centro</Th><Th>Turno</Th><Th>Salário</Th><Th>Status</Th></tr></thead>
        <tbody>{funcs.map((f,i)=><tr key={f.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:800,color:C.accent,fontSize:12}}>{f.matricula}</span></Td>
          <Td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{f.avatar}</div><span style={{fontWeight:700}}>{f.nome}</span></div></Td>
          <Td style={{color:C.muted}}>{f.cargo}</Td><Td style={{color:C.muted}}>{f.centro}</Td>
          <Td style={{textTransform:"capitalize",color:C.muted}}>{f.turno}</Td>
          <Td style={{fontWeight:700}}>{fmtR(f.salario)}</Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:f.ativo?C.green:C.red,background:f.ativo?C.greenLight:C.redLight}}>{f.ativo?"Ativo":"Inativo"}</span></Td>
        </tr>)}
        </tbody></table></div></Section>
    </>}

    {tab==="ponto"&&<>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setModal("ponto")}>+ Registrar Ponto</Btn></div>
      <Section title={`${pontos.length} registros`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
        <thead><tr><Th>Data</Th><Th>Funcionário</Th><Th>Entrada</Th><Th>Almoço</Th><Th>Saída</Th><Th>Horas</Th><Th>Extras</Th></tr></thead>
        <tbody>{pontos.map((p,i)=>{const f=funcs.find(f=>f.id===p.funcionario_id);return<tr key={p.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(p.data)}</Td>
          <Td style={{fontWeight:700}}>{f?.nome||"—"}</Td>
          <Td style={{color:C.green,fontWeight:600}}>{p.entrada||"—"}</Td>
          <Td style={{color:C.muted,fontSize:12}}>{p.saida_almoco&&p.retorno_almoco?`${p.saida_almoco}–${p.retorno_almoco}`:"—"}</Td>
          <Td style={{color:C.red,fontWeight:600}}>{p.saida||"—"}</Td>
          <Td><span style={{fontWeight:700}}>{p.horas_trabalhadas?Number(p.horas_trabalhadas).toFixed(1)+"h":"—"}</span></Td>
          <Td><span style={{color:p.horas_extras>0?C.amber:C.muted,fontWeight:700}}>{p.horas_extras>0?`+${p.horas_extras}h`:"—"}</span></Td>
        </tr>;})}
        </tbody></table></div></Section>
    </>}

    {tab==="produtividade"&&<Section title="Produtividade por Funcionário"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr><Th>Funcionário</Th><Th>Cargo</Th><Th>Centro</Th><Th>Dias</Th><Th>Total Horas</Th><Th>Extras</Th><Th>Salário</Th></tr></thead>
      <tbody>{horasPorFunc.map((f,i)=><tr key={f.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
        <Td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>{f.avatar}</div><span style={{fontWeight:700}}>{f.nome}</span></div></Td>
        <Td style={{color:C.muted}}>{f.cargo}</Td><Td style={{color:C.muted}}>{f.centro}</Td>
        <Td style={{fontWeight:700,textAlign:"center"}}>{f.dias}</Td>
        <Td style={{fontWeight:700}}>{f.total_horas?Number(f.total_horas).toFixed(1)+"h":"—"}</Td>
        <Td><span style={{color:f.total_extras>0?C.amber:C.muted,fontWeight:700}}>{f.total_extras>0?`+${Number(f.total_extras).toFixed(1)}h`:"—"}</span></Td>
        <Td style={{fontWeight:700}}>{fmtR(f.salario)}</Td>
      </tr>)}</tbody></table></div></Section>}

    {modal==="func"&&<Modal title="Novo Funcionário" onClose={()=>setModal(null)}>
      <G2><Full><Inp label="Nome Completo" value={form.nome||""} onChange={e=>F({nome:e.target.value})}/></Full>
        <Inp label="Cargo" value={form.cargo||""} onChange={e=>F({cargo:e.target.value})}/>
        <Inp label="Centro de Trabalho" value={form.centro||""} onChange={e=>F({centro:e.target.value})}/>
        <Sel label="Turno" value={form.turno} onChange={e=>F({turno:e.target.value})}><option value="manhã">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></Sel>
        <Inp label="Salário (R$)" type="number" step="0.01" value={form.salario||""} onChange={e=>F({salario:e.target.value})}/>
        <Inp label="Data de Admissão" type="date" value={form.admissao||""} onChange={e=>F({admissao:e.target.value})}/>
        <Full><div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={form.ativo!==false} onChange={e=>F({ativo:e.target.checked})} style={{width:16,height:16}}/><label style={{fontSize:14,fontWeight:600}}>Funcionário ativo</label></div></Full>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={saveFunc} saving={saving} label="Criar Funcionário"/>
    </Modal>}
    {modal==="ponto"&&<Modal title="Registrar Ponto" onClose={()=>setModal(null)}>
      <G2><Full><Sel label="Funcionário" value={pontoForm.funcionario_id||""} onChange={e=>PF({funcionario_id:e.target.value})}><option value="">Selecione...</option>{funcs.filter(f=>f.ativo).map(f=><option key={f.id} value={f.id}>{f.nome} — {f.turno}</option>)}</Sel></Full>
        <Inp label="Entrada" type="time" value={pontoForm.entrada||""} onChange={e=>PF({entrada:e.target.value})}/><Inp label="Saída" type="time" value={pontoForm.saida||""} onChange={e=>PF({saida:e.target.value})}/>
        <Inp label="Saída Almoço" type="time" value={pontoForm.saida_almoco||""} onChange={e=>PF({saida_almoco:e.target.value})}/><Inp label="Retorno Almoço" type="time" value={pontoForm.retorno_almoco||""} onChange={e=>PF({retorno_almoco:e.target.value})}/>
        <Inp label="Horas Extras" type="number" step="0.5" value={pontoForm.horas_extras||0} onChange={e=>PF({horas_extras:e.target.value})}/><Inp label="Ocorrência" value={pontoForm.ocorrencia||""} onChange={e=>PF({ocorrencia:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={savePonto} saving={saving} label="Registrar"/>
    </Modal>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PCP AVANÇADO — Plano Mestre (MPS), MRP, Capacidade Planejada
// ═══════════════════════════════════════════════════════════════════════════

function ViewPCP({ showToast }) {
  const { data: produtos, loading: l1, error: e1, reload: r1 } = useTable("produtos");
  const { data: mps, reload: reloadMps } = useTable("plano_mestre");
  const { data: capacidade, reload: reloadCap } = useTable("capacidade_planejada");
  const { data: estrutura } = useTable("estrutura_produto");
  const { data: estoqueMp } = useTable("estoque_mp");

  const [tab, setTab] = useState("mps");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const F = v => setForm(f => ({ ...f, ...v }));

  if (l1) return <Spinner />;
  if (e1) return <ErrBox msg={e1} onRetry={r1} />;

  // ── MRP calculado dinamicamente a partir do MPS + estrutura ──────────────
  const mrpCalculado = mps.flatMap(plano => {
    const prod = produtos.find(p => p.id === plano.produto_id);
    if (!prod) return [];
    const comps = estrutura.filter(e => e.produto_pai_id === prod.id);
    return comps.map(c => {
      const mp = estoqueMp.find(e => e.codigo === c.componente_codigo);
      const necessidadeBruta = plano.producao_planejada * c.quantidade;
      const disponivel = mp?.saldo || 0;
      const necessidadeLiquida = Math.max(0, necessidadeBruta - disponivel);
      return {
        id: `${plano.id}-${c.componente_codigo}`,
        produto: prod.descricao,
        periodo: plano.periodo,
        mp_codigo: c.componente_codigo,
        mp_descricao: mp?.descricao || c.componente_codigo,
        unidade: c.unidade,
        necessidade_bruta: necessidadeBruta,
        disponivel,
        necessidade_liquida: necessidadeLiquida,
        critico: necessidadeLiquida > 0 && (mp?.saldo || 0) <= (mp?.minimo || 0),
      };
    });
  });

  const totalNecessidadesCriticas = mrpCalculado.filter(m => m.necessidade_liquida > 0).length;

  async function saveMps() {
    if (!form.produto_id || !form.periodo) return showToast("Preencha produto e período", "error");
    setSaving(true);
    const estoqueInicial = Number(form.estoque_inicial || 0);
    const producao = Number(form.producao_planejada || 0);
    const demanda = Number(form.demanda_prevista || 0);
    const { error: e } = await dbIns("plano_mestre", {
      ...form,
      produto_id: Number(form.produto_id),
      demanda_prevista: demanda,
      estoque_inicial: estoqueInicial,
      producao_planejada: producao,
      estoque_final: estoqueInicial + producao - demanda,
    });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Plano criado", "success"), await reloadMps());
    setSaving(false);
    setModal(null);
  }

  async function saveCapacidade() {
    if (!form.centro || !form.periodo) return showToast("Preencha centro e período", "error");
    setSaving(true);
    const { error: e } = await dbIns("capacidade_planejada", {
      ...form,
      capacidade_disponivel: Number(form.capacidade_disponivel || 0),
      demanda_calculada: Number(form.demanda_calculada || 0),
    });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Capacidade registrada", "success"), await reloadCap());
    setSaving(false);
    setModal(null);
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
      <KCard label="Produtos Cadastrados" value={produtos.length} color={C.text} icon="📦" />
      <KCard label="Planos MPS Ativos" value={mps.length} color={C.accent} icon="📅" />
      <KCard label="Itens MRP Críticos" value={totalNecessidadesCriticas} color={totalNecessidadesCriticas > 0 ? C.red : C.green} icon="⚠️" bg={totalNecessidadesCriticas > 0 ? C.redLight : C.surface} />
      <KCard label="Centros Monitorados" value={[...new Set(capacidade.map(c => c.centro))].length} color={C.text} icon="🏭" />
    </div>

    <Tabs tabs={[
      { key: "mps", label: "Plano Mestre (MPS)" },
      { key: "mrp", label: "MRP — Necessidades" },
      { key: "capacidade", label: "Capacidade Planejada" },
      { key: "produtos", label: "Produtos & BOM" },
    ]} active={tab} onChange={setTab} />

    {/* ── PLANO MESTRE ─────────────────────────────────────────────── */}
    {tab === "mps" && <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={() => { setForm({ origem: "previsao", estoque_inicial: 0, demanda_prevista: 0, producao_planejada: 0 }); setModal("mps"); }}>+ Novo Plano</Btn>
      </div>
      <Section title="Planejamento Agregado de Produção" action={<ExportBtns filename="plano-mestre-mps" title="Plano Mestre de Produção" columns={[
        {label:"Produto",get:m=>produtos.find(p=>p.id===m.produto_id)?.descricao||"—"},{label:"Período",get:m=>fmtD(m.periodo)},
        {label:"Demanda Prevista",get:m=>m.demanda_prevista},{label:"Estoque Inicial",get:m=>m.estoque_inicial},
        {label:"Produção Planejada",get:m=>m.producao_planejada},{label:"Estoque Final",get:m=>m.estoque_final},
        {label:"Origem",get:m=>m.origem==="pedido_firme"?"Pedido Firme":"Previsão"},
      ]} rows={mps}/>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
            <thead><tr><Th>Produto</Th><Th>Período</Th><Th>Demanda Prevista</Th><Th>Estoque Inicial</Th><Th>Produção Planejada</Th><Th>Estoque Final</Th><Th>Origem</Th></tr></thead>
            <tbody>
              {mps.map((m, i) => {
                const prod = produtos.find(p => p.id === m.produto_id);
                const critico = m.estoque_final < 0;
                return <tr key={m.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
                  <Td style={{ fontWeight: 700 }}>{prod?.descricao || "—"}</Td>
                  <Td style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(m.periodo)}</Td>
                  <Td>{fmt(m.demanda_prevista)}</Td>
                  <Td style={{ color: C.muted }}>{fmt(m.estoque_inicial)}</Td>
                  <Td style={{ fontWeight: 700, color: C.accent }}>{fmt(m.producao_planejada)}</Td>
                  <Td><span style={{ fontWeight: 800, color: critico ? C.red : C.green }}>{fmt(m.estoque_final)}</span></Td>
                  <Td><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: m.origem === "pedido_firme" ? C.green : C.purple, background: m.origem === "pedido_firme" ? C.greenLight : C.purpleLight }}>{m.origem === "pedido_firme" ? "Pedido Firme" : "Previsão"}</span></Td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>}

    {/* ── MRP ──────────────────────────────────────────────────────── */}
    {tab === "mrp" && <>
      <div style={{ background: C.accentLight, border: `1px solid ${C.accentMid}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.text }}>
        📐 Necessidades calculadas automaticamente: <strong>Plano Mestre × Estrutura do Produto (BOM)</strong>, comparado ao estoque atual de matéria-prima.
      </div>
      <Section title={`${mrpCalculado.length} necessidades calculadas`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead><tr><Th>Produto</Th><Th>Período</Th><Th>Matéria-Prima</Th><Th>Necessidade Bruta</Th><Th>Disponível</Th><Th>Necessidade Líquida</Th><Th>Status</Th></tr></thead>
            <tbody>
              {mrpCalculado.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: C.muted }}>Cadastre planos MPS e estrutura de produto para calcular o MRP</td></tr>}
              {mrpCalculado.map((m, i) => <tr key={m.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
                <Td style={{ fontWeight: 700 }}>{m.produto}</Td>
                <Td style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(m.periodo)}</Td>
                <Td>{m.mp_descricao} <span style={{ fontSize: 11, color: C.muted }}>({m.mp_codigo})</span></Td>
                <Td>{fmt(m.necessidade_bruta.toFixed(1))} {m.unidade}</Td>
                <Td style={{ color: C.muted }}>{fmt(m.disponivel)} {m.unidade}</Td>
                <Td><span style={{ fontWeight: 800, color: m.necessidade_liquida > 0 ? C.red : C.green }}>{fmt(m.necessidade_liquida.toFixed(1))} {m.unidade}</span></Td>
                <Td>{m.critico
                  ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: C.red, background: C.redLight }}>🔴 Comprar urgente</span>
                  : m.necessidade_liquida > 0
                    ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: C.amber, background: C.amberLight }}>🟡 Requisitar</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: C.green, background: C.greenLight }}>✅ Atendido</span>}
                </Td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Section>
    </>}

    {/* ── CAPACIDADE ───────────────────────────────────────────────── */}
    {tab === "capacidade" && <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={() => { setForm({}); setModal("capacidade"); }}>+ Novo Registro</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {capacidade.map(c => {
          const pct = c.capacidade_disponivel > 0 ? Math.round((c.demanda_calculada / c.capacidade_disponivel) * 100) : 0;
          const col = pct >= 100 ? C.red : pct >= 85 ? C.amber : C.green;
          const folga = c.capacidade_disponivel - c.demanda_calculada;
          return <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div><div style={{ fontWeight: 800 }}>{c.centro}</div><div style={{ fontSize: 12, color: C.muted }}>{fmtD(c.periodo)}</div></div>
              <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{pct}%</div>
            </div>
            <MiniBar val={pct} max={100} color={col} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
              <span style={{ color: C.muted }}>Capacidade: <b style={{ color: C.text }}>{c.capacidade_disponivel}h</b></span>
              <span style={{ color: C.muted }}>Demanda: <b style={{ color: C.text }}>{c.demanda_calculada}h</b></span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: folga >= 0 ? C.green : C.red }}>
              {folga >= 0 ? `✅ Folga de ${folga}h` : `⚠️ Sobrecarga de ${Math.abs(folga)}h`}
            </div>
          </div>;
        })}
      </div>
    </>}

    {/* ── PRODUTOS & BOM ───────────────────────────────────────────── */}
    {tab === "produtos" && <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={() => { setForm({ tipo: "acabado", unidade: "UN", ativo: true }); setModal("produto"); }}>+ Novo Produto</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {produtos.map(p => {
          const comps = estrutura.filter(e => e.produto_pai_id === p.id);
          return <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{p.codigo} — {p.descricao}</div>
                <div style={{ fontSize: 12, color: C.muted }}>Lead time: {p.lead_time_dias} dias · Estoque segurança: {p.estoque_seguranca} {p.unidade}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: C.green }}>{fmtR(p.preco_venda)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>custo: {fmtR(p.custo_padrao)}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Estrutura (BOM)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {comps.length === 0 && <span style={{ fontSize: 12, color: C.faint }}>Sem componentes cadastrados</span>}
              {comps.map(c => <span key={c.id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: C.bg, border: `1px solid ${C.border}` }}>{c.quantidade} {c.unidade} de {c.componente_codigo}</span>)}
            </div>
          </div>;
        })}
      </div>
    </>}

    {modal === "mps" && <Modal title="Novo Plano Mestre" onClose={() => setModal(null)}>
      <G2>
        <Full><Sel label="Produto" value={form.produto_id || ""} onChange={e => F({ produto_id: e.target.value })}>
          <option value="">Selecione...</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
        </Sel></Full>
        <Inp label="Período (início da semana)" type="date" value={form.periodo || ""} onChange={e => F({ periodo: e.target.value })} />
        <Sel label="Origem" value={form.origem || "previsao"} onChange={e => F({ origem: e.target.value })}>
          <option value="previsao">Previsão de Demanda</option><option value="pedido_firme">Pedido Firme</option>
        </Sel>
        <Inp label="Demanda Prevista" type="number" value={form.demanda_prevista || 0} onChange={e => F({ demanda_prevista: e.target.value })} />
        <Inp label="Estoque Inicial" type="number" value={form.estoque_inicial || 0} onChange={e => F({ estoque_inicial: e.target.value })} />
        <Inp label="Produção Planejada" type="number" value={form.producao_planejada || 0} onChange={e => F({ producao_planejada: e.target.value })} />
      </G2>
      <MFoot onCancel={() => setModal(null)} onSave={saveMps} saving={saving} label="Criar Plano" />
    </Modal>}

    {modal === "capacidade" && <Modal title="Novo Registro de Capacidade" onClose={() => setModal(null)}>
      <G2>
        <Inp label="Centro de Trabalho" value={form.centro || ""} onChange={e => F({ centro: e.target.value })} />
        <Inp label="Período" type="date" value={form.periodo || ""} onChange={e => F({ periodo: e.target.value })} />
        <Inp label="Capacidade Disponível (h)" type="number" value={form.capacidade_disponivel || 0} onChange={e => F({ capacidade_disponivel: e.target.value })} />
        <Inp label="Demanda Calculada (h)" type="number" value={form.demanda_calculada || 0} onChange={e => F({ demanda_calculada: e.target.value })} />
      </G2>
      <MFoot onCancel={() => setModal(null)} onSave={saveCapacidade} saving={saving} label="Registrar" />
    </Modal>}

    {modal === "produto" && <Modal title="Novo Produto" onClose={() => setModal(null)}>
      <G2>
        <Inp label="Código" value={form.codigo || ""} onChange={e => F({ codigo: e.target.value })} />
        <Sel label="Tipo" value={form.tipo} onChange={e => F({ tipo: e.target.value })}>
          <option value="acabado">Produto Acabado</option><option value="semiacabado">Semiacabado</option><option value="materia_prima">Matéria-Prima</option>
        </Sel>
        <Full><Inp label="Descrição" value={form.descricao || ""} onChange={e => F({ descricao: e.target.value })} /></Full>
        <Inp label="Unidade" value={form.unidade || "UN"} onChange={e => F({ unidade: e.target.value })} />
        <Inp label="Lead Time (dias)" type="number" value={form.lead_time_dias || 1} onChange={e => F({ lead_time_dias: e.target.value })} />
        <Inp label="Preço de Venda (R$)" type="number" step="0.01" value={form.preco_venda || 0} onChange={e => F({ preco_venda: e.target.value })} />
        <Inp label="Custo Padrão (R$)" type="number" step="0.01" value={form.custo_padrao || 0} onChange={e => F({ custo_padrao: e.target.value })} />
        <Inp label="Estoque de Segurança" type="number" value={form.estoque_seguranca || 0} onChange={e => F({ estoque_seguranca: e.target.value })} />
      </G2>
      <MFoot onCancel={() => setModal(null)} onSave={async () => {
        if (!form.codigo || !form.descricao) return showToast("Preencha código e descrição", "error");
        setSaving(true);
        const { error: e } = await dbIns("produtos", { ...form, preco_venda: Number(form.preco_venda || 0), custo_padrao: Number(form.custo_padrao || 0), lead_time_dias: Number(form.lead_time_dias || 1), estoque_seguranca: Number(form.estoque_seguranca || 0) });
        e ? showToast("Erro: " + e.message, "error") : (showToast("Produto criado", "success"), await r1());
        setSaving(false); setModal(null);
      }} saving={saving} label="Criar Produto" />
    </Modal>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// VENDAS E EXPEDIÇÃO — Orçamentos, Pedidos de Venda, Expedição, Carteira
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_ORCAMENTO = {
  aberto: { label: "Aberto", color: C.amber, bg: C.amberLight },
  aprovado: { label: "Aprovado", color: C.green, bg: C.greenLight },
  recusado: { label: "Recusado", color: C.red, bg: C.redLight },
  expirado: { label: "Expirado", color: C.muted, bg: "#F3F4F6" },
  convertido: { label: "Convertido", color: C.purple, bg: C.purpleLight },
};
const STATUS_PEDIDO = {
  novo: { label: "Novo", color: C.purple, bg: C.purpleLight },
  em_producao: { label: "Em Produção", color: C.accent, bg: C.accentLight },
  pronto_expedicao: { label: "Pronto p/ Expedição", color: C.teal, bg: C.tealLight },
  faturado: { label: "Faturado", color: C.green, bg: C.greenLight },
  entregue: { label: "Entregue", color: C.green, bg: C.greenLight },
  cancelado: { label: "Cancelado", color: C.red, bg: C.redLight },
};
const STATUS_EXPED = {
  aguardando: { label: "Aguardando", color: C.muted, bg: "#F3F4F6" },
  separado: { label: "Separado", color: C.amber, bg: C.amberLight },
  expedido: { label: "Expedido", color: C.accent, bg: C.accentLight },
  entregue: { label: "Entregue", color: C.green, bg: C.greenLight },
  devolvido: { label: "Devolvido", color: C.red, bg: C.redLight },
};

function ViewVendas({ showToast }) {
  const { data: orcamentos, loading: l1, error: e1, reload: rOrc } = useTable("orcamentos");
  const { data: pedidos, reload: rPed } = useTable("pedidos_venda");
  const { data: expedicoes, reload: rExp } = useTable("expedicoes");
  const { data: clientes } = useTable("clientes");
  const { data: produtos } = useTable("produtos");

  const [tab, setTab] = useState("pedidos");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [itens, setItens] = useState([{ produto: "", qtd: 1, valor_unit: 0 }]);
  const [saving, setSaving] = useState(false);
  const F = v => setForm(f => ({ ...f, ...v }));

  if (l1) return <Spinner />;
  if (e1) return <ErrBox msg={e1} onRetry={rOrc} />;

  const totalCarteira = pedidos.filter(p => !["faturado", "entregue", "cancelado"].includes(p.status)).reduce((s, p) => s + p.valor_total, 0);
  const pedidosAtivos = pedidos.filter(p => !["entregue", "cancelado"].includes(p.status)).length;
  const orcamentosAbertos = orcamentos.filter(o => o.status === "aberto").length;
  const taxaConversao = orcamentos.length > 0 ? Math.round((orcamentos.filter(o => o.status === "convertido" || o.status === "aprovado").length / orcamentos.length) * 100) : 0;

  function addItem() { setItens(p => [...p, { produto: "", qtd: 1, valor_unit: 0 }]); }
  function removeItem(i) { setItens(p => p.filter((_, idx) => idx !== i)); }
  function updateItem(i, field, val) { setItens(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it)); }
  const totalItens = itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor_unit) || 0), 0);

  function openNewOrcamento() {
    setForm({ status: "aberto", validade: "" });
    setItens([{ produto: "", qtd: 1, valor_unit: 0 }]);
    setModal("orcamento");
  }
  function openNewPedido() {
    setForm({ status: "novo", data_pedido: TODAY, vendedor: "" });
    setItens([{ produto: "", qtd: 1, valor_unit: 0 }]);
    setModal("pedido");
  }
  function openNewExpedicao(pedido) {
    setForm({ pedido_id: pedido.id, status: "aguardando", numero_romaneio: `ROM-${String(expedicoes.length + 1).padStart(4, "0")}` });
    setModal("expedicao");
  }

  async function saveOrcamento() {
    if (!form.cliente_id) return showToast("Selecione o cliente", "error");
    setSaving(true);
    const { error: e } = await dbIns("orcamentos", {
      ...form,
      cliente_id: Number(form.cliente_id),
      numero: `ORC-${new Date().getFullYear()}-${String(orcamentos.length + 1).padStart(3, "0")}`,
      itens: itens.map(it => ({ produto: it.produto, qtd: Number(it.qtd), valor_unit: Number(it.valor_unit) })),
      valor_total: totalItens,
    });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Orçamento criado", "success"), await rOrc());
    setSaving(false); setModal(null);
  }

  async function saveCotacaoPedido() {
    if (!form.cliente_id) return showToast("Selecione o cliente", "error");
    setSaving(true);
    const { error: e } = await dbIns("pedidos_venda", {
      ...form,
      cliente_id: Number(form.cliente_id),
      numero: `PV-${new Date().getFullYear()}-${String(pedidos.length + 1).padStart(3, "0")}`,
      itens: itens.map(it => ({ produto: it.produto, qtd: Number(it.qtd), valor_unit: Number(it.valor_unit) })),
      valor_total: totalItens,
    });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Pedido criado", "success"), await rPed());
    setSaving(false); setModal(null);
  }

  async function saveExpedicao() {
    setSaving(true);
    const { error: e } = await dbIns("expedicoes", { ...form, pedido_id: Number(form.pedido_id) });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Expedição registrada", "success"), await rExp());
    setSaving(false); setModal(null);
  }

  async function avancarStatusPedido(pedido, novoStatus) {
    await dbUpd("pedidos_venda", pedido.id, { status: novoStatus });
    showToast("Status atualizado", "success");
    rPed();
  }
  async function avancarStatusExpedicao(exp, novoStatus) {
    await dbUpd("expedicoes", exp.id, { status: novoStatus, data_entrega_real: novoStatus === "entregue" ? TODAY : null });
    showToast("Status atualizado", "success");
    rExp();
  }
  async function converterOrcamento(orc) {
    if (!confirm(`Converter ${orc.numero} em Pedido de Venda?`)) return;
    setSaving(true);
    await dbIns("pedidos_venda", {
      cliente_id: orc.cliente_id,
      orcamento_id: orc.id,
      numero: `PV-${new Date().getFullYear()}-${String(pedidos.length + 1).padStart(3, "0")}`,
      data_pedido: TODAY,
      status: "novo",
      itens: orc.itens,
      valor_total: orc.valor_total,
    });
    await dbUpd("orcamentos", orc.id, { status: "convertido" });
    showToast("Orçamento convertido em pedido", "success");
    await rOrc(); await rPed();
    setSaving(false);
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
      <KCard label="Carteira de Pedidos" value={fmtR(totalCarteira)} sub={`${pedidosAtivos} pedidos ativos`} color={C.accent} icon="📦" />
      <KCard label="Orçamentos Abertos" value={orcamentosAbertos} color={C.amber} icon="📝" />
      <KCard label="Taxa de Conversão" value={`${taxaConversao}%`} color={taxaConversao > 50 ? C.green : C.amber} icon="📈" />
      <KCard label="Clientes na Carteira" value={[...new Set(pedidos.map(p => p.cliente_id))].length} color={C.text} icon="🏢" />
    </div>

    <Tabs tabs={[
      { key: "pedidos", label: "Pedidos de Venda" },
      { key: "orcamentos", label: "Orçamentos" },
      { key: "expedicao", label: "Expedição" },
      { key: "carteira", label: "Carteira de Clientes" },
    ]} active={tab} onChange={setTab} />

    {/* ── PEDIDOS DE VENDA ─────────────────────────────────────────── */}
    {tab === "pedidos" && <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={openNewPedido}>+ Novo Pedido</Btn></div>
      <Section title={`${pedidos.length} pedidos`} action={<ExportBtns filename="pedidos-venda" title="Pedidos de Venda" columns={[
        {label:"Número",get:p=>p.numero},{label:"Cliente",get:p=>clientes.find(c=>c.id===p.cliente_id)?.razao_social||"—"},
        {label:"Valor",get:p=>fmtR(p.valor_total)},{label:"Entrega Prevista",get:p=>fmtD(p.data_entrega_prevista)},
        {label:"Status",get:p=>(STATUS_PEDIDO[p.status]||{label:p.status}).label},{label:"Vendedor",get:p=>p.vendedor||"—"},
      ]} rows={pedidos}/>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead><tr><Th>Número</Th><Th>Cliente</Th><Th>Valor</Th><Th>Entrega Prevista</Th><Th>Status</Th><Th>Vendedor</Th><Th></Th></tr></thead>
            <tbody>
              {pedidos.map((p, i) => {
                const cliente = clientes.find(c => c.id === p.cliente_id);
                const s = STATUS_PEDIDO[p.status] || { label: p.status, color: C.muted, bg: "#F3F4F6" };
                const proximoStatus = { novo: "em_producao", em_producao: "pronto_expedicao", pronto_expedicao: "faturado", faturado: "entregue" }[p.status];
                return <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
                  <Td><span style={{ fontWeight: 800, color: C.accent }}>{p.numero}</span></Td>
                  <Td style={{ fontWeight: 600 }}>{cliente?.razao_social || "—"}</Td>
                  <Td style={{ fontWeight: 700 }}>{fmtR(p.valor_total)}</Td>
                  <Td style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(p.data_entrega_prevista)}</Td>
                  <Td><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: s.color, background: s.bg }}>{s.label}</span></Td>
                  <Td style={{ color: C.muted }}>{p.vendedor || "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {proximoStatus && <Btn size="sm" variant="success" onClick={() => avancarStatusPedido(p, proximoStatus)}>Avançar</Btn>}
                      {p.status === "pronto_expedicao" && <Btn size="sm" variant="teal" onClick={() => openNewExpedicao(p)}>Expedir</Btn>}
                    </div>
                  </Td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>}

    {/* ── ORÇAMENTOS ───────────────────────────────────────────────── */}
    {tab === "orcamentos" && <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={openNewOrcamento}>+ Novo Orçamento</Btn></div>
      <Section title={`${orcamentos.length} orçamentos`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
            <thead><tr><Th>Número</Th><Th>Cliente</Th><Th>Valor</Th><Th>Validade</Th><Th>Status</Th><Th></Th></tr></thead>
            <tbody>
              {orcamentos.map((o, i) => {
                const cliente = clientes.find(c => c.id === o.cliente_id);
                const s = STATUS_ORCAMENTO[o.status] || { label: o.status, color: C.muted, bg: "#F3F4F6" };
                return <tr key={o.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
                  <Td><span style={{ fontWeight: 800, color: C.accent }}>{o.numero}</span></Td>
                  <Td style={{ fontWeight: 600 }}>{cliente?.razao_social || "—"}</Td>
                  <Td style={{ fontWeight: 700 }}>{fmtR(o.valor_total)}</Td>
                  <Td style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(o.validade)}</Td>
                  <Td><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: s.color, background: s.bg }}>{s.label}</span></Td>
                  <Td>
                    {(o.status === "aberto" || o.status === "aprovado") && <Btn size="sm" variant="success" onClick={() => converterOrcamento(o)}>Converter em Pedido</Btn>}
                  </Td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>}

    {/* ── EXPEDIÇÃO ────────────────────────────────────────────────── */}
    {tab === "expedicao" && <Section title={`${expedicoes.length} expedições`}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
          <thead><tr><Th>Romaneio</Th><Th>Pedido</Th><Th>Transportadora</Th><Th>Saída</Th><Th>Status</Th><Th>Rastreio</Th><Th></Th></tr></thead>
          <tbody>
            {expedicoes.map((ex, i) => {
              const pedido = pedidos.find(p => p.id === ex.pedido_id);
              const s = STATUS_EXPED[ex.status] || { label: ex.status, color: C.muted, bg: "#F3F4F6" };
              const proximoStatus = { aguardando: "separado", separado: "expedido", expedido: "entregue" }[ex.status];
              return <tr key={ex.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
                <Td><span style={{ fontWeight: 700, color: C.accent }}>{ex.numero_romaneio}</span></Td>
                <Td style={{ fontWeight: 600 }}>{pedido?.numero || "—"}</Td>
                <Td style={{ color: C.muted }}>{ex.transportadora}</Td>
                <Td style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(ex.data_saida)}</Td>
                <Td><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: s.color, background: s.bg }}>{s.label}</span></Td>
                <Td style={{ color: C.muted, fontSize: 12 }}>{ex.rastreio || "—"}</Td>
                <Td>{proximoStatus && <Btn size="sm" variant="success" onClick={() => avancarStatusExpedicao(ex, proximoStatus)}>Avançar</Btn>}</Td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Section>}

    {/* ── CARTEIRA DE CLIENTES ─────────────────────────────────────── */}
    {tab === "carteira" && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {clientes.map(c => {
        const pedidosCliente = pedidos.filter(p => p.cliente_id === c.id);
        const totalComprado = pedidosCliente.filter(p => ["faturado", "entregue"].includes(p.status)).reduce((s, p) => s + p.valor_total, 0);
        const emCarteira = pedidosCliente.filter(p => !["faturado", "entregue", "cancelado"].includes(p.status)).reduce((s, p) => s + p.valor_total, 0);
        return <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{c.razao_social}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{c.cnpj_cpf} · {pedidosCliente.length} pedido(s) no histórico</div>
          </div>
          <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
            <div><div style={{ fontSize: 11, color: C.muted }}>Total Faturado</div><div style={{ fontWeight: 800, color: C.green }}>{fmtR(totalComprado)}</div></div>
            <div><div style={{ fontSize: 11, color: C.muted }}>Em Carteira</div><div style={{ fontWeight: 800, color: C.accent }}>{fmtR(emCarteira)}</div></div>
          </div>
        </div>;
      })}
    </div>}

    {/* ── MODAIS ───────────────────────────────────────────────────── */}
    {(modal === "orcamento" || modal === "pedido") && <Modal title={modal === "orcamento" ? "Novo Orçamento" : "Novo Pedido de Venda"} onClose={() => setModal(null)} width={700}>
      <G2>
        <Full><Sel label="Cliente" value={form.cliente_id || ""} onChange={e => F({ cliente_id: e.target.value })}>
          <option value="">Selecione...</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
        </Sel></Full>
        {modal === "orcamento" && <Inp label="Validade" type="date" value={form.validade || ""} onChange={e => F({ validade: e.target.value })} />}
        {modal === "pedido" && <Inp label="Entrega Prevista" type="date" value={form.data_entrega_prevista || ""} onChange={e => F({ data_entrega_prevista: e.target.value })} />}
        {modal === "pedido" && <Inp label="Vendedor" value={form.vendedor || ""} onChange={e => F({ vendedor: e.target.value })} />}
      </G2>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Itens</span>
          <Btn size="sm" variant="ghost" onClick={addItem}>+ Item</Btn>
        </div>
        {itens.map((it, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <Sel label="Produto" value={it.produto} onChange={e => updateItem(i, "produto", e.target.value)}>
            <option value="">Selecione...</option>
            {produtos.map(p => <option key={p.id} value={p.descricao}>{p.descricao}</option>)}
          </Sel>
          <Inp label="Qtd" type="number" value={it.qtd} onChange={e => updateItem(i, "qtd", e.target.value)} />
          <Inp label="Valor Unit." type="number" step="0.01" value={it.valor_unit} onChange={e => updateItem(i, "valor_unit", e.target.value)} />
          <Btn size="sm" variant="danger" onClick={() => removeItem(i)}>✕</Btn>
        </div>)}
        <div style={{ textAlign: "right", fontWeight: 800, fontSize: 16, marginTop: 8 }}>Total: {fmtR(totalItens)}</div>
      </div>
      <MFoot onCancel={() => setModal(null)} onSave={modal === "orcamento" ? saveOrcamento : saveCotacaoPedido} saving={saving} label="Criar" />
    </Modal>}

    {modal === "expedicao" && <Modal title="Registrar Expedição" onClose={() => setModal(null)}>
      <G2>
        <Inp label="Romaneio" value={form.numero_romaneio || ""} onChange={e => F({ numero_romaneio: e.target.value })} />
        <Inp label="Transportadora" value={form.transportadora || ""} onChange={e => F({ transportadora: e.target.value })} />
        <Inp label="Data de Saída" type="date" value={form.data_saida || TODAY} onChange={e => F({ data_saida: e.target.value })} />
        <Inp label="Rastreio (opcional)" value={form.rastreio || ""} onChange={e => F({ rastreio: e.target.value })} />
      </G2>
      <MFoot onCancel={() => setModal(null)} onSave={saveExpedicao} saving={saving} label="Registrar" />
    </Modal>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARGEM DE CONTRIBUIÇÃO — Lucratividade por Produto
// ═══════════════════════════════════════════════════════════════════════════

function ViewMargemContribuicao({ showToast }) {
  const { data: margens, loading, error, reload } = useTable("margem_produto");
  const { data: produtos } = useTable("produtos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const F = v => setForm(f => ({ ...f, ...v }));

  if (loading) return <Spinner />;
  if (error) return <ErrBox msg={error} onRetry={reload} />;

  const dados = margens.map(m => {
    const prod = produtos.find(p => p.id === m.produto_id);
    return { ...m, produto: prod?.descricao || "—", codigo: prod?.codigo || "—" };
  }).sort((a, b) => b.margem_contribuicao - a.margem_contribuicao);

  const margemMedia = dados.length ? dados.reduce((s, d) => s + d.margem_percentual, 0) / dados.length : 0;
  const totalContribuicao = dados.reduce((s, d) => s + d.margem_contribuicao * d.unidades_vendidas, 0);
  const produtoMaisLucrativo = dados[0];
  const produtoMenosLucrativo = dados[dados.length - 1];

  async function save() {
    if (!form.produto_id || !form.preco_venda) return showToast("Preencha produto e preço de venda", "error");
    setSaving(true);
    const { error: e } = await dbIns("margem_produto", {
      ...form,
      produto_id: Number(form.produto_id),
      preco_venda: Number(form.preco_venda),
      custo_variavel: Number(form.custo_variavel || 0),
      custo_fixo_rateado: Number(form.custo_fixo_rateado || 0),
      unidades_vendidas: Number(form.unidades_vendidas || 0),
    });
    e ? showToast("Erro: " + e.message, "error") : (showToast("Registro criado", "success"), await reload());
    setSaving(false);
    setModal(false);
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
      <KCard label="Margem Média" value={`${margemMedia.toFixed(1)}%`} color={margemMedia > 30 ? C.green : C.amber} icon="📊" />
      <KCard label="Contribuição Total" value={fmtR(totalContribuicao)} color={C.text} icon="💰" />
      <KCard label="Mais Lucrativo" value={produtoMaisLucrativo?.codigo || "—"} sub={produtoMaisLucrativo ? `${produtoMaisLucrativo.margem_percentual.toFixed(0)}% margem` : ""} color={C.green} icon="🏆" />
      <KCard label="Menos Lucrativo" value={produtoMenosLucrativo?.codigo || "—"} sub={produtoMenosLucrativo ? `${produtoMenosLucrativo.margem_percentual.toFixed(0)}% margem` : ""} color={C.amber} icon="⚠️" />
    </div>

    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <Btn onClick={() => { setForm({}); setModal(true); }}>+ Novo Registro</Btn>
    </div>

    <Section title="Margem de Contribuição por Produto" action={<ExportBtns filename="margem-contribuicao" title="Margem de Contribuição por Produto" columns={[
      {label:"Produto",get:d=>d.produto},{label:"Preço Venda",get:d=>fmtR(d.preco_venda)},{label:"Custo Variável",get:d=>fmtR(d.custo_variavel)},
      {label:"Custo Fixo",get:d=>fmtR(d.custo_fixo_rateado)},{label:"Margem (R$)",get:d=>fmtR(d.margem_contribuicao)},
      {label:"Margem (%)",get:d=>`${d.margem_percentual.toFixed(1)}%`},{label:"Unid. Vendidas",get:d=>d.unidades_vendidas},
      {label:"Contribuição Total",get:d=>fmtR(d.margem_contribuicao*d.unidades_vendidas)},
    ]} rows={dados}/>}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
          <thead><tr><Th>Produto</Th><Th>Preço Venda</Th><Th>Custo Variável</Th><Th>Custo Fixo Rat.</Th><Th>Margem (R$)</Th><Th>Margem (%)</Th><Th>Unid. Vendidas</Th><Th>Contribuição Total</Th></tr></thead>
          <tbody>
            {dados.map((d, i) => <tr key={d.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.surface }}>
              <Td style={{ fontWeight: 700 }}>{d.produto}</Td>
              <Td>{fmtR(d.preco_venda)}</Td>
              <Td style={{ color: C.muted }}>{fmtR(d.custo_variavel)}</Td>
              <Td style={{ color: C.muted }}>{fmtR(d.custo_fixo_rateado)}</Td>
              <Td style={{ fontWeight: 800, color: d.margem_contribuicao > 0 ? C.green : C.red }}>{fmtR(d.margem_contribuicao)}</Td>
              <Td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: d.margem_percentual > 30 ? C.green : d.margem_percentual > 15 ? C.amber : C.red, minWidth: 42 }}>{d.margem_percentual.toFixed(1)}%</span>
                  <MiniBar val={d.margem_percentual} max={60} color={d.margem_percentual > 30 ? C.green : d.margem_percentual > 15 ? C.amber : C.red} h={6} />
                </div>
              </Td>
              <Td style={{ color: C.muted }}>{fmt(d.unidades_vendidas)}</Td>
              <Td style={{ fontWeight: 800 }}>{fmtR(d.margem_contribuicao * d.unidades_vendidas)}</Td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Section>

    <Section title="Ranking de Lucratividade (Pareto)">
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {dados.map(d => <div key={d.id}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{d.produto}</span>
            <span style={{ fontWeight: 700, color: C.accent }}>{fmtR(d.margem_contribuicao * d.unidades_vendidas)}</span>
          </div>
          <MiniBar val={d.margem_contribuicao * d.unidades_vendidas} max={Math.max(...dados.map(x => x.margem_contribuicao * x.unidades_vendidas), 1)} color={C.accent} />
        </div>)}
      </div>
    </Section>

    {modal && <Modal title="Novo Registro de Margem" onClose={() => setModal(false)}>
      <G2>
        <Full><Sel label="Produto" value={form.produto_id || ""} onChange={e => F({ produto_id: e.target.value })}>
          <option value="">Selecione...</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
        </Sel></Full>
        <Inp label="Preço de Venda (R$)" type="number" step="0.01" value={form.preco_venda || ""} onChange={e => F({ preco_venda: e.target.value })} />
        <Inp label="Custo Variável (R$)" type="number" step="0.01" value={form.custo_variavel || ""} onChange={e => F({ custo_variavel: e.target.value })} />
        <Inp label="Custo Fixo Rateado (R$)" type="number" step="0.01" value={form.custo_fixo_rateado || ""} onChange={e => F({ custo_fixo_rateado: e.target.value })} />
        <Inp label="Unidades Vendidas (período)" type="number" value={form.unidades_vendidas || ""} onChange={e => F({ unidades_vendidas: e.target.value })} />
      </G2>
      <MFoot onCancel={() => setModal(false)} onSave={save} saving={saving} label="Registrar" />
    </Modal>}
  </div>;
}

// ── USUÁRIOS ─────────────────────────────────────────────────────────────────
function ViewUsuarios({user,setUser,showToast}) {
  const {data:users,loading,error,reload}=useTable("usuarios")
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({cargo:"Operador"})
  const [saving,setSaving]=useState(false)
  const F=v=>setForm(f=>({...f,...v}))
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>
  async function save(){if(!form.nome||!form.email)return showToast("Preencha nome e email","error");setSaving(true);const{error:e}=await dbIns("usuarios",{...form,avatar:form.nome.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()});e?showToast("Erro: "+e.message,"error"):(showToast("Criado","success"),await reload());setSaving(false);setModal(false)}
  async function del(u){if(u.id===user?.id)return showToast("Não é possível excluir o usuário atual","error");if(!confirm("Remover?"))return;await dbDel("usuarios",u.id);reload()}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {user&&<div style={{background:`linear-gradient(135deg,${C.navy},${C.accent})`,borderRadius:12,padding:"16px 22px",color:"#fff",display:"flex",gap:14,alignItems:"center"}}>
      <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800}}>{user.avatar}</div>
      <div><div style={{fontSize:15,fontWeight:800}}>{user.nome}</div><div style={{fontSize:13,opacity:.8}}>{user.cargo} · {user.email}</div></div>
    </div>}
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setModal(true)}>+ Novo Usuário</Btn></div>
    <Section title={`${users.length} usuários`}><div style={{display:"flex",flexDirection:"column"}}>
      {users.map((u,i)=><div key={u.id} style={{display:"flex",gap:12,alignItems:"center",padding:"13px 20px",borderTop:i>0?`1px solid ${C.border}`:"none",background:u.id===user?.id?C.accentLight:"transparent"}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:u.id===user?.id?C.accent:C.border,color:u.id===user?.id?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{u.avatar}</div>
        <div style={{flex:1}}><div style={{fontWeight:700,display:"flex",alignItems:"center",gap:8}}>{u.nome}{u.id===user?.id&&<span style={{fontSize:10,background:C.accent,color:"#fff",padding:"2px 8px",borderRadius:10}}>VOCÊ</span>}</div><div style={{fontSize:12,color:C.muted}}>{u.cargo}</div></div>
        <div style={{display:"flex",gap:8}}>
          {u.id!==user?.id&&<Btn size="sm" variant="success" onClick={()=>{setUser(u);showToast(`Logado como ${u.nome}`,"success")}}>Trocar</Btn>}
          <Btn size="sm" variant="danger" onClick={()=>del(u)}>Remover</Btn>
        </div>
      </div>)}
    </div></Section>
    {modal&&<Modal title="Novo Usuário" onClose={()=>setModal(false)}>
      <G2><Full><Inp label="Nome Completo" value={form.nome||""} onChange={e=>F({nome:e.target.value})}/></Full>
        <Full><Inp label="Email" type="email" value={form.email||""} onChange={e=>F({email:e.target.value})}/></Full>
        <Full><Sel label="Cargo" value={form.cargo} onChange={e=>F({cargo:e.target.value})}><option>Supervisor de PCP</option><option>Analista de Qualidade</option><option>Operador Sênior</option><option>Operador</option><option>Gestor</option></Sel></Full>
      </G2><MFoot onCancel={()=>setModal(false)} onSave={save} saving={saving} label="Criar Usuário"/>
    </Modal>}
  </div>
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",   label:"Dashboard",     icon:"▦",  group:"geral"},
  {id:"ordens",      label:"Ordens",        icon:"📋", group:"producao"},
  {id:"apontamentos",label:"Apontamentos",  icon:"📝", group:"producao"},
  {id:"oee",         label:"OEE",           icon:"⚙️", group:"producao"},
  {id:"qualidade",   label:"Qualidade",     icon:"🔍", group:"producao"},
  {id:"estoque",     label:"Estoque MP",    icon:"📦", group:"suprimentos"},
  {id:"compras",     label:"Compras",       icon:"🛒", group:"suprimentos"},
  {id:"financeiro",  label:"Financeiro",    icon:"💰", group:"gestao"},
  {id:"pcp",         label:"PCP Avançado",  icon:"🏭", group:"producao"},
  {id:"vendas",      label:"Vendas",        icon:"📈", group:"gestao"},
  {id:"margem",      label:"Margem",        icon:"📊", group:"gestao"},
  {id:"rh",          label:"RH / Ponto",    icon:"👤", group:"gestao"},
  {id:"usuarios",    label:"Usuários",      icon:"🔐", group:"config"},
]
const GROUPS={geral:"Geral",producao:"Produção",suprimentos:"Suprimentos",gestao:"Gestão",config:"Config."}

function ViewLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Preencha email e senha"); return; }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error === "Invalid login credentials" ? "Email ou senha incorretos" : result.error); return; }
    if (!result.user) { setError("Login feito, mas não há perfil de usuário vinculado. Contate o administrador."); return; }
    onLogin(result.user);
  }

  return <div style={{
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: `linear-gradient(135deg, ${C.navy} 0%, ${C.accent} 100%)`,
    fontFamily: "Inter,system-ui,sans-serif", padding: 20,
  }}>
    <div style={{ background: C.surface, borderRadius: 18, padding: "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <svg viewBox="0 0 40 40" width="48" height="48" fill="none" style={{ marginBottom: 12 }}>
          <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" stroke={C.accent} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 13 L14 27 L14 20 L26 13 L26 27" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <div style={{ fontSize: 19, fontWeight: 900, color: C.text }}>Linha ERP</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Entre com sua conta</div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Inp label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com.br" />
        <Inp label="Senha" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

        {error && <div style={{ background: C.redLight, border: `1px solid ${C.redMid}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.red, fontWeight: 600 }}>{error}</div>}

        <Btn sx={{ width: "100%", marginTop: 4, justifyContent: "center" }} disabled={loading} onClick={handleSubmit}>
          {loading ? "Entrando..." : "Entrar"}
        </Btn>
      </form>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted, textAlign: "center" }}>
        Esqueceu sua senha? Contate o administrador do sistema.
      </div>
    </div>
  </div>;
}

export default function App() {
  const [page,setPage]=useState("dashboard")
  const [user,setUser]=useState(null)
  const [authChecked,setAuthChecked]=useState(false)
  const [toast,setToast]=useState(null)
  const [open,setOpen]=useState(true)

  useEffect(()=>{
    getCurrentUser().then(u=>{ setUser(u); setAuthChecked(true); })
    const { data: listener } = sb.auth.onAuthStateChange((event)=>{
      if(event==="SIGNED_OUT"){ setUser(null); setPage("dashboard"); }
    })
    return ()=>listener?.subscription?.unsubscribe()
  },[])

  function showToast(msg,type="info"){setToast({msg,type});setTimeout(()=>setToast(null),3200)}
  async function handleLogout(){ await signOut(); setUser(null); }

  const W=open?220:56
  const navVisivel = user ? NAV.filter(n=>podeAcessar(user.permissao,n.id)) : []
  const groups=[...new Set(navVisivel.map(n=>n.group))]

  if(!authChecked) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}><Spinner/></div>
  if(!user) return <ViewLogin onLogin={setUser}/>

  return <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"Inter,system-ui,sans-serif",color:C.text}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}`}</style>
    <aside style={{width:W,flexShrink:0,background:`linear-gradient(180deg,${C.navy} 0%,${C.accent} 130%)`,display:"flex",flexDirection:"column",transition:"width .2s",overflow:"hidden",position:"sticky",top:0,height:"100vh"}}>
      <div style={{padding:"16px 12px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",gap:10,minHeight:58}}>
        <div style={{width:34,height:34,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
            <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M14 13 L14 27 L14 20 L26 13 L26 27" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        {open&&<div><div style={{fontSize:13,fontWeight:900,color:"#fff"}}>Linha ERP</div><div style={{fontSize:10,color:"rgba(255,255,255,0.65)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Supabase Live</div></div>}
      </div>
      <nav style={{flex:1,padding:"8px",overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
        {groups.map(g=><div key={g}>
          {open&&<div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.1em",padding:"10px 8px 3px"}}>{GROUPS[g]}</div>}
          {navVisivel.filter(n=>n.group===g).map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:9,padding:open?"8px 10px":"8px",justifyContent:open?"flex-start":"center",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",background:page===n.id?"rgba(255,255,255,0.16)":"transparent",color:page===n.id?"#fff":"rgba(255,255,255,0.7)",fontWeight:page===n.id?700:500,fontSize:13,width:"100%",textAlign:"left",marginBottom:1}}>
            <span style={{fontSize:15,flexShrink:0}}>{n.icon}</span>
            {open&&<span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
          </button>)}
        </div>)}
      </nav>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",padding:"8px"}}>
        {open&&user&&<div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.08)",marginBottom:8,cursor:"pointer"}} onClick={()=>setPage("usuarios")}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.25)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{user.avatar}</div>
          <div style={{overflow:"hidden",flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.nome?.split(" ")[0]}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{user.cargo}</div></div>
        </div>}
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setOpen(p=>!p)} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"6px",cursor:"pointer",color:"rgba(255,255,255,0.8)",fontSize:13}}>{open?"◀":"▶"}</button>
          {open&&<button onClick={handleLogout} title="Sair" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"rgba(255,255,255,0.8)",fontSize:13}}>⏻</button>}
        </div>
      </div>
    </aside>
    <main style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 24px",height:58,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,position:"sticky",top:0,zIndex:10}}>
        <div><div style={{fontSize:17,fontWeight:900}}>{NAV.find(n=>n.id===page)?.label}</div><div style={{fontSize:11,color:C.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})} · Dados em tempo real ✅</div></div>
        {user&&<div style={{width:32,height:32,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>setPage("usuarios")}>{user.avatar}</div>}
      </div>
      <div style={{padding:22,flex:1,overflowY:"auto"}}>
        {page==="dashboard" && podeAcessar(user.permissao,"dashboard") &&<ViewDashboard user={user}/>}
        {page==="ordens"    && podeAcessar(user.permissao,"ordens")    &&<ViewOrdens showToast={showToast}/>}
        {page==="apontamentos"&& podeAcessar(user.permissao,"apontamentos")&&<ViewApontamentos showToast={showToast}/>}
        {page==="oee"       && podeAcessar(user.permissao,"oee")       &&<ViewOEE showToast={showToast}/>}
        {page==="qualidade" && podeAcessar(user.permissao,"qualidade") &&<ViewQualidade showToast={showToast}/>}
        {page==="estoque"   && podeAcessar(user.permissao,"estoque")   &&<ViewEstoque showToast={showToast}/>}
        {page==="compras"   && podeAcessar(user.permissao,"compras")   &&<ViewCompras showToast={showToast}/>}
        {page==="financeiro"&& podeAcessar(user.permissao,"financeiro")&&<ViewFinanceiro showToast={showToast}/>}
        {page==="pcp"       && podeAcessar(user.permissao,"pcp")       &&<ViewPCP showToast={showToast}/>}
        {page==="vendas"    && podeAcessar(user.permissao,"vendas")    &&<ViewVendas showToast={showToast}/>}
        {page==="margem"    && podeAcessar(user.permissao,"margem")    &&<ViewMargemContribuicao showToast={showToast}/>}
        {page==="rh"        && podeAcessar(user.permissao,"rh")        &&<ViewRH showToast={showToast}/>}
        {page==="usuarios"  &&<ViewUsuarios user={user} setUser={setUser} showToast={showToast}/>}
      </div>
    </main>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
  </div>
}
