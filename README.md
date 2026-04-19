# Perù 2026 — Travel Planner

App Next.js per la gestione del mio viaggio in Perù, con sync real-time via Vercel KV.

## Deploy su Vercel (passo passo)

### 1. Pusha il codice su GitHub
```bash
git init
git add .
git commit -m "primo commit"
git branch -M main
git remote add origin https://github.com/TUO_USER/peru-viaggio.git
git push -u origin main
```

### 2. Crea il progetto su Vercel
- Vai su vercel.com → New Project → importa il repo
- Clicca **Deploy** (senza toccare niente)

### 3. Aggiungi Vercel KV
- Dashboard del progetto → **Storage** → **Create Database** → **KV**
- Nome: `peru-kv` → Create
- Clicca **Connect to Project** → seleziona il tuo progetto
- Vercel aggiunge automaticamente le variabili d'ambiente

### 4. Redeploy
- Deployments → ⋯ → **Redeploy**
- Done! L'app è live e sincronizzata tra tutti i dispositivi.

## Sviluppo locale

```bash
npm install
# Copia le env vars da Vercel (Settings → Environment Variables) in .env.local
npm run dev
```
