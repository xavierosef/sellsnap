export default defineNuxtRouteMiddleware(async (to) => {
  // Don't check auth on login page
  if (to.path === '/login') return

  try {
    await $fetch('/api/auth/check')
  } catch {
    return navigateTo('/login')
  }
})
