export function renderCountdownStyles() {
  return `
<style>
@keyframes pulseGlow {
  0%, 100% { text-shadow: 0 0 8px rgba(255,255,255,0.4); }
  50% { text-shadow: 0 0 16px rgba(255,255,255,0.9); }
}
</style>
`;
}
