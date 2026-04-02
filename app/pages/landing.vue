<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const status = ref<'idle' | 'loading' | 'registered' | 'already_registered' | 'error'>('idle')
const errorMsg = ref('')
const waitlistCount = ref(0)
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

async function handleSubmit() {
  if (!email.value.trim()) return
  status.value = 'loading'
  errorMsg.value = ''

  try {
    const res = await $fetch<{ ok: boolean; message: string; count?: number }>('/api/waitlist', {
      method: 'POST',
      body: { email: email.value },
    })

    if (res.message === 'already_registered') {
      status.value = 'already_registered'
    } else {
      status.value = 'registered'
      if (res.count) waitlistCount.value = res.count
    }
  } catch (err: any) {
    status.value = 'error'
    errorMsg.value = err?.data?.statusMessage || 'Une erreur est survenue'
  }
}
</script>

<template>
  <div class="landing" :class="{ visible: mounted }">
    <div class="bg-glow-1" />
    <div class="bg-glow-2" />
    <div class="bg-glow-3" />

    <!-- Hero -->
    <header class="hero">
      <div class="hero-inner">
        <div class="logo">
          <div class="logo-icon">&#128248;</div>
          <span class="logo-text">SellSnap</span>
        </div>

        <h1 class="hero-title">Vendez plus vite, au meilleur prix</h1>
        <p class="hero-subtitle">
          Prenez en photo, l'IA fait le reste. Titre, description, prix &mdash; votre annonce est pr&ecirc;te en secondes.
        </p>
      </div>
    </header>

    <!-- Features -->
    <section class="features">
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">&#128248;</div>
          <h3 class="feature-title">Photo &rarr; Annonce</h3>
          <p class="feature-desc">
            Prenez vos articles en photo et obtenez une annonce compl&egrave;te optimis&eacute;e pour la vente en quelques secondes.
          </p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">&#128202;</div>
          <h3 class="feature-title">Prix du march&eacute;</h3>
          <p class="feature-desc">
            Analyse automatique des prix sur LeBonCoin pour vous positionner au meilleur prix, comp&eacute;titif et r&eacute;aliste.
          </p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">&#128640;</div>
          <h3 class="feature-title">Multi-plateforme</h3>
          <p class="feature-desc">
            Publiez en un clic sur LeBonCoin, Vinted, Facebook Marketplace et eBay avec copie automatique.
          </p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2 class="cta-title">Rejoignez la b&ecirc;ta</h2>
      <p class="cta-subtitle">Soyez parmi les premiers &agrave; tester SellSnap. Gratuit.</p>

      <form
        v-if="status === 'idle' || status === 'loading' || status === 'error'"
        class="cta-form"
        @submit.prevent="handleSubmit"
      >
        <div class="form-row">
          <input
            v-model="email"
            type="email"
            placeholder="votre@email.com"
            class="cta-input"
            :disabled="status === 'loading'"
            required
          />
          <button
            type="submit"
            class="cta-btn"
            :disabled="status === 'loading' || !email.trim()"
          >
            <template v-if="status === 'loading'">
              <div class="cta-spinner" />
            </template>
            <template v-else>
              M'inscrire
            </template>
          </button>
        </div>
        <p v-if="status === 'error'" class="cta-error">{{ errorMsg }}</p>
      </form>

      <div v-else-if="status === 'registered'" class="cta-success">
        <div class="success-icon">&#10003;</div>
        <p>Vous &ecirc;tes inscrit ! On vous tient au courant.</p>
        <p v-if="waitlistCount" class="cta-count">{{ waitlistCount }} personnes inscrites</p>
      </div>

      <div v-else-if="status === 'already_registered'" class="cta-already">
        <p>Vous &ecirc;tes d&eacute;j&agrave; inscrit !</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <p>SellSnap &copy; {{ new Date().getFullYear() }}</p>
      <p class="footer-sub">Propuls&eacute; par l'IA</p>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  background: #0a0a14;
  color: #e0e0e0;
  font-family: 'DM Sans', sans-serif;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.6s ease;
}
.landing.visible {
  opacity: 1;
}

/* Background glows */
.bg-glow-1 {
  position: fixed;
  top: -250px;
  right: -200px;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(108, 99, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}
.bg-glow-2 {
  position: fixed;
  bottom: -250px;
  left: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 107, 157, 0.07) 0%, transparent 70%);
  pointer-events: none;
}
.bg-glow-3 {
  position: fixed;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(108, 99, 255, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

/* Hero */
.hero {
  padding: 80px 24px 48px;
  text-align: center;
  position: relative;
}
.hero-inner {
  max-width: 800px;
  margin: 0 auto;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}
.logo-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6c63ff, #ff6b9d);
  font-size: 22px;
}
.logo-text {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: 'Space Mono', monospace;
  background: linear-gradient(135deg, #fff 0%, #a8a4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 20px;
  font-family: 'Space Mono', monospace;
  background: linear-gradient(135deg, #fff 0%, #c8c4ff 50%, #ff9dbe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: #888;
  line-height: 1.6;
  margin: 0;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}

/* Features */
.features {
  padding: 48px 24px 64px;
  position: relative;
}
.features-grid {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 28px 24px;
  transition: border-color 0.3s, transform 0.3s;
}
.feature-card:hover {
  border-color: rgba(108, 99, 255, 0.2);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 16px;
}
.feature-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 10px;
  font-family: 'Space Mono', monospace;
  color: #fff;
}
.feature-desc {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  margin: 0;
}

/* CTA */
.cta {
  padding: 48px 24px 64px;
  text-align: center;
  position: relative;
}
.cta-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 12px;
  font-family: 'Space Mono', monospace;
  color: #fff;
}
.cta-subtitle {
  font-size: 16px;
  color: #888;
  margin: 0 0 32px;
}

.cta-form {
  max-width: 480px;
  margin: 0 auto;
}
.form-row {
  display: flex;
  gap: 12px;
}

.cta-input {
  flex: 1;
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
}
.cta-input:focus {
  border-color: rgba(108, 99, 255, 0.5);
}
.cta-input::placeholder {
  color: #444;
}
.cta-input:disabled {
  opacity: 0.6;
}

.cta-btn {
  padding: 16px 28px;
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
  min-width: 130px;
  min-height: 52px;
  white-space: nowrap;
}
.cta-btn:hover:not(:disabled) {
  box-shadow: 0 12px 40px rgba(108, 99, 255, 0.4);
  transform: translateY(-1px);
}
.cta-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cta-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.cta-error {
  margin-top: 12px;
  font-size: 13px;
  color: #ff8080;
}

.cta-success {
  max-width: 480px;
  margin: 0 auto;
  animation: fadeIn 0.5s ease;
}
.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 16px;
}
.cta-success p {
  margin: 0;
  font-size: 16px;
  color: #e0e0e0;
}
.cta-count {
  margin-top: 8px !important;
  font-size: 14px !important;
  color: #666 !important;
}

.cta-already {
  max-width: 480px;
  margin: 0 auto;
  animation: fadeIn 0.5s ease;
}
.cta-already p {
  margin: 0;
  font-size: 16px;
  color: #888;
}

/* Footer */
.landing-footer {
  padding: 48px 24px 32px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.landing-footer p {
  margin: 0;
  font-size: 13px;
  color: #555;
}
.footer-sub {
  margin-top: 4px !important;
  font-size: 11px !important;
  color: #333 !important;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 640px) {
  .hero {
    padding: 56px 20px 32px;
  }
  .hero-title {
    font-size: 32px;
  }
  .hero-subtitle {
    font-size: 16px;
  }
  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .form-row {
    flex-direction: column;
  }
  .cta-btn {
    width: 100%;
  }
}
</style>
