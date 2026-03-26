<script setup lang="ts">
defineProps<{
  src: string
  index: number
}>()

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="thumb">
    <img :src="src" :alt="`Photo ${index + 1}`" />
    <button class="remove-btn" @click.stop="emit('remove')">&#10005;</button>
  </div>
</template>

<style scoped>
.thumb {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}
.remove-btn:hover {
  background: rgba(255, 60, 60, 0.7);
}
</style>
