<script setup lang="ts">
import type { AiStats, MarketData } from '~/composables/useAnalyze'

const props = defineProps<{
  previews: string[]
  title: string
  description: string
  price: string
  category: string
  isRefining: boolean
  aiStats: AiStats | null
  market: MarketData | null
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:description': [value: string]
  'update:price': [value: string]
  refine: [context: string]
  reset: []
  toast: [message: string]
}>()

const editContext = ref('')

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    emit('toast', `${label} copié !`)
  } catch {
    emit('toast', 'Erreur de copie')
  }
}

const fullAnnonce = computed(
  () => `${props.title}\n\n${props.description}\n\nPrix : ${props.price} €`
)

async function shareAnnonce() {
  const text = fullAnnonce.value
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title, text })
      return
    } catch {
      // User cancelled or share failed, fallback to copy
    }
  }
  await copyText(text, 'Annonce')
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `${(usd * 100).toFixed(2)}¢`
  return `$${usd.toFixed(3)}`
}

function shortModel(model: string): string {
  if (model.includes('sonnet')) return 'Sonnet 4'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('opus')) return 'Opus'
  return model.split('-').slice(0, 2).join(' ')
}

function submitRefine() {
  if (editContext.value.trim()) {
    emit('refine', editContext.value)
    editContext.value = ''
  }
}
</script>

<template>
  <div class="result">
    <!-- Photo recap -->
    <div class="photo-recap">
      <img
        v-for="(src, i) in previews"
        :key="i"
        :src="src"
        alt=""
        class="recap-thumb"
      />
    </div>

    <!-- Category badge -->
    <span v-if="category" class="category-badge">{{ category }}</span>

    <!-- Title -->
    <div class="field">
      <label class="field-label">Titre</label>
      <input
        :value="title"
        class="input title-input"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Description -->
    <div class="field">
      <label class="field-label">Description</label>
      <textarea
        :value="description"
        rows="6"
        class="input desc-input"
        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Price + Market side by side -->
    <div class="price-market-row">
      <div class="price-block">
        <label class="field-label">Prix suggéré</label>
        <div class="price-row">
          <input
            :value="price"
            class="input price-input"
            @input="emit('update:price', ($event.target as HTMLInputElement).value)"
          />
          <span class="price-euro">&euro;</span>
        </div>
      </div>

      <div v-if="market" class="market-box">
        <div class="market-header">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><polyline points="18 9 12 15 9 12 3 18"/></svg>
          <span>Marché LeBonCoin</span>
          <span class="market-count">{{ market.stats.count }} ann.</span>
        </div>
        <div class="market-stats-row">
          <div class="market-stat">
            <span class="market-stat-val">{{ market.stats.min }}&euro;</span>
            <span class="market-stat-lbl">Min</span>
          </div>
          <div class="market-stat highlight">
            <span class="market-stat-val">{{ market.stats.median }}&euro;</span>
            <span class="market-stat-lbl">Méd.</span>
          </div>
          <div class="market-stat">
            <span class="market-stat-val">{{ market.stats.average }}&euro;</span>
            <span class="market-stat-lbl">Moy.</span>
          </div>
          <div class="market-stat">
            <span class="market-stat-val">{{ market.stats.max }}&euro;</span>
            <span class="market-stat-lbl">Max</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Market listings (expandable, below) -->
    <div v-if="market" class="market-listings-box">
      <details class="market-details">
        <summary class="market-summary">Voir les {{ market.listings.length }} annonces similaires</summary>
        <div class="market-listings">
          <a
            v-for="(listing, i) in market.listings"
            :key="i"
            :href="listing.url"
            target="_blank"
            rel="noopener noreferrer"
            class="market-listing"
          >
            <span class="market-listing-title">{{ listing.title }}</span>
            <span class="market-listing-price">{{ listing.price }} &euro;</span>
          </a>
        </div>
      </details>
    </div>

    <!-- Divider -->
    <div class="divider" />

    <!-- Copy buttons -->
    <div class="section">
      <p class="section-label">Copier</p>
      <div class="btn-row">
        <CopyButton label="Titre" @copy="copyText(title, 'Titre')" />
        <CopyButton label="Description" @copy="copyText(description, 'Description')" />
        <CopyButton label="Prix" @copy="copyText(`${price} €`, 'Prix')" />
        <CopyButton label="Annonce complète" @copy="copyText(fullAnnonce, 'Annonce')" />
        <button class="share-btn" @click="shareAnnonce">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Partager
        </button>
      </div>
    </div>

    <!-- Platform buttons -->
    <div class="section">
      <p class="section-label">Publier sur</p>
      <p class="section-hint">Le titre est copie automatiquement au clic</p>
      <div class="btn-row">
        <PlatformButton name="LeBonCoin" color="#F56B2A" url="https://www.leboncoin.fr/deposer-une-annonce" :copy-text="title" @copied="emit('toast', 'Titre copie !')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 13v10h-6v-6h-6v6H3V13H0L12 1l12 12h-3z"/></svg>
        </PlatformButton>
        <PlatformButton name="Vinted" color="#09B1BA" url="https://www.vinted.fr/items/new" :copy-text="title" @copied="emit('toast', 'Titre copie !')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
        </PlatformButton>
        <PlatformButton name="Facebook" color="#1877F2" url="https://www.facebook.com/marketplace/create/item" :copy-text="title" @copied="emit('toast', 'Titre copie !')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </PlatformButton>
        <PlatformButton name="eBay" color="#E53238" url="https://www.ebay.fr/sell/create" :copy-text="title" @copied="emit('toast', 'Titre copie !')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.762 13.941c0 1.7 1.105 2.833 2.85 2.833 1.848 0 3.026-1.153 3.026-2.966v-.373H8.612c-1.764 0-2.85.686-2.85 2.506z"/></svg>
        </PlatformButton>
      </div>
    </div>

    <!-- Refine -->
    <div class="refine-box">
      <label class="field-label">&#128295; Affiner l'annonce</label>
      <div class="refine-row">
        <input
          v-model="editContext"
          placeholder="Ex: Baisse le prix, mentionne la garantie restante..."
          class="input refine-input"
          :disabled="isRefining"
          @keydown.enter="submitRefine"
        />
        <button
          class="refine-btn"
          :class="{ active: editContext.trim(), spinning: isRefining }"
          :disabled="isRefining || !editContext.trim()"
          @click="submitRefine"
        >
          <span v-if="isRefining" class="spinner" />
          <span v-else>Régénérer</span>
        </button>
      </div>
    </div>

    <!-- AI Stats -->
    <div v-if="aiStats" class="ai-stats">
      <div class="ai-stats-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Stats IA</span>
      </div>
      <div class="ai-stats-grid">
        <div class="ai-stat">
          <span class="ai-stat-value">{{ formatDuration(aiStats.durationMs) }}</span>
          <span class="ai-stat-label">Durée</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-value">{{ aiStats.inputTokens + aiStats.outputTokens }}</span>
          <span class="ai-stat-label">Tokens</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-value">{{ formatCost(aiStats.costUsd) }}</span>
          <span class="ai-stat-label">Coût</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-value">{{ shortModel(aiStats.model) }}</span>
          <span class="ai-stat-label">Modèle</span>
        </div>
      </div>
    </div>

    <!-- New listing -->
    <button class="new-btn" @click="emit('reset')">
      + Nouvelle annonce
    </button>
  </div>
</template>

<style scoped>
.result {
  animation: fadeIn 0.5s ease;
}

.photo-recap {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.recap-thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.06);
}

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

.field {
  margin-bottom: 20px;
}
.field-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

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
.input:focus {
  border-color: rgba(108, 99, 255, 0.4);
}

.title-input {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
  color: #fff;
}

.desc-input {
  line-height: 1.7;
  resize: vertical;
}

.price-market-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 20px;
}
.price-block {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.price-block .price-row {
  flex: 1;
  display: flex;
  align-items: center;
}

@media (max-width: 500px) {
  .price-market-row {
    flex-direction: column;
    gap: 12px;
  }
}
.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-input {
  width: 100px;
  font-size: 28px;
  font-weight: 800;
  font-family: 'Space Mono', monospace;
  color: #6c63ff;
  text-align: center;
}
.price-euro {
  font-size: 24px;
  font-weight: 700;
  color: #6c63ff;
  font-family: 'Space Mono', monospace;
}

.refine-box {
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 28px;
}
.refine-row {
  display: flex;
  gap: 8px;
}
.refine-input {
  flex: 1;
  border-radius: 10px;
  font-size: 13px;
  padding: 12px 14px;
}
.refine-btn {
  padding: 12px 18px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: not-allowed;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}
.refine-btn.active {
  background: rgba(108, 99, 255, 0.2);
  color: #a8a4ff;
  cursor: pointer;
}
.refine-btn.spinning {
  background: rgba(108, 99, 255, 0.15);
  cursor: wait;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(168, 164, 255, 0.3);
  border-top-color: #a8a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.refine-btn.active:hover {
  background: rgba(108, 99, 255, 0.3);
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid rgba(108, 99, 255, 0.2);
  background: rgba(108, 99, 255, 0.08);
  color: #a8a4ff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}
.share-btn:hover {
  background: rgba(108, 99, 255, 0.15);
  border-color: rgba(108, 99, 255, 0.3);
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 8px 0 24px;
}

.section {
  margin-bottom: 20px;
}
.section-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.section-hint {
  font-size: 11px;
  color: #444;
  margin-top: -6px;
  margin-bottom: 12px;
  font-style: italic;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.market-box {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.market-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.market-count {
  margin-left: auto;
  color: #444;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
.market-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.market-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.market-stat-val {
  font-size: 12px;
  font-weight: 600;
  color: #777;
  font-family: 'Space Mono', monospace;
}
.market-stat.highlight .market-stat-val {
  color: #6c63ff;
}
.market-stat-lbl {
  font-size: 9px;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.market-listings-box {
  margin-bottom: 16px;
}
.market-details {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.market-summary {
  padding: 10px 14px;
  font-size: 11px;
  color: #555;
  cursor: pointer;
  list-style: none;
  transition: color 0.2s;
}
.market-summary::-webkit-details-marker {
  display: none;
}
.market-summary::before {
  content: '+ ';
  color: #6c63ff;
}
details[open] .market-summary::before {
  content: '- ';
}
.market-summary:hover {
  color: #888;
}
.market-listings {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 10px 10px;
}
.market-listing {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s;
}
.market-listing:hover {
  background: rgba(255, 255, 255, 0.04);
}
.market-listing-title {
  font-size: 11px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
.market-listing-price {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  font-family: 'Space Mono', monospace;
  flex-shrink: 0;
}

.ai-stats {
  margin-top: 12px;
  margin-bottom: 20px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ai-stats-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.ai-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ai-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.ai-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  font-family: 'Space Mono', monospace;
}
.ai-stat-label {
  font-size: 10px;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.new-btn {
  width: 100%;
  margin-top: 12px;
  padding: 14px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #888;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}
.new-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #c8c8d0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
