<script setup lang="ts">
import type { Listing } from '~~/server/database/schema'

const route = useRoute()
const id = route.params.id as string

const listing = ref<Listing | null>(null)
const loading = ref(true)
const error = ref('')
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function fetchListing() {
  loading.value = true
  try {
    const data = await $fetch<{ listing: Listing }>(`/api/listings/${id}`)
    listing.value = data.listing
    // Start watching for changes after initial load
    nextTick(() => {
      watch(
        () => listing.value ? [listing.value.title, listing.value.description, listing.value.price] : null,
        () => { if (listing.value) debouncedSave() },
        { deep: true }
      )
    })
  } catch (e: any) {
    error.value = 'Annonce introuvable.'
  } finally {
    loading.value = false
  }
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (!listing.value) return
    try {
      await $fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        body: {
          title: listing.value.title,
          description: listing.value.description,
          price: listing.value.price,
        },
      })
      showToast('Modifications enregistrees')
    } catch (e: any) {
      showToast('Erreur de sauvegarde')
    }
  }, 1000)
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
  }, 2500)
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

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="app">
    <div class="bg-glow bg-glow-1" />
    <div class="bg-glow bg-glow-2" />

    <!-- Toast top bar -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

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
        <div v-if="listing.thumbnail" class="thumb-wrap">
          <img :src="listing.thumbnail" alt="" class="thumb-img" />
        </div>

        <span v-if="listing.category" class="category-badge">{{ listing.category }}</span>

        <div class="field">
          <label class="field-label">Titre</label>
          <input v-model="listing.title" class="input title-input" />
        </div>

        <div class="field">
          <label class="field-label">Description</label>
          <textarea v-model="listing.description" rows="6" class="input desc-input" />
        </div>

        <div class="field">
          <label class="field-label">Prix</label>
          <div class="price-row">
            <input v-model="listing.price" class="input price-input" />
            <span class="price-euro">&euro;</span>
          </div>
        </div>

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

        <!-- Platform buttons -->
        <div class="section">
          <p class="section-label">Publier sur</p>
          <p class="section-hint">Le titre est copie automatiquement au clic</p>
          <div class="btn-row">
            <PlatformButton name="LeBonCoin" color="#F56B2A" url="https://www.leboncoin.fr/deposer-une-annonce" :copy-text="listing.title" @copied="showToast('Titre copie !')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 13v10h-6v-6h-6v6H3V13H0L12 1l12 12h-3z"/></svg>
            </PlatformButton>
            <PlatformButton name="Vinted" color="#09B1BA" url="https://www.vinted.fr/items/new" :copy-text="listing.title" @copied="showToast('Titre copie !')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            </PlatformButton>
            <PlatformButton name="Facebook" color="#1877F2" url="https://www.facebook.com/marketplace/create/item" :copy-text="listing.title" @copied="showToast('Titre copie !')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </PlatformButton>
            <PlatformButton name="eBay" color="#E53238" url="https://www.ebay.fr/sell/create" :copy-text="listing.title" @copied="showToast('Titre copie !')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.762 13.941c0 1.7 1.105 2.833 2.85 2.833 1.848 0 3.026-1.153 3.026-2.966v-.373H8.612c-1.764 0-2.85.686-2.85 2.506z"/></svg>
            </PlatformButton>
          </div>
        </div>

        <div class="divider" />

        <!-- Delete -->
        <button class="delete-btn" @click="deleteListing">
          Supprimer cette annonce
        </button>
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
.bg-glow { position: fixed; pointer-events: none; }
.bg-glow-1 { top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(108, 99, 255, 0.08) 0%, transparent 70%); }
.bg-glow-2 { bottom: -200px; left: -200px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(255, 107, 157, 0.06) 0%, transparent 70%); }

.toast-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(16, 16, 28, 0.95);
  border-bottom: 1px solid rgba(74, 222, 128, 0.2);
  backdrop-filter: blur(12px);
  font-size: 14px;
  font-weight: 600;
  color: #d0d0d0;
}

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { transform: translateY(-100%); opacity: 0; }
.toast-leave-to { transform: translateY(-100%); opacity: 0; }

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

.divider { height: 1px; background: rgba(255, 255, 255, 0.06); margin: 20px 0; }

.section { margin-bottom: 20px; }
.section-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.section-hint { font-size: 11px; color: #444; margin-top: -6px; margin-bottom: 12px; font-style: italic; }
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
