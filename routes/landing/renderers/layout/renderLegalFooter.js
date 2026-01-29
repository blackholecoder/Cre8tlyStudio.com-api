export function renderLegalFooter({ footerTextColor }) {
  return `
<style>
  @media (max-width: 768px) {
    .legal-footer {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }

    .legal-footer-left {
      flex: none;
      margin-bottom: 12px;
      text-align: center;
    }

    .legal-footer-right {
      text-align: center;
      line-height: 1.8;
    }
  }
</style>

<footer class="legal-footer" style="
  display:flex;
  justify-content:flex-end;
  align-items:center;
  flex-wrap:wrap;
  gap:10px;
  padding:25px 50px;
  font-size:0.85rem;
  background:rgba(0,0,0,0.3);
  backdrop-filter:blur(6px);
  color:${footerTextColor};
  border-top:1px solid rgba(255,255,255,0.05);
">
  <span class="legal-footer-left" style="
    flex:1;
    text-align:left;
    opacity:0.7;
  ">
    © ${new Date().getFullYear()} Alure Digital. All rights reserved
  </span>

  <div class="legal-footer-right" style="
    text-align:right;
    opacity:0.8;
  ">
    <a href="https://themessyattic.com/terms" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Terms
    </a> |
    <a href="https://themessyattic.com/privacy-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Privacy
    </a> |
    <a href="https://themessyattic.com/cookies-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Cookies
    </a> |
    <a href="https://themessyattic.com/refund-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Refunds
    </a>
  </div>
</footer>
`;
}
