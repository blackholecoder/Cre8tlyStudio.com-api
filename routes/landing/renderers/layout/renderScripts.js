export function renderScripts({ landingPage }) {
  return `
<script>
  ${renderCountdownScript()}
</script>

<script>
  ${renderLeadFormScript(landingPage)}
</script>

<script>
  ${renderAnalyticsScript(landingPage)}
</script>

<script>
  ${renderCheckoutScript()}
</script>
`;
}
