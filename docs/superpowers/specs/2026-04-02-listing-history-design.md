# Historique des annonces - Design Spec

## Contexte

SellSnap est actuellement 100% stateless. Les annonces generees par Claude disparaissent au rafraichissement de la page. Cette feature ajoute la persistance des annonces avec possibilite de les consulter, modifier, rechercher et supprimer.

## Decisions techniques

- **Stockage** : Turso (LibSQL distribue) - compatible Vercel serverless, tier gratuit genereux (9 Go)
- **ORM** : Drizzle ORM - leger, type-safe, support natif Turso
- **Thumbnails** : Premiere photo redimensionnee a ~200px, stockee en base64 directement en base (quelques Ko par annonce)
- **Recherche** : LIKE sur title + description (suffisant pour usage perso)

## Schema base de donnees

Une seule table `listings` :

```sql
CREATE TABLE listings (
  id          TEXT PRIMARY KEY,       -- nanoid
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  price       TEXT NOT NULL,
  category    TEXT,
  thumbnail   TEXT,                   -- base64 miniature ~200px, nullable
  context     TEXT,                   -- contexte utilisateur original
  market_data TEXT,                   -- JSON stringify, nullable
  ai_stats    TEXT,                   -- JSON stringify, nullable
  created_at  INTEGER NOT NULL,       -- unix timestamp ms
  updated_at  INTEGER NOT NULL        -- unix timestamp ms
);
```

## API Routes (nouvelles)

Toutes protegees par le middleware auth existant.

| Methode | Route               | Description                          |
|---------|---------------------|--------------------------------------|
| POST    | /api/listings       | Creer une annonce                    |
| GET     | /api/listings       | Lister les annonces (?q=recherche)   |
| GET     | /api/listings/:id   | Detail d'une annonce                 |
| PATCH   | /api/listings/:id   | Modifier une annonce (title, desc, price) |
| DELETE  | /api/listings/:id   | Supprimer une annonce                |

### POST /api/listings

**Input :**
```typescript
{
  title: string
  description: string
  price: string
  category?: string
  thumbnail?: string        // base64
  context?: string
  marketData?: MarketData
  aiStats?: AiStats
}
```

**Output :** `{ id: string, ...listing }`

### GET /api/listings

**Query params :** `?q=texte` (optionnel, recherche sur title + description)

**Output :** `{ listings: Listing[] }` - tri par created_at DESC

### GET /api/listings/:id

**Output :** `{ listing: Listing }`

**Erreur :** 404 si non trouve

### PATCH /api/listings/:id

**Input :** `{ title?: string, description?: string, price?: string }`

**Output :** `{ listing: Listing }` (mis a jour)

### DELETE /api/listings/:id

**Output :** `{ ok: true }`

## Pages et composants

### Nouvelle page : `/history`

- Barre de recherche en haut (debounce 300ms)
- Liste des annonces sous forme de cartes
- Chaque carte : thumbnail (si dispo), titre, prix, date
- Clic sur une carte -> navigation vers detail/edition
- Message "Aucune annonce" si liste vide

### Nouveaux composants

- **HistoryList.vue** : Liste scrollable de ListingCard
- **ListingCard.vue** : Carte individuelle (thumbnail, titre, prix, date relative, bouton supprimer)
- **SearchBar.vue** : Input de recherche avec icone et debounce

### Modifications existantes

- **ResultView.vue** : Apres generation, sauvegarde automatique en base. Ajout d'un lien "Voir l'historique"
- **index.vue** : Navigation vers /history accessible (bouton/lien dans le header)
- **useAnalyze.ts** : Apres un resultat reussi, appel POST /api/listings pour sauvegarder

## Flux utilisateur

### Generation (modifie)

1. L'utilisateur upload des photos et genere une annonce (inchange)
2. A la reception du resultat, sauvegarde automatique via POST /api/listings
3. L'annonce affichee est maintenant liee a un ID en base
4. Les modifications (refinement) mettent a jour l'annonce via PATCH

### Historique (nouveau)

1. L'utilisateur accede a /history
2. Il voit la liste de ses annonces, les plus recentes en premier
3. Il peut rechercher par texte (titre ou description)
4. Clic sur une carte -> page detail avec les champs editables
5. Il peut modifier titre/description/prix et sauvegarder
6. Il peut supprimer une annonce (avec confirmation)

## Thumbnail

- Generee cote client a partir de la premiere photo uploadee
- Redimensionnement a 200px sur le plus grand cote (meme logique que fileToBase64 existant)
- Format JPEG qualite 0.7
- Stockee en base64 dans la colonne `thumbnail`
- Poids estime : 5-15 Ko par miniature

## Structure fichiers (nouveaux)

```
server/
  database/
    index.ts              -- connexion Drizzle + Turso
    schema.ts             -- schema de la table listings
  api/
    listings/
      index.post.ts       -- POST /api/listings
      index.get.ts        -- GET /api/listings
      [id].get.ts         -- GET /api/listings/:id
      [id].patch.ts       -- PATCH /api/listings/:id
      [id].delete.ts      -- DELETE /api/listings/:id
app/
  pages/
    history.vue           -- page historique
  components/
    HistoryList.vue
    ListingCard.vue
    SearchBar.vue
  utils/
    image.ts              -- ajout fonction generateThumbnail()
```

## Dependencies nouvelles

- `@libsql/client` : client Turso
- `drizzle-orm` : ORM
- `drizzle-kit` : migrations (dev dependency)
- `nanoid` : generation d'IDs

## Variables d'environnement (nouvelles)

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Hors scope

- Multi-utilisateurs / comptes
- Stockage des photos originales
- Export des annonces
- Tags / categories custom
- Pagination (pas necessaire pour un usage perso avec quelques dizaines/centaines d'annonces)
