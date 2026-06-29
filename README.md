# ERP Industrial — Deploy no Vercel

## Passo a passo

### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar local
```bash
npm run dev
```
Abre em http://localhost:5173

### 3. Deploy no Vercel

**Opção A — GitHub (recomendado):**
1. Crie repositório no GitHub: `WRigo13/erp-industrial`
2. Suba os arquivos: `git init && git add . && git commit -m "init" && git push`
3. Acesse vercel.com → New Project → importe o repositório
4. Deploy automático ✅

**Opção B — Vercel CLI:**
```bash
npm i -g vercel
vercel
```

## Estrutura
```
erp-industrial/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx       ← entry point
    ├── App.jsx        ← ERP completo
    └── supabase.js    ← credenciais Supabase
```

## Supabase
- Projeto: zhmulsemoowslxofkpni
- URL: https://zhmulsemoowslxofkpni.supabase.co
