<script setup lang="ts">
const {
  step,
  images,
  previews,
  context,
  title,
  description,
  price,
  category,
  error,
  elapsed,
  isRefining,
  aiStats,
  market,
  addImages,
  removeImage,
  cancelAnalysis,
  analyze,
  reset,
} = useAnalyze()

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  navigateTo('/login')
}

function showToast(msg: string) {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}
</script>

<template>
  <div class="app">
    <!-- Background effects -->
    <div class="bg-glow bg-glow-1" />
    <div class="bg-glow bg-glow-2" />

    <!-- Header -->
    <header class="header">
      <div class="logo-icon">&#128248;</div>
      <div>
        <h1 class="logo-text">SellSnap</h1>
        <p class="logo-sub">Annonce en un snap</p>
      </div>
      <button class="logout-btn" title="Déconnexion" @click="logout">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </header>

    <!-- Main -->
    <main class="main">
      <!-- UPLOAD -->
      <div v-if="step === 'upload'" class="fade-in">
        <DropZone
          :previews="previews"
          :max-images="8"
          @files="addImages"
          @remove="removeImage"
        />

        <!-- Context -->
        <div class="context-field">
          <label class="context-label">&#128161; Contexte optionnel</label>
          <textarea
            v-model="context"
            placeholder="Ex: Acheté en 2022 chez Darty, très peu utilisé, vendu car déménagement..."
            rows="3"
            class="context-textarea"
          />
        </div>

        <!-- Error -->
        <div v-if="error" class="error-box">{{ error }}</div>

        <!-- Generate button -->
        <button
          class="generate-btn"
          :class="{ disabled: images.length === 0 }"
          :disabled="images.length === 0"
          @click="images.length > 0 && analyze()"
        >
          &#10024; Générer l'annonce
        </button>
      </div>

      <!-- ANALYZING -->
      <Loader
        v-if="step === 'analyzing'"
        :elapsed="elapsed"
        @cancel="cancelAnalysis"
      />

      <!-- RESULT -->
      <ResultView
        v-if="step === 'result'"
        :previews="previews"
        :title="title"
        :description="description"
        :price="price"
        :category="category"
        :is-refining="isRefining"
        :ai-stats="aiStats"
        :market="market"
        @update:title="title = $event"
        @update:description="description = $event"
        @update:price="price = $event"
        @refine="analyze($event)"
        @reset="reset()"
        @toast="showToast"
      />
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

.bg-glow {
  position: fixed;
  pointer-events: none;
}
.bg-glow-1 {
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(108, 99, 255, 0.08) 0%, transparent 70%);
}
.bg-glow-2 {
  bottom: -200px;
  left: -200px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 107, 157, 0.06) 0%, transparent 70%);
}

.header {
  padding: 28px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.logout-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: #555;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.logout-btn:hover {
  color: #ff8080;
  border-color: rgba(255, 80, 80, 0.2);
}
.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6c63ff, #ff6b9d);
  font-size: 20px;
}
.logo-text {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: 'Space Mono', monospace;
  background: linear-gradient(135deg, #fff 0%, #a8a4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo-sub {
  margin: 0;
  font-size: 11px;
  color: #666;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.main {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 20px;
}

.fade-in {
  animation: fadeIn 0.4s ease;
}

.context-field {
  margin-top: 20px;
}
.context-label {
  font-size: 13px;
  color: #888;
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}
.context-textarea {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.context-textarea:focus {
  border-color: rgba(108, 99, 255, 0.4);
}

.error-box {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 80, 80, 0.1);
  border: 1px solid rgba(255, 80, 80, 0.2);
  color: #ff8080;
  font-size: 13px;
}

.generate-btn {
  width: 100%;
  margin-top: 24px;
  padding: 16px 24px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #6c63ff 0%, #ff6b9d 100%);
  color: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(108, 99, 255, 0.3);
}
.generate-btn.disabled {
  background: rgba(255, 255, 255, 0.06);
  color: #555;
  cursor: not-allowed;
  box-shadow: none;
}
.generate-btn:not(.disabled):hover {
  box-shadow: 0 12px 40px rgba(108, 99, 255, 0.4);
  transform: translateY(-1px);
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
