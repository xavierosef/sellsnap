<script setup lang="ts">
defineProps<{
  message: string
  visible: boolean
}>()
</script>

<template>
  <Teleport to="body">
    <div class="toast" :class="{ visible }">
      {{ message }}
    </div>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 999;
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
