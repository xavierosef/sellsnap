export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    // Forward browser cookies during SSR (server-side rendering on reload)
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
    await $fetch('/api/auth/check', { headers })
  } catch {
    return navigateTo('/login')
  }
})
