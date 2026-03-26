<script setup lang="ts">
defineProps<{
  name: string
  color: string
  url: string
}>()
</script>

<template>
  <a
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    class="platform-btn"
    :style="{ background: color, boxShadow: `0 4px 16px ${color}44` }"
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
