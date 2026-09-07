# Trajets — Planning écoles

Planning hebdomadaire privé pour organiser les trajets scolaires entre **3 couples** (matin / après-midi) vers :

| École | Enfants |
|---|---|
| **École Michelis** | Naël, Emrys, Baptiste |
| **NDJ** | Elio, Jules, Lovan |

## Démarrage local

```bash
cd planning-ecoles
cp .env.example .env
# renseigner ACCESS_CODE et SESSION_SECRET
npm install
npm run dev
```

Le code d’accès est vérifié **côté serveur**. Il ne doit jamais être préfixé `VITE_`.

## Persistance

- **Local (Vite)** : fichier `.data/planning.json` derrière la session
- **Netlify** : Blobs (par défaut) ou Supabase si `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

## Déploiement Netlify

Variables d’environnement (Site settings → Environment variables) :

- `ACCESS_CODE` — le code partagé entre parents
- `SESSION_SECRET` — chaîne longue aléatoire (cookie signé)
- optionnel : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
