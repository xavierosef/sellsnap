<script setup lang="ts">
import type { Listing } from '~~/server/database/schema'

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

watch(search, () => {
  fetchListings()
})

onMounted(() => {
  fetchListings()
})

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
