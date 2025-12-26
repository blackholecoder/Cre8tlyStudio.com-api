const html = `<div style="background:#f9fafb;padding:60px 0;font-family:Arial,sans-serif;">
  <table
    align="center"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="max-width:520px;margin:0 auto;"
  >
    <tr>
      <td
        style="
          background:#ffffff;
          border-radius:18px;
          border:1px solid #e5e7eb;
          box-shadow:0 20px 40px rgba(0,0,0,0.08);
          padding:40px 36px;
          color:#111827;
        "
      >

        <!-- Logo Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:30px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img
                      src="https://cre8tlystudio.com/cre8tly-logo-black.png"
                      width="44"
                      height="44"
                      style="display:block;"
                      alt="Cre8tly Studio"
                    />
                  </td>
                  <td style="padding-left:10px;">
                    <span
                      style="
                        font-size:18px;
                        font-weight:700;
                        color:#111827;
                        display:block;
                        line-height:1.2;
                      "
                    >
                      Cre8tly Studio
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Headline -->
        <h2
          style="
            font-size:26px;
            font-weight:700;
            margin:0 0 12px 0;
            color:#111827;
          "
        >
          Welcome to Cre8tly Studio
        </h2>

        <p
          style="
            font-size:15px;
            color:#4b5563;
            margin:0 0 28px 0;
          "
        >
          Your creative engine is now unlocked
        </p>

        <!-- Body -->
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px 0;">
          Hi {{NAME}}, your free seven day trial is now active. You now have full access
          to create lead magnets, ebooks, covers, landing pages, brand assets, and complete
          digital products all inside one platform.
        </p>

        <p
          style="
            font-size:15px;
            line-height:1.7;
            font-weight:600;
            color:#111827;
            margin:0 0 18px 0;
          "
        >
          If there was ever a time you needed to make money online, now is that time.
        </p>

        <p style="font-size:15px;line-height:1.7;margin:0 0 18px 0;">
          Cre8tly Studio is an all in one platform for creators. Build everything in one
          place using your own fonts, branding, and visual style. The Live Editor gives you
          real time control over every line of your digital product.
        </p>

        <p style="font-size:15px;line-height:1.7;margin:0 0 22px 0;">
          Sell your digital products directly inside Cre8tly Studio. Connect your Express
          account, upload your creations, track sales, manage customers, and keep ninety
          percent of every sale.
        </p>

        <!-- Trial Expiration -->
        <div
          style="
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:14px;
            text-align:center;
            font-size:14px;
            margin-bottom:28px;
          "
        >
          Your trial expires on
          <strong>{{EXPIRES_AT}}</strong>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:30px;">
          <a
            href="https://cre8tlystudio.com/login"
            style="
              background:#000000;
              color:#ffffff;
              padding:14px 36px;
              border-radius:10px;
              text-decoration:none;
              font-weight:700;
              font-size:15px;
              display:inline-block;
            "
          >
            Start Creating
          </a>
        </div>

        <!-- Footer -->
        <p
          style="
            font-size:13px;
            color:#6b7280;
            text-align:center;
            margin:0;
          "
        >
          Need help?
          <a
            href="mailto:support@aluredigital.com"
            style="color:#111827;font-weight:600;text-decoration:none;"
          >
            support@aluredigital.com
          </a>
        </p>

      </td>
    </tr>
  </table>
</div>
`;
