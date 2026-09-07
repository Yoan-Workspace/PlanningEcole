# Trajets — Planning écoles

Planning hebdomadaire privé pour organiser les trajets scolaires entre **3 couples** (matin / après-midi) vers :

| École | Enfants |
|---|---|
| **École Michelis** | Naël, Emrys, Baptiste |
| **NDJ** | Elio, Jules, Lovan |

## Démarrage local

```bash
npm install
npm run dev
```

Code d'accès par défaut : `trajet2026` (variable `VITE_ACCESS_CODE`).

## Persistance

- **Local** (défaut) : `localStorage` sur l'appareil
- **Cloud** (recommandé) : Supabase — exécuter `supabase.sql`, puis renseigner `.env`

## Déploiement

Vercel ou Netlify — build Vite, dossier `dist`. Ajouter `VITE_ACCESS_CODE` (+ clés Supabase si sync).
