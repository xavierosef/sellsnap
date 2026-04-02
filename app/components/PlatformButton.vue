<script setup lang="ts">
const props = defineProps<{
  name: string
  color: string
  url: string
  copyText?: string
}>()

const emit = defineEmits<{
  copied: [text: string]
}>()

async function handleClick() {
  if (props.copyText) {
    try {
      await navigator.clipboard.writeText(props.copyText)
      emit('copied', props.copyText)
    } catch {
      // Silently fail, still open the link
    }
  }
}
</script>

<template>
  <a
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    class="platform-btn"
    :style="{ background: color, boxShadow: `0 4px 16px ${color}44` }"
    @click="handleClick"
  >
    <slot />
    {{ name }}
  </a>
</template>

<style scoped>
.platform-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}
.platform-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}
</style>
