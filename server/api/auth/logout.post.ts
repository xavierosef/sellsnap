export default defineEventHandler((event) => {
  deleteCookie(event, 'sellsnap_session', { path: '/' })
  return { ok: true }
})
