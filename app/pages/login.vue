<script setup lang="ts">
definePageMeta({ layout: false })

const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })
    navigateTo('/')
  } catch (err: any) {
    error.value = err.statusCode === 401
      ? 'Mot de passe incorrect'
      : 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg-1" />
    <div class="login-bg-2" />

    <div class="login-card">
      <div class="login-logo">
        <div class="logo-icon">&#128248;</div>
        <h1 class="logo-text">SellSnap</h1>
        <p class="logo-sub">Annonce en un snap</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="input-wrapper">
          <input
            v-model="password"
            type="password"
            placeholder="Mot de passe"
            autocomplete="current-password"
            class="login-input"
            :class="{ shake: error }"
            autofocus
          />
          <div v-if="error" class="login-error">{{ error }}</div>
        </div>

        <button
          type="submit"
          class="login-btn"
          :disabled="loading || !password"
        >
          <template v-if="loading">
            <div class="login-spinner" />
          </template>
          <template v-else>
            Entrer
          </template>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #0a0a14;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  position: relative;
  overflow: hidden;
}

.login-bg-1 {
  position: fixed;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(108, 99, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
}
.login-bg-2 {
  position: fixed;
  bottom: -200px;
  left: -200px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 107, 157, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.login-card {
  width: 100%;
  max-width: 360px;
  padding: 48px 32px;
  animation: fadeIn 0.5s ease;
}

.login-logo {
  text-align: center;
  margin-bottom: 40px;
}
.logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6c63ff, #ff6b9d);
  font-size: 26px;
  margin-bottom: 16px;
}
.logo-text {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: 'Space Mono', monospace;
  background: linear-gradient(135deg, #fff 0%, #a8a4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: #555;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-wrapper {
  position: relative;
}

.login-input {
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #e0e0e0;
  font-size: 15px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
  text-align: center;
  letter-spacing: 0.15em;
}
.login-input:focus {
  border-color: rgba(108, 99, 255, 0.5);
}
.login-input::placeholder {
  letter-spacing: 0.02em;
  color: #444;
}

.login-input.shake {
  animation: shake 0.4s ease;
  border-color: rgba(255, 80, 80, 0.4);
}

.login-error {
  margin-top: 8px;
  font-size: 13px;
  color: #ff8080;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  background: linear-gradient(135deg, #6c63ff 0%, #ff6b9d 100%);
  color: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(108, 99, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}
.login-btn:hover:not(:disabled) {
  box-shadow: 0 12px 40px rgba(108, 99, 255, 0.4);
  transform: translateY(-1px);
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
