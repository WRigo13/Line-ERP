import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = "https://zhmulsemoowslxofkpni.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXVsc2Vtb293c2x4b2ZrcG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTYxMTcsImV4cCI6MjA5ODMzMjExN30.59MDmFGPnWco7CoWaVuI7yDnnQHnnV8O2QoLDbMBHqA"
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
export const EID = 1
export const dbIns = (t,r) => sb.from(t).insert({...r,empresa_id:EID}).select().single()
export const dbUpd = (t,id,r) => sb.from(t).update(r).eq('id',id).select().single()
export const dbDel = (t,id) => sb.from(t).delete().eq('id',id)

// ── AUTH ──────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  const { data: perfil } = await sb.from('usuarios').select('*').eq('auth_id', data.user.id).single()
  return { user: perfil, error: null }
}

export async function signOut() {
  await sb.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return null
  const { data: perfil } = await sb.from('usuarios').select('*').eq('auth_id', session.user.id).single()
  return perfil || null
}

// Mapa de quais módulos cada permissão pode acessar
export const PERMISSOES_MODULOS = {
  admin:       null, // null = acesso total
  supervisor:  ['dashboard','ordens','apontamentos','oee','qualidade','estoque','compras','pcp','vendas','margem','financeiro','rh'],
  qualidade:   ['dashboard','qualidade','ordens','apontamentos'],
  operador:    ['dashboard','ordens','apontamentos'],
  estoque:     ['dashboard','estoque','compras'],
  vendas:      ['dashboard','vendas','margem'],
  financeiro:  ['dashboard','financeiro','margem'],
}

export function podeAcessar(permissao, moduleId) {
  const permitidos = PERMISSOES_MODULOS[permissao]
  if (permitidos === null || permitidos === undefined) return true // admin ou cargo desconhecido = acesso total (fallback seguro)
  return permitidos.includes(moduleId)
}
