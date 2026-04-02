# Listing History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent listing storage with Turso (LibSQL) + Drizzle ORM so users can view, search, edit, and delete previously generated listings.

**Architecture:** A single `listings` table in Turso stores generated listing data (title, description, price, category, thumbnail, market data, AI stats). New Nitro API routes handle CRUD operations. A new `/history` page displays saved listings with search. The existing analyze flow auto-saves results after generation.

**Tech Stack:** Turso (LibSQL), Drizzle ORM, nanoid, Nuxt 3 / Nitro server routes

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `server/database/schema.ts` | Drizzle table schema for `listings` |
| Create | `server/database/index.ts` | Turso client + Drizzle instance (singleton) |
| Create | `drizzle.config.ts` | Drizzle Kit config for migrations |
| Create | `server/api/listings/index.post.ts` | POST /api/listings - create listing |
| Create | `server/api/listings/index.get.ts` | GET /api/listings - list + search |
| Create | `server/api/listings/[id].get.ts` | GET /api/listings/:id - get one |
| Create | `server/api/listings/[id].patch.ts` | PATCH /api/listings/:id - update |
| Create | `server/api/listings/[id].delete.ts` | DELETE /api/listings/:id - delete |
| Create | `app/pages/history.vue` | History page with search + listing cards |
| Create | `app/components/ListingCard.vue` | Card component for listing preview |
| Create | `app/components/SearchBar.vue` | Debounced search input |
| Modify | `app/utils/image.ts` | Add `generateThumbnail()` function |
| Modify | `app/composables/useAnalyze.ts` | Auto-save after successful analysis |
| Modify | `app/pages/index.vue` | Add "Historique" link in header area |
| Modify | `server/middleware/auth.ts` | Protect `/api/listings` routes too |
| Modify | `nuxt.config.ts` | Add Turso env vars to runtimeConfig |
| Modify | `package.json` | Add dependencies |

---

### Task 1: Install dependencies and configure Turso

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Install packages**

```bash
cd /Users/xavier/Developer/sellsnap
npm install @libsql/client drizzle-orm nanoid
npm install -D drizzle-kit
```

- [ ] **Step 2: Add Turso env vars to nuxt.config.ts**

In `nuxt.config.ts`, add to the `runtimeConfig` object:

```typescript
runtimeConfig: {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  appPassword: process.env.APP_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || 'sellsnap-secret-change-me',
  tursoUrl: process.env.TURSO_DATABASE_URL || '',
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
},
```

- [ ] **Step 3: Create drizzle.config.ts**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json nuxt.config.ts drizzle.config.ts
git commit -m "feat: add Turso + Drizzle dependencies and config"
```

---

### Task 2: Database schema and connection

**Files:**
- Create: `server/database/schema.ts`
- Create: `server/database/index.ts`

- [ ] **Step 1: Create the schema**

Create `server/database/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: text('price').notNull(),
  category: text('category'),
  thumbnail: text('thumbnail'),
  context: text('context'),
  marketData: text('market_data'),
  aiStats: text('ai_stats'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
})

export type Listing = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
```

- [ ] **Step 2: Create the database connection**

Create `server/database/index.ts`:

```typescript
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDB() {
  if (_db) return _db

  const config = useRuntimeConfig()
  const client = createClient({
    url: config.tursoUrl,
    authToken: config.tursoAuthToken,
  })

  _db = drizzle(client, { schema })
  return _db
}
```

- [ ] **Step 3: Generate and push migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Note: `push` requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to be set in your environment. Create a Turso database first via `turso db create sellsnap` if not done yet.

- [ ] **Step 4: Commit**

```bash
git add server/database/
git commit -m "feat: add Turso database schema and connection"
```

---

### Task 3: Protect listings API routes with auth middleware

**Files:**
- Modify: `server/middleware/auth.ts`

- [ ] **Step 1: Extend auth middleware to cover /api/listings**

Replace the URL check in `server/middleware/auth.ts` line 4:

```typescript
// Old:
if (!url.pathname.startsWith('/api/analyze')) return

// New:
if (!url.pathname.startsWith('/api/analyze') && !url.pathname.startsWith('/api/listings')) return
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/auth.ts
git commit -m "feat: protect /api/listings routes with auth middleware"
```

---

### Task 4: POST /api/listings - Create listing

**Files:**
- Create: `server/api/listings/index.post.ts`

- [ ] **Step 1: Create the endpoint**

Create `server/api/listings/index.post.ts`:

```typescript
import { nanoid } from 'nanoid'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title || !body.description || !body.price) {
    throw createError({ statusCode: 400, statusMessage: 'title, description et price sont requis' })
  }

  const now = Date.now()
  const listing = {
    id: nanoid(12),
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category || null,
    thumbnail: body.thumbnail || null,
    context: body.context || null,
    marketData: body.marketData ? JSON.stringify(body.marketData) : null,
    aiStats: body.aiStats ? JSON.stringify(body.aiStats) : null,
    createdAt: now,
    updatedAt: now,
  }

  const db = useDB()
  await db.insert(listings).values(listing)

  return { listing }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/listings/index.post.ts
git commit -m "feat: add POST /api/listings endpoint"
```

---

### Task 5: GET /api/listings - List and search

**Files:**
- Create: `server/api/listings/index.get.ts`

- [ ] **Step 1: Create the endpoint**

Create `server/api/listings/index.get.ts`:

```typescript
import { desc, or, like } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.q as string)?.trim()

  const db = useDB()

  let rows
  if (search) {
    const pattern = `%${search}%`
    rows = await db
      .select()
      .from(listings)
      .where(or(like(listings.title, pattern), like(listings.description, pattern)))
      .orderBy(desc(listings.createdAt))
  } else {
    rows = await db.select().from(listings).orderBy(desc(listings.createdAt))
  }

  // Parse JSON fields
  const parsed = rows.map((row) => ({
    ...row,
    marketData: row.marketData ? JSON.parse(row.marketData) : null,
    aiStats: row.aiStats ? JSON.parse(row.aiStats) : null,
  }))

  return { listings: parsed }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/listings/index.get.ts
git commit -m "feat: add GET /api/listings endpoint with search"
```

---

### Task 6: GET /api/listings/:id - Get single listing

**Files:**
- Create: `server/api/listings/[id].get.ts`

- [ ] **Step 1: Create the endpoint**

Create `server/api/listings/[id].get.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const db = useDB()
  const [row] = await db.select().from(listings).where(eq(listings.id, id))

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  return {
    listing: {
      ...row,
      marketData: row.marketData ? JSON.parse(row.marketData) : null,
      aiStats: row.aiStats ? JSON.parse(row.aiStats) : null,
    },
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/listings/\[id\].get.ts
git commit -m "feat: add GET /api/listings/:id endpoint"
```

---

### Task 7: PATCH /api/listings/:id - Update listing

**Files:**
- Create: `server/api/listings/[id].patch.ts`

- [ ] **Step 1: Create the endpoint**

Create `server/api/listings/[id].patch.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const body = await readBody(event)
  const db = useDB()

  // Check existence
  const [existing] = await db.select().from(listings).where(eq(listings.id, id))
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  const updates: Record<string, any> = { updatedAt: Date.now() }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.price !== undefined) updates.price = body.price

  await db.update(listings).set(updates).where(eq(listings.id, id))

  const [updated] = await db.select().from(listings).where(eq(listings.id, id))

  return {
    listing: {
      ...updated,
      marketData: updated.marketData ? JSON.parse(updated.marketData) : null,
      aiStats: updated.aiStats ? JSON.parse(updated.aiStats) : null,
    },
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/listings/\[id\].patch.ts
git commit -m "feat: add PATCH /api/listings/:id endpoint"
```

---

### Task 8: DELETE /api/listings/:id - Delete listing

**Files:**
- Create: `server/api/listings/[id].delete.ts`

- [ ] **Step 1: Create the endpoint**

Create `server/api/listings/[id].delete.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const db = useDB()

  const [existing] = await db.select().from(listings).where(eq(listings.id, id))
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  await db.delete(listings).where(eq(listings.id, id))

  return { ok: true }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/listings/\[id\].delete.ts
git commit -m "feat: add DELETE /api/listings/:id endpoint"
```

---

### Task 9: Add generateThumbnail() utility

**Files:**
- Modify: `app/utils/image.ts`

- [ ] **Step 1: Add the function**

Add this function at the end of `app/utils/image.ts`, before the `fileToPreview` function:

```typescript
const THUMB_DIMENSION = 200

/**
 * Generate a small thumbnail (200px max) as base64 for storage
 */
export function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > THUMB_DIMENSION || height > THUMB_DIMENSION) {
        const ratio = Math.min(THUMB_DIMENSION / width, THUMB_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      resolve(dataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Impossible de lire l'image: ${file.name}`))
    }

    img.src = url
  })
}
```

Note: This returns the full `data:image/jpeg;base64,...` URL (not stripped) so it can be used directly as `<img src>` and stored as-is.

- [ ] **Step 2: Commit**

```bash
git add app/utils/image.ts
git commit -m "feat: add generateThumbnail() utility for listing cards"
```

---

### Task 10: Auto-save listing after analysis

**Files:**
- Modify: `app/composables/useAnalyze.ts`

- [ ] **Step 1: Import generateThumbnail**

At the top of `app/composables/useAnalyze.ts`, add `generateThumbnail` to the import:

```typescript
import { fileToBase64, fileToPreview, getMediaType, isValidImageFile, getFileSizeError, generateThumbnail } from '~/utils/image'
```

- [ ] **Step 2: Add savedListingId ref**

After the `isRefining` ref declaration (line 42), add:

```typescript
const savedListingId = ref<string | null>(null)
```

- [ ] **Step 3: Add save logic after successful analysis**

Inside the `analyze` function, after `step.value = 'result'` (line 164), add the auto-save logic:

```typescript
      step.value = 'result'

      // Auto-save to database (only on first generation, not refinement)
      if (!wasOnResult) {
        try {
          const thumbnail = images.value.length > 0
            ? await generateThumbnail(images.value[0])
            : null

          const saved = await $fetch<{ listing: { id: string } }>('/api/listings', {
            method: 'POST',
            body: {
              title: title.value,
              description: description.value,
              price: price.value,
              category: category.value,
              thumbnail,
              context: context.value,
              marketData: market.value,
              aiStats: aiStats.value,
            },
          })
          savedListingId.value = saved.listing.id
        } catch (e) {
          console.warn('Auto-save failed:', e)
          // Non-blocking: don't show error to user
        }
      } else if (savedListingId.value) {
        // Update existing listing on refinement
        try {
          await $fetch(`/api/listings/${savedListingId.value}`, {
            method: 'PATCH',
            body: {
              title: title.value,
              description: description.value,
              price: price.value,
            },
          })
        } catch (e) {
          console.warn('Auto-update failed:', e)
        }
      }
```

- [ ] **Step 4: Reset savedListingId in the reset function**

In the `reset()` function, add after `market.value = null`:

```typescript
    savedListingId.value = null
```

- [ ] **Step 5: Add savedListingId to the return object**

Add `savedListingId` to the return object of `useAnalyze()`:

```typescript
  return {
    // ... existing fields ...
    savedListingId,
    // ... existing functions ...
  }
```

- [ ] **Step 6: Commit**

```bash
git add app/composables/useAnalyze.ts
git commit -m "feat: auto-save listings to Turso after analysis"
```

---

### Task 11: SearchBar component

**Files:**
- Create: `app/components/SearchBar.vue`

- [ ] **Step 1: Create the component**

Create `app/components/SearchBar.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', value)
  }, 300)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="search-bar">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text"
      :value="modelValue"
      placeholder="Rechercher une annonce..."
      class="search-input"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.search-bar {
  position: relative;
  margin-bottom: 24px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #555;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: rgba(108, 99, 255, 0.4);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/SearchBar.vue
git commit -m "feat: add SearchBar component with debounce"
```

---

### Task 12: ListingCard component

**Files:**
- Create: `app/components/ListingCard.vue`

- [ ] **Step 1: Create the component**

Create `app/components/ListingCard.vue`:

```vue
<script setup lang="ts">
defineProps<{
  id: string
  title: string
  price: string
  thumbnail: string | null
  createdAt: number
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "A l'instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Il y a ${days}j`
  const months = Math.floor(days / 30)
  return `Il y a ${months} mois`
}
</script>

<template>
  <div class="card">
    <NuxtLink :to="`/history/${id}`" class="card-link">
      <div class="card-thumb">
        <img v-if="thumbnail" :src="thumbnail" alt="" class="thumb-img" />
        <div v-else class="thumb-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      </div>
      <div class="card-body">
        <p class="card-title">{{ title }}</p>
        <div class="card-meta">
          <span class="card-price">{{ price }} &euro;</span>
          <span class="card-date">{{ timeAgo(createdAt) }}</span>
        </div>
      </div>
    </NuxtLink>
    <button class="delete-btn" title="Supprimer" @click.stop="emit('delete', id)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.card-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}

.card-thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #d0d0d0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-price {
  font-size: 14px;
  font-weight: 700;
  color: #6c63ff;
  font-family: 'Space Mono', monospace;
}

.card-date {
  font-size: 11px;
  color: #555;
}

.delete-btn {
  background: none;
  border: none;
  color: #444;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  color: #ff6b6b;
  background: rgba(255, 80, 80, 0.08);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ListingCard.vue
git commit -m "feat: add ListingCard component"
```

---

### Task 13: History page

**Files:**
- Create: `app/pages/history.vue`

- [ ] **Step 1: Create the page**

Create `app/pages/history.vue`:

```vue
<script setup lang="ts">
import type { Listing } from '~/server/database/schema'

const search = ref('')
const listings = ref<Listing[]>([])
const loading = ref(true)
const error = ref('')
const confirmDeleteId = ref<string | null>(null)

async function fetchListings() {
  loading.value = true
  error.value = ''
  try {
    const params = search.value ? `?q=${encodeURIComponent(search.value)}` : ''
    const data = await $fetch<{ listings: Listing[] }>(`/api/listings${params}`)
    listings.value = data.listings
  } catch (e: any) {
    error.value = 'Impossible de charger les annonces.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function deleteListing(id: string) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id
    return
  }
  try {
    await $fetch(`/api/listings/${id}`, { method: 'DELETE' })
    listings.value = listings.value.filter((l) => l.id !== id)
    confirmDeleteId.value = null
  } catch (e: any) {
    error.value = 'Erreur lors de la suppression.'
    console.error(e)
  }
}

// Watch search changes
watch(search, () => {
  fetchListings()
})

// Initial load
onMounted(() => {
  fetchListings()
})

// Click outside resets confirm
function resetConfirm() {
  confirmDeleteId.value = null
}
</script>

<template>
  <div class="app">
    <div class="bg-glow bg-glow-1" />
    <div class="bg-glow bg-glow-2" />

    <header class="header">
      <NuxtLink to="/" class="back-btn" title="Retour">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="page-title">Historique</h1>
        <p class="page-sub">{{ listings.length }} annonce{{ listings.length !== 1 ? 's' : '' }}</p>
      </div>
    </header>

    <main class="main" @click="resetConfirm">
      <SearchBar v-model="search" />

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="loading" class="loading">Chargement...</div>

      <div v-else-if="listings.length === 0" class="empty">
        <p class="empty-icon">&#128466;</p>
        <p class="empty-text">
          {{ search ? 'Aucun resultat' : 'Aucune annonce sauvegardee' }}
        </p>
        <NuxtLink v-if="!search" to="/" class="empty-link">
          &#10024; Creer ma premiere annonce
        </NuxtLink>
      </div>

      <div v-else class="listing-list">
        <ListingCard
          v-for="listing in listings"
          :key="listing.id"
          :id="listing.id"
          :title="listing.title"
          :price="listing.price"
          :thumbnail="listing.thumbnail"
          :created-at="listing.createdAt"
          @delete="deleteListing"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #0a0a14;
  font-family: 'DM Sans', sans-serif;
  color: #e0e0e0;
  position: relative;
  overflow: hidden;
}

.bg-glow {
  position: fixed;
  pointer-events: none;
}
.bg-glow-1 {
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(108, 99, 255, 0.08) 0%, transparent 70%);
}
.bg-glow-2 {
  bottom: -200px;
  left: -200px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 107, 157, 0.06) 0%, transparent 70%);
}

.header {
  padding: 28px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #c8c8d0;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  font-family: 'Space Mono', monospace;
  color: #fff;
}
.page-sub {
  margin: 0;
  font-size: 11px;
  color: #666;
  letter-spacing: 0.06em;
}

.main {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 20px;
}

.error-box {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 80, 80, 0.1);
  border: 1px solid rgba(255, 80, 80, 0.2);
  color: #ff8080;
  font-size: 13px;
}

.loading {
  text-align: center;
  color: #555;
  font-size: 14px;
  padding: 40px 0;
}

.empty {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.empty-text {
  color: #555;
  font-size: 14px;
  margin-bottom: 20px;
}
.empty-link {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c63ff 0%, #ff6b9d 100%);
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.empty-link:hover {
  box-shadow: 0 8px 32px rgba(108, 99, 255, 0.3);
  transform: translateY(-1px);
}

.listing-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/history.vue
git commit -m "feat: add history page with search and listing display"
```

---

### Task 14: History detail/edit page

**Files:**
- Create: `app/pages/history/[id].vue`

- [ ] **Step 1: Create the detail page**

Create `app/pages/history/[id].vue`:

```vue
<script setup lang="ts">
import type { Listing } from '~/server/database/schema'

const route = useRoute()
const id = route.params.id as string

const listing = ref<Listing | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

async function fetchListing() {
  loading.value = true
  try {
    const data = await $fetch<{ listing: Listing }>(`/api/listings/${id}`)
    listing.value = data.listing
  } catch (e: any) {
    error.value = 'Annonce introuvable.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!listing.value) return
  saving.value = true
  try {
    const data = await $fetch<{ listing: Listing }>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: {
        title: listing.value.title,
        description: listing.value.description,
        price: listing.value.price,
      },
    })
    listing.value = data.listing
    showToast('Sauvegarde !')
  } catch (e: any) {
    error.value = 'Erreur lors de la sauvegarde.'
  } finally {
    saving.value = false
  }
}

async function deleteListing() {
  try {
    await $fetch(`/api/listings/${id}`, { method: 'DELETE' })
    navigateTo('/history')
  } catch (e: any) {
    error.value = 'Erreur lors de la suppression.'
  }
}

function showToast(msg: string) {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`${label} copie !`)
  } catch {
    showToast('Erreur de copie')
  }
}

const fullAnnonce = computed(() => {
  if (!listing.value) return ''
  return `${listing.value.title}\n\n${listing.value.description}\n\nPrix : ${listing.value.price} EUR`
})

onMounted(fetchListing)
</script>

<template>
  <div class="app">
    <div class="bg-glow bg-glow-1" />
    <div class="bg-glow bg-glow-2" />

    <header class="header">
      <NuxtLink to="/history" class="back-btn" title="Retour">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="page-title">Detail</h1>
      </div>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">Chargement...</div>

      <div v-else-if="error" class="error-box">{{ error }}</div>

      <div v-else-if="listing" class="detail fade-in">
        <!-- Thumbnail -->
        <div v-if="listing.thumbnail" class="thumb-wrap">
          <img :src="listing.thumbnail" alt="" class="thumb-img" />
        </div>

        <!-- Category -->
        <span v-if="listing.category" class="category-badge">{{ listing.category }}</span>

        <!-- Title -->
        <div class="field">
          <label class="field-label">Titre</label>
          <input v-model="listing.title" class="input title-input" />
        </div>

        <!-- Description -->
        <div class="field">
          <label class="field-label">Description</label>
          <textarea v-model="listing.description" rows="6" class="input desc-input" />
        </div>

        <!-- Price -->
        <div class="field">
          <label class="field-label">Prix</label>
          <div class="price-row">
            <input v-model="listing.price" class="input price-input" />
            <span class="price-euro">&euro;</span>
          </div>
        </div>

        <!-- Save button -->
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder les modifications' }}
        </button>

        <div class="divider" />

        <!-- Copy buttons -->
        <div class="section">
          <p class="section-label">Copier</p>
          <div class="btn-row">
            <CopyButton label="Titre" @copy="copyText(listing.title, 'Titre')" />
            <CopyButton label="Description" @copy="copyText(listing.description, 'Description')" />
            <CopyButton label="Prix" @copy="copyText(`${listing.price} EUR`, 'Prix')" />
            <CopyButton label="Annonce complete" @copy="copyText(fullAnnonce, 'Annonce')" />
          </div>
        </div>

        <div class="divider" />

        <!-- Delete -->
        <button class="delete-btn" @click="deleteListing">
          Supprimer cette annonce
        </button>
      </div>
    </main>

    <ToastNotification :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #0a0a14;
  font-family: 'DM Sans', sans-serif;
  color: #e0e0e0;
  position: relative;
  overflow: hidden;
}
.bg-glow { position: fixed; pointer-events: none; }
.bg-glow-1 { top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(108, 99, 255, 0.08) 0%, transparent 70%); }
.bg-glow-2 { bottom: -200px; left: -200px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(255, 107, 157, 0.06) 0%, transparent 70%); }

.header {
  padding: 28px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { border-color: rgba(255, 255, 255, 0.2); color: #c8c8d0; }
.page-title { margin: 0; font-size: 20px; font-weight: 800; font-family: 'Space Mono', monospace; color: #fff; }

.main { max-width: 640px; margin: 0 auto; padding: 32px 20px; }

.loading { text-align: center; color: #555; font-size: 14px; padding: 40px 0; }
.error-box { margin-bottom: 16px; padding: 12px 16px; border-radius: 12px; background: rgba(255, 80, 80, 0.1); border: 1px solid rgba(255, 80, 80, 0.2); color: #ff8080; font-size: 13px; }

.fade-in { animation: fadeIn 0.4s ease; }

.thumb-wrap { margin-bottom: 20px; }
.thumb-img { width: 80px; height: 80px; border-radius: 12px; object-fit: cover; border: 2px solid rgba(255, 255, 255, 0.06); }

.category-badge {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(108, 99, 255, 0.12);
  color: #a8a4ff;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: 0.03em;
}

.field { margin-bottom: 20px; }
.field-label { font-size: 12px; color: #666; font-weight: 600; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }

.input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.input:focus { border-color: rgba(108, 99, 255, 0.4); }
.title-input { font-size: 18px; font-weight: 700; font-family: 'Space Mono', monospace; color: #fff; }
.desc-input { line-height: 1.7; resize: vertical; }

.price-row { display: flex; align-items: center; gap: 8px; }
.price-input { width: 120px; font-size: 28px; font-weight: 800; font-family: 'Space Mono', monospace; color: #6c63ff; text-align: center; }
.price-euro { font-size: 24px; font-weight: 700; color: #6c63ff; font-family: 'Space Mono', monospace; }

.save-btn {
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #6c63ff 0%, #ff6b9d 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
  box-shadow: 0 8px 32px rgba(108, 99, 255, 0.3);
  margin-bottom: 8px;
}
.save-btn:hover { box-shadow: 0 12px 40px rgba(108, 99, 255, 0.4); transform: translateY(-1px); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.divider { height: 1px; background: rgba(255, 255, 255, 0.06); margin: 20px 0; }

.section { margin-bottom: 20px; }
.section-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.btn-row { display: flex; flex-wrap: wrap; gap: 8px; }

.delete-btn {
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 80, 80, 0.2);
  background: rgba(255, 80, 80, 0.06);
  color: #ff8080;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}
.delete-btn:hover { background: rgba(255, 80, 80, 0.12); border-color: rgba(255, 80, 80, 0.3); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/history/\[id\].vue
git commit -m "feat: add listing detail/edit page"
```

---

### Task 15: Add "Historique" navigation link to main page

**Files:**
- Modify: `app/pages/index.vue`

- [ ] **Step 1: Add history link next to the logout button**

In `app/pages/index.vue`, add a history link in the header, right before the logout button (before line 55):

```vue
      <NuxtLink to="/history" class="history-btn" title="Historique">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </NuxtLink>
```

- [ ] **Step 2: Add the style**

Add to the `<style scoped>` section of `app/pages/index.vue`:

```css
.history-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: #555;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.2s;
}
.history-btn:hover {
  color: #a8a4ff;
  border-color: rgba(108, 99, 255, 0.3);
}
```

- [ ] **Step 3: Remove `margin-left: auto` from logout button**

Since the history button now has `margin-left: auto`, remove it from the `.logout-btn` style so the logout button sits right next to it:

Change in `.logout-btn`:
```css
/* Remove this line: */
margin-left: auto;
```

- [ ] **Step 4: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat: add history navigation link to main page header"
```

---

### Task 16: Smoke test and final commit

- [ ] **Step 1: Run the dev server and verify**

```bash
cd /Users/xavier/Developer/sellsnap
npm run dev
```

Verify in browser:
1. Generate a listing with a photo → should auto-save (check no console errors)
2. Navigate to `/history` → should see the saved listing with thumbnail
3. Click a listing → should open detail page with editable fields
4. Edit title and save → should persist
5. Delete a listing → should remove from list
6. Search by title → should filter results

- [ ] **Step 2: Build check**

```bash
npm run build
```

Ensure no TypeScript errors or build failures.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-02-listing-history.md`.
