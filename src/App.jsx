import { useState, useEffect, useCallback } from "react"
import { sb, EID, dbIns, dbUpd, dbDel } from "./supabase.js"

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
  <div style={{background:bg||C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:4}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{label}</span>
      {icon&&<span style={{fontSize:18}}>{icon}</span>}
    </div>
    <div style={{fontSize:24,fontWeight:800,color,lineHeight:1.1}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.muted}}>{sub}</div>}
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
      <div style={{textAlign:"right"}}><div style={{fontSize:12,opacity:.8}}>Saldo projetado</div><div style={{fontSize:22,fontWeight:800}}>{fmtR(totalReceber-totalPagar)}</div></div>
    </div>
    <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Produção</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
      <KCard label="Em Produção" value={emProd} sub={`${ordens.length} total`} color={C.accent} icon="📋"/>
      <KCard label="Atrasadas" value={atrasadas} color={atrasadas>0?C.red:C.green} icon="⚠️" bg={atrasadas>0?C.redLight:C.surface}/>
      <KCard label="Eficiência" value={`${efGeral}%`} color={efGeral>80?C.red:C.green} icon="⚙️"/>
      <KCard label="Produzido Hoje" value={fmt(prodHoje)} sub="peças" color={C.text} icon="📦"/>
      <KCard label="Refugo Hoje" value={refugoHoje} color={refugoHoje>5?C.amber:C.green} icon="🗑️"/>
      <KCard label="NC Qualidade" value={qualNC} color={qualNC>0?C.red:C.green} icon="🔍"/>
    </div>
    <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Gestão</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
      <KCard label="Estoque Alerta" value={stockAlerta} color={stockAlerta>0?C.amber:C.green} icon="📦" bg={stockAlerta>0?C.amberLight:C.surface}/>
      <KCard label="Valor Estoque" value={fmtR(valorEstoque)} color={C.text} icon="💰"/>
      <KCard label="Pedidos Compra" value={pedidosAbertos} sub="em aberto" color={C.teal} icon="🛒"/>
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
    <Section title={`${list.length} ordens`}>
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
function ViewEstoque({showToast}) {
  const {data:estoque,loading,error,reload}=useTable("estoque_mp")
  const {data:movs,reload:reloadMovs}=useTable("movimentacoes_estoque")
  const [tab,setTab]=useState("estoque")
  const [modal,setModal]=useState(false)
  const [movModal,setMovModal]=useState(false)
  const [edit,setEdit]=useState(null)
  const [form,setForm]=useState({})
  const [movForm,setMovForm]=useState({tipo:"saida"})
  const [saving,setSaving]=useState(false)
  const F=v=>setForm(f=>({...f,...v}))
  const MFm=v=>setMovForm(f=>({...f,...v}))
  const alertas=estoque.filter(e=>e.saldo<=e.minimo)
  const valorTotal=estoque.reduce((s,e)=>s+e.saldo*e.custo_unit,0)
  const sSaldo=e=>{if(e.saldo<=e.minimo)return{l:"Crítico",c:C.red,bg:C.redLight};if(e.saldo>=e.maximo*.9)return{l:"Excesso",c:C.amber,bg:C.amberLight};return{l:"OK",c:C.green,bg:C.greenLight}}
  function openNew(){setEdit(null);setForm({unidade:"kg",saldo:0,minimo:100,maximo:1000,custo_unit:0,categoria:"Aço"});setModal(true)}
  function openEdit(e){setEdit(e);setForm({...e});setModal(true)}
  async function saveItem(){if(!form.codigo||!form.descricao)return showToast("Preencha código e descrição","error");setSaving(true);const p={...form,...Object.fromEntries(["saldo","minimo","maximo","custo_unit"].map(k=>[k,Number(form[k]||0)]))};const{error:e}=edit?await dbUpd("estoque_mp",edit.id,p):await dbIns("estoque_mp",p);e?showToast("Erro: "+e.message,"error"):(showToast(edit?"Atualizado":"Criado","success"),await reload());setSaving(false);setModal(false)}
  async function saveMov(){if(!movForm.mp_codigo||!movForm.quantidade)return showToast("Preencha item e quantidade","error");setSaving(true);const qtd=Number(movForm.quantidade);await dbIns("movimentacoes_estoque",{...movForm,quantidade:qtd,data:TODAY});const item=estoque.find(e=>e.codigo===movForm.mp_codigo);if(item){const ns=movForm.tipo==="entrada"?item.saldo+qtd:Math.max(0,item.saldo-qtd);await dbUpd("estoque_mp",item.id,{saldo:ns,ultima_entrada:movForm.tipo==="entrada"?TODAY:item.ultima_entrada})}showToast("Movimentação registrada","success");await reload();await reloadMovs();setSaving(false);setMovModal(false);setMovForm({tipo:"saida"})}
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
      <KCard label="Itens" value={estoque.length} icon="📦"/><KCard label="Alertas" value={alertas.length} color={alertas.length>0?C.red:C.green} icon="⚠️" bg={alertas.length>0?C.redLight:C.surface}/><KCard label="Valor Total" value={fmtR(valorTotal)} icon="💰"/><KCard label="Movimentações" value={movs.length} icon="🔄"/>
    </div>
    <Tabs tabs={[{key:"estoque",label:"Estoque"},{key:"movimentacoes",label:"Movimentações"},{key:"alertas",label:`Alertas (${alertas.length})`}]} active={tab} onChange={setTab}/>
    {tab==="estoque"&&<><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={()=>setMovModal(true)}>+ Movimentação</Btn><Btn onClick={openNew}>+ Novo Item</Btn></div>
      <Section title={`${estoque.length} itens`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
        <thead><tr><Th>Código</Th><Th>Descrição</Th><Th>Saldo</Th><Th>Mín/Máx</Th><Th>Custo</Th><Th>Valor</Th><Th>Status</Th><Th>Ult. Entrada</Th><Th></Th></tr></thead>
        <tbody>{estoque.map((e,i)=>{const s=sSaldo(e);return<tr key={e.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:800,color:C.accent,fontSize:12}}>{e.codigo}</span></Td><Td style={{fontWeight:600}}>{e.descricao}</Td>
          <Td><span style={{fontWeight:800}}>{fmt(e.saldo)}</span><span style={{fontSize:11,color:C.muted,marginLeft:4}}>{e.unidade}</span></Td>
          <Td style={{color:C.muted,fontSize:12}}>{fmt(e.minimo)}/{fmt(e.maximo)}</Td><Td style={{color:C.muted}}>{fmtR(e.custo_unit)}</Td>
          <Td style={{fontWeight:700}}>{fmtR(e.saldo*e.custo_unit)}</Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:s.c,background:s.bg}}>{s.l}</span></Td>
          <Td style={{color:C.muted,whiteSpace:"nowrap"}}>{fmtD(e.ultima_entrada)}</Td>
          <Td><Btn size="sm" variant="ghost" onClick={()=>openEdit(e)}>Editar</Btn></Td>
        </tr>})}</tbody>
      </table></div></Section></>}
    {tab==="movimentacoes"&&<Section title="Movimentações"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr><Th>Data</Th><Th>Item</Th><Th>Tipo</Th><Th>Qtd</Th><Th>OP</Th><Th>Motivo</Th></tr></thead>
      <tbody>{movs.map((m,i)=><tr key={m.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
        <Td style={{color:C.muted}}>{fmtD(m.data)}</Td><Td><span style={{fontWeight:700,color:C.accent}}>{m.mp_codigo}</span></Td>
        <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:m.tipo==="entrada"?C.green:C.amber,background:m.tipo==="entrada"?C.greenLight:C.amberLight}}>{m.tipo==="entrada"?"Entrada":"Saída"}</span></Td>
        <Td style={{fontWeight:700}}>{fmt(m.quantidade)}</Td><Td style={{color:C.muted}}>{m.op||"—"}</Td><Td style={{color:C.muted}}>{m.motivo}</Td>
      </tr>)}</tbody>
    </table></div></Section>}
    {tab==="alertas"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {alertas.length===0&&<div style={{background:C.greenLight,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:20,textAlign:"center",fontSize:14,color:C.green,fontWeight:700}}>✅ Todos os itens acima do mínimo!</div>}
      {alertas.map(e=><div key={e.id} style={{background:C.redLight,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"14px 20px",display:"flex",gap:14,alignItems:"center"}}>
        <span style={{fontSize:22}}>⚠️</span>
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{e.codigo} — {e.descricao}</div><div style={{fontSize:13,color:C.red,marginTop:2}}>Saldo: <b>{fmt(e.saldo)} {e.unidade}</b> · Mín: <b>{fmt(e.minimo)}</b> · {e.fornecedor}</div></div>
        <Btn variant="success" size="sm" onClick={()=>{setMovForm({tipo:"entrada",mp_codigo:e.codigo});setMovModal(true)}}>+ Entrada</Btn>
      </div>)}
    </div>}
    {modal&&<Modal title={edit?"Editar Item":"Novo Item"} onClose={()=>setModal(false)}>
      <G2><Inp label="Código" value={form.codigo||""} onChange={e=>F({codigo:e.target.value})}/><Sel label="Categoria" value={form.categoria||""} onChange={e=>F({categoria:e.target.value})}><option>Aço</option><option>Inox</option><option>Bronze</option><option>Plástico</option><option>Consumível</option><option>Outro</option></Sel>
        <Full><Inp label="Descrição" value={form.descricao||""} onChange={e=>F({descricao:e.target.value})}/></Full>
        <Inp label="Fornecedor" value={form.fornecedor||""} onChange={e=>F({fornecedor:e.target.value})}/><Sel label="Unidade" value={form.unidade||"kg"} onChange={e=>F({unidade:e.target.value})}><option value="kg">kg</option><option value="L">L</option><option value="m">m</option><option value="un">un</option></Sel>
        <Inp label="Saldo" type="number" value={form.saldo||0} onChange={e=>F({saldo:e.target.value})}/><Inp label="Custo Unit." type="number" value={form.custo_unit||0} onChange={e=>F({custo_unit:e.target.value})}/>
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
  </div>
}

// ── FINANCEIRO ───────────────────────────────────────────────────────────────
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
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
      <Section title={`${pagar.length} contas`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
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
      <Section title={`${receber.length} contas`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
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
function ViewRH({showToast}) {
  const {data:funcs,loading,error,reload}=useTable("funcionarios")
  const {data:pontos,reload:reloadP}=useTable("registros_ponto")
  const [tab,setTab]=useState("funcionarios")
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({turno:"manhã",ativo:true})
  const [pontoForm,setPontoForm]=useState({})
  const [saving,setSaving]=useState(false)
  const F=v=>setForm(f=>({...f,...v}))
  const PF=v=>setPontoForm(f=>({...f,...v}))
  if(loading)return <Spinner/>;if(error)return <ErrBox msg={error} onRetry={reload}/>
  const folhaMensal=funcs.filter(f=>f.ativo).reduce((s,f)=>s+f.salario,0)
  async function saveFunc(){if(!form.nome)return showToast("Preencha o nome","error");setSaving(true);const{error:e}=await dbIns("funcionarios",{...form,salario:Number(form.salario||0),avatar:form.nome.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase(),matricula:form.matricula||`M-${String(funcs.length+1).padStart(3,"0")}`});e?showToast("Erro: "+e.message,"error"):(showToast("Criado","success"),await reload());setSaving(false);setModal(null)}
  async function savePonto(){if(!pontoForm.funcionario_id)return showToast("Selecione o funcionário","error");setSaving(true);const{error:e}=await dbIns("registros_ponto",{...pontoForm,funcionario_id:Number(pontoForm.funcionario_id),horas_extras:Number(pontoForm.horas_extras||0),data:TODAY});e?showToast("Erro: "+e.message,"error"):(showToast("Ponto registrado","success"),await reloadP());setSaving(false);setModal(null);setPontoForm({})}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
      <KCard label="Ativos" value={funcs.filter(f=>f.ativo).length} sub={`de ${funcs.length}`} icon="👤"/>
      <KCard label="Folha Mensal" value={fmtR(folhaMensal)} icon="💰"/>
      <KCard label="Pontos Hoje" value={pontos.filter(p=>p.data===TODAY).length} color={C.accent} icon="🕐"/>
    </div>
    <Tabs tabs={[{key:"funcionarios",label:"Funcionários"},{key:"ponto",label:"Registros de Ponto"}]} active={tab} onChange={setTab}/>
    {tab==="funcionarios"&&<><div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{setForm({turno:"manhã",ativo:true});setModal("func")}}>+ Novo Funcionário</Btn></div>
      <Section title={`${funcs.length} funcionários`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
        <thead><tr><Th>Matrícula</Th><Th>Nome</Th><Th>Cargo</Th><Th>Centro</Th><Th>Turno</Th><Th>Salário</Th><Th>Status</Th></tr></thead>
        <tbody>{funcs.map((f,i)=><tr key={f.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td><span style={{fontWeight:700,color:C.accent,fontSize:12}}>{f.matricula}</span></Td>
          <Td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{f.avatar}</div><span style={{fontWeight:700}}>{f.nome}</span></div></Td>
          <Td style={{color:C.muted}}>{f.cargo}</Td><Td style={{color:C.muted}}>{f.centro}</Td>
          <Td style={{color:C.muted,textTransform:"capitalize"}}>{f.turno}</Td>
          <Td style={{fontWeight:700}}>{fmtR(f.salario)}</Td>
          <Td><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:f.ativo?C.green:C.red,background:f.ativo?C.greenLight:C.redLight}}>{f.ativo?"Ativo":"Inativo"}</span></Td>
        </tr>)}</tbody>
      </table></div></Section></>}
    {tab==="ponto"&&<><div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setModal("ponto")}>+ Registrar Ponto</Btn></div>
      <Section title={`${pontos.length} registros`}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
        <thead><tr><Th>Data</Th><Th>Funcionário</Th><Th>Entrada</Th><Th>Saída</Th><Th>Horas Extras</Th></tr></thead>
        <tbody>{pontos.map((p,i)=>{const f=funcs.find(f=>f.id===p.funcionario_id);return<tr key={p.id} style={{borderTop:`1px solid ${C.border}`,background:i%2?C.bg:C.surface}}>
          <Td style={{color:C.muted}}>{fmtD(p.data)}</Td><Td style={{fontWeight:700}}>{f?.nome||"—"}</Td>
          <Td style={{color:C.green,fontWeight:600}}>{p.entrada||"—"}</Td><Td style={{color:C.red,fontWeight:600}}>{p.saida||"—"}</Td>
          <Td><span style={{color:p.horas_extras>0?C.amber:C.muted,fontWeight:700}}>{p.horas_extras>0?`+${p.horas_extras}h`:"—"}</span></Td>
        </tr>})}</tbody>
      </table></div></Section></>}
    {modal==="func"&&<Modal title="Novo Funcionário" onClose={()=>setModal(null)}>
      <G2><Full><Inp label="Nome Completo" value={form.nome||""} onChange={e=>F({nome:e.target.value})}/></Full>
        <Inp label="Cargo" value={form.cargo||""} onChange={e=>F({cargo:e.target.value})}/><Inp label="Centro" value={form.centro||""} onChange={e=>F({centro:e.target.value})}/>
        <Sel label="Turno" value={form.turno} onChange={e=>F({turno:e.target.value})}><option value="manhã">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></Sel>
        <Inp label="Salário (R$)" type="number" value={form.salario||""} onChange={e=>F({salario:e.target.value})}/>
        <Inp label="Data de Admissão" type="date" value={form.admissao||""} onChange={e=>F({admissao:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={saveFunc} saving={saving} label="Criar"/>
    </Modal>}
    {modal==="ponto"&&<Modal title="Registrar Ponto" onClose={()=>setModal(null)}>
      <G2><Full><Sel label="Funcionário" value={pontoForm.funcionario_id||""} onChange={e=>PF({funcionario_id:e.target.value})}><option value="">Selecione...</option>{funcs.filter(f=>f.ativo).map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</Sel></Full>
        <Inp label="Entrada" type="time" value={pontoForm.entrada||""} onChange={e=>PF({entrada:e.target.value})}/><Inp label="Saída" type="time" value={pontoForm.saida||""} onChange={e=>PF({saida:e.target.value})}/>
        <Inp label="Horas Extras" type="number" step="0.5" value={pontoForm.horas_extras||0} onChange={e=>PF({horas_extras:e.target.value})}/><Inp label="Ocorrência" value={pontoForm.ocorrencia||""} onChange={e=>PF({ocorrencia:e.target.value})}/>
      </G2><MFoot onCancel={()=>setModal(null)} onSave={savePonto} saving={saving} label="Registrar"/>
    </Modal>}
  </div>
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
  {id:"estoque",     label:"Estoque MP",    icon:"📦", group:"suprimentos"},
  {id:"financeiro",  label:"Financeiro",    icon:"💰", group:"gestao"},
  {id:"rh",          label:"RH / Ponto",    icon:"👤", group:"gestao"},
  {id:"usuarios",    label:"Usuários",      icon:"🔐", group:"config"},
]
const GROUPS={geral:"Geral",producao:"Produção",suprimentos:"Suprimentos",gestao:"Gestão",config:"Config."}

export default function App() {
  const [page,setPage]=useState("dashboard")
  const [user,setUser]=useState(null)
  const [toast,setToast]=useState(null)
  const [open,setOpen]=useState(true)

  useEffect(()=>{
    sb.from("usuarios").select("*").eq("empresa_id",EID).order("id",{ascending:true}).limit(1).then(({data})=>{if(data&&data.length>0)setUser(data[0])})
  },[])

  function showToast(msg,type="info"){setToast({msg,type});setTimeout(()=>setToast(null),3200)}
  const W=open?220:56
  const groups=[...new Set(NAV.map(n=>n.group))]

  return <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"Inter,system-ui,sans-serif",color:C.text}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}`}</style>
    <aside style={{width:W,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width .2s",overflow:"hidden",position:"sticky",top:0,height:"100vh"}}>
      <div style={{padding:"14px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,minHeight:58}}>
        <div style={{width:34,height:34,background:`linear-gradient(135deg,${C.navy},${C.accent})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,color:"#fff",fontWeight:900}}>⚙</div>
        {open&&<div><div style={{fontSize:13,fontWeight:900}}>ERP Industrial</div><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Supabase Live</div></div>}
      </div>
      <nav style={{flex:1,padding:"8px",overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
        {groups.map(g=><div key={g}>
          {open&&<div style={{fontSize:10,fontWeight:700,color:C.faint,textTransform:"uppercase",letterSpacing:"0.1em",padding:"10px 8px 3px"}}>{GROUPS[g]}</div>}
          {NAV.filter(n=>n.group===g).map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:9,padding:open?"8px 10px":"8px",justifyContent:open?"flex-start":"center",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",background:page===n.id?C.accentLight:"transparent",color:page===n.id?C.accent:C.muted,fontWeight:page===n.id?700:500,fontSize:13,width:"100%",textAlign:"left",marginBottom:1}}>
            <span style={{fontSize:15,flexShrink:0}}>{n.icon}</span>
            {open&&<span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
          </button>)}
        </div>)}
      </nav>
      <div style={{borderTop:`1px solid ${C.border}`,padding:"8px"}}>
        {open&&user&&<div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,background:C.bg,marginBottom:8,cursor:"pointer"}} onClick={()=>setPage("usuarios")}>
          <div style={{width:28,height:28,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{user.avatar}</div>
          <div style={{overflow:"hidden",flex:1}}><div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.nome?.split(" ")[0]}</div><div style={{fontSize:10,color:C.muted}}>{user.cargo}</div></div>
        </div>}
        <button onClick={()=>setOpen(p=>!p)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px",cursor:"pointer",color:C.muted,fontSize:13}}>{open?"◀":"▶"}</button>
      </div>
    </aside>
    <main style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 24px",height:58,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,position:"sticky",top:0,zIndex:10}}>
        <div><div style={{fontSize:17,fontWeight:900}}>{NAV.find(n=>n.id===page)?.label}</div><div style={{fontSize:11,color:C.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})} · Dados em tempo real ✅</div></div>
        {user&&<div style={{width:32,height:32,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>setPage("usuarios")}>{user.avatar}</div>}
      </div>
      <div style={{padding:22,flex:1,overflowY:"auto"}}>
        {page==="dashboard" &&<ViewDashboard user={user}/>}
        {page==="ordens"    &&<ViewOrdens showToast={showToast}/>}
        {page==="estoque"   &&<ViewEstoque showToast={showToast}/>}
        {page==="financeiro"&&<ViewFinanceiro showToast={showToast}/>}
        {page==="rh"        &&<ViewRH showToast={showToast}/>}
        {page==="usuarios"  &&<ViewUsuarios user={user} setUser={setUser} showToast={showToast}/>}
      </div>
    </main>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
  </div>
}
