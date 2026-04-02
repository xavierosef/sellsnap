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

        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder les modifications' }}
        </button>

        <div class="divider" />

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
