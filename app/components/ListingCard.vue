<script setup lang="ts">
defineProps<{
  id: string
  title: string
  price: string
  thumbnail: string | null
  createdAt: number
  status: string
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
      <div class="card-thumb" :class="{ sold: status === 'sold' }">
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
          <span v-if="status === 'sold'" class="card-sold">Vendu</span>
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
  padding: 10px;
  margin-right: 10px;
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  color: #ff6b6b;
  background: rgba(255, 80, 80, 0.08);
}

.card-thumb.sold {
  opacity: 0.5;
}
.card-sold {
  font-size: 10px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
