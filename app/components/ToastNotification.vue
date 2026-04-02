<script setup lang="ts">
defineProps<{
  message: string
  visible: boolean
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-slide">
      <div v-if="visible" class="toast-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
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
  font-family: 'DM Sans', sans-serif;
  color: #d0d0d0;
  pointer-events: none;
}

.toast-slide-enter-active { transition: all 0.3s ease; }
.toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from { transform: translateY(-100%); opacity: 0; }
.toast-slide-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
