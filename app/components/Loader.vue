<script setup lang="ts">
const props = defineProps<{
  elapsed: number
}>()

const emit = defineEmits<{
  cancel: []
}>()

const PROGRESS_STEPS = [
  { label: 'Préparation des images', icon: '🖼️', duration: 2000 },
  { label: "Envoi à l'IA", icon: '📡', duration: 3000 },
  { label: 'Analyse visuelle', icon: '🔍', duration: 5000 },
  { label: "Identification de l'article", icon: '🏷️', duration: 4000 },
  { label: 'Estimation du prix', icon: '💰', duration: 3000 },
  { label: "Rédaction de l'annonce", icon: '✍️', duration: 4000 },
  { label: 'Finalisation', icon: '✨', duration: 3000 },
]

const currentStep = computed(() => {
  let cumulative = 0
  for (let i = 0; i < PROGRESS_STEPS.length; i++) {
    cumulative += PROGRESS_STEPS[i].duration
    if (props.elapsed < cumulative) return i
  }
  return PROGRESS_STEPS.length - 1
})

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="loader">
    <!-- Spinner -->
    <div class="spinner-container">
      <div class="spinner-outer" />
      <div class="spinner-inner" />
      <div class="spinner-icon">{{ PROGRESS_STEPS[currentStep]?.icon }}</div>
    </div>

    <!-- Steps list -->
    <div class="steps">
      <div
        v-for="(s, i) in PROGRESS_STEPS"
        :key="i"
        class="step"
        :class="{
          done: i < currentStep,
          active: i === currentStep,
          hidden: i > currentStep + 1,
        }"
      >
        <div
          class="step-dot"
          :class="{
            done: i < currentStep,
            active: i === currentStep,
          }"
        >
          <template v-if="i < currentStep">&#10003;</template>
          <div v-else-if="i === currentStep" class="pulse-dot" />
        </div>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <!-- Timer -->
    <div class="timer">
      <div class="timer-dot" />
      <span>{{ formatTime(elapsed) }}</span>
    </div>

    <!-- Cancel -->
    <button class="cancel-btn" @click="emit('cancel')">Annuler</button>
  </div>
</template>

<style scoped>
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 48px 20px;
  animation: fadeIn 0.4s ease;
}

.spinner-container {
  position: relative;
  width: 64px;
  height: 64px;
}
.spinner-outer {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.06);
  border-top-color: #6c63ff;
  animation: spin 1s linear infinite;
}
.spinner-inner {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.04);
  border-top-color: #ff6b9d;
  animation: spin 1.5s linear infinite reverse;
}
.spinner-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.steps {
  width: 100%;
  max-width: 320px;
}
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  opacity: 0.35;
  transition: opacity 0.5s ease;
}
.step.done {
  opacity: 0.5;
}
.step.active {
  opacity: 1;
}
.step.hidden {
  opacity: 0.2;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid transparent;
  color: #555;
  transition: all 0.4s ease;
}
.step-dot.done {
  background: rgba(108, 99, 255, 0.25);
  color: #6c63ff;
}
.step-dot.active {
  background: rgba(108, 99, 255, 0.15);
  border-color: #6c63ff;
  color: #a8a4ff;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6c63ff;
  animation: pulse 1.2s ease infinite;
}

.step-label {
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  color: #444;
  transition: all 0.4s ease;
}
.step.done .step-label {
  color: #666;
}
.step.active .step-label {
  color: #e0e0e0;
  font-weight: 600;
}

.timer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  margin-top: 4px;
}
.timer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6c63ff;
  animation: pulse 1.2s ease infinite;
}
.timer span {
  font-size: 12px;
  color: #666;
  font-family: 'Space Mono', monospace;
}

.cancel-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}
.cancel-btn:hover {
  border-color: rgba(255, 80, 80, 0.3);
  color: #ff8080;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
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
