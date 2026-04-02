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
