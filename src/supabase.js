import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = "https://zhmulsemoowslxofkpni.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXVsc2Vtb293c2x4b2ZrcG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTYxMTcsImV4cCI6MjA5ODMzMjExN30.59MDmFGPnWco7CoWaVuI7yDnnQHnnV8O2QoLDbMBHqA"
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
export const EID = 1
export const dbIns = (t,r) => sb.from(t).insert({...r,empresa_id:EID}).select().single()
export const dbUpd = (t,id,r) => sb.from(t).update(r).eq('id',id).select().single()
export const dbDel = (t,id) => sb.from(t).delete().eq('id',id)
