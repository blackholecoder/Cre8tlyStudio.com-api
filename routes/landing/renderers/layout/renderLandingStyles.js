export function renderLandingStyles({ bg, mainOverlayColor, landingPage }) {
  const motion = landingPage.motion_settings || {};
  return `

  :root {
    --lp-motion-duration: ${motion.duration ?? 0.5}s;
    --lp-motion-delay: ${motion.delay ?? 0}s;
    --lp-motion-stagger: ${motion.stagger ?? 0.12}s;
    --lp-motion-easing: ${motion.easing ?? "ease-out"};
  }


  html, body {
    margin: 0;
    padding: 0;
    font-family: var(--landing-font), sans-serif;
    height: 100%;
    min-height: 100vh;
    background: ${bg};
    background-attachment: fixed;
    background-size: cover;
    background-position: center;
    overflow-x: hidden;
    overscroll-behavior: none;
    color: #222;
  }

  * {
  font-family: inherit;
}

    header {
  position: relative;
  display: flex;
  justify-content: center; /* future cover centers */
  align-items: center;
  width: 100%;
  padding: 10px 20px 0;
}

header .logo {
  position: absolute;
  top: 20px;
  left: 30px;
  height: 45px;           /* smaller height */
  max-width: 140px;       /* narrower width */
  object-fit: contain;
  border-radius: 6px;     /* subtle rounding if needed */
  padding: 0;             /* remove inner padding */
  background: none;       /* no white or semi-transparent background */
  box-shadow: none;       /* clean, no shadow */
}

/* 🔹 Optional PDF cover (centered) */
header .cover {
  max-height: 260px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.25);
}

.cover-image {
  display: block;
  margin: 70px auto 50px;
  width: 100%;
  max-width: 480px;         
  aspect-ratio: unset; 
  height: auto;      
  border-radius: 12px;
  object-fit: cover;
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.15);
  background: #000;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}


  main {
    max-width: 850px;
    margin: 60px auto;
    padding: 0px 30px 100px;
    text-align: center;
    background: ${mainOverlayColor};
    backdrop-filter: blur(6px);
    border-radius: 24px;
    box-shadow: 0 4px 25px rgba(0,0,0,0.15);
  }

  main {
  overflow: visible; /* ✅ allows banner to rise above padding visually */
}

 h1, h2, h3 {
  max-width: 700px;
  margin: 0 auto 1.5rem; /* unified vertical rhythm */
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: ${landingPage.font_color_h1 || "#FFFFFF"};
  line-height: 1.3;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: ${landingPage.font_color_h2 || "#FFFFFF"};
  line-height: 1.4;
}

h3 {
  font-size: 1.4rem;
  font-weight: 500;
  color: ${landingPage.font_color_h3 || "#FFFFFF"};
  line-height: 1.5;
}

p {
  max-width: 700px;
  margin: 0 auto 1.5rem;
  text-align: left;              /* ✅ Left-align paragraphs and bullets */
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${landingPage.font_color_p || "#FFFFFF"};
}


  img {
    max-width: 280px;
    border-radius: 12px;
    margin-bottom: 40px;
  }

 .btn {
  display: inline-block;
  background: #7bed9f;
  color: #000;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  line-height: 1.2;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.3s ease;
}
.btn:hover {
  background: #5fd98d;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

 form {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap; /* ✅ allows wrapping on mobile */
  gap: 10px;
  width: 100%;             
  max-width: 700px;       
  margin-left: auto;       
  margin-right: auto;      
}

  input[type="email"] {
  padding: 12px 20px;
  width: 100%;
  max-width: 320px; /* ✅ fits nicely on desktop */
  border-radius: 6px;
  border: 1px solid #ccc;
  flex: 1;
}

  button {
  background: #7bed9f;
  color: #000;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s, transform 0.2s ease;
  width: 100%;
  max-width: 200px; /* ✅ ensures button doesn’t overflow */
}


  button:hover {
    background: #7bed9f;
    color: #000;
    transform: translateY(-1px);
  }

  footer {
    margin-top: 60px;
    font-size: 0.95rem;
    color: #ccc;
  }

  footer em {
  color: #fff;
  font-style: normal; /* optional */
}

main {
  position: relative;
  min-height: 100vh;
}

main p.powered {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  text-align: center;
}

.cover-wrapper {
  padding-top: 50px;   /* 👈 Adjust this value until it looks right */
}

div[style*="linear-gradient"] {
  border-radius: inherit;
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

  /* Responsive */
  @media (max-width: 768px) {
    main {
    max-width: 100%;
    margin: 24px auto;
    padding: 24px 8px 56px;
    background: none;
    backdrop-filter: none;
    box-shadow: none;
    border-radius: 0;
  }

  header .logo {
  height: 35px;
  left: 16px;
  top: 12px;
}

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    p  { font-size: 1rem; }


    input[type="email"], button { width: 100%; margin: 6px 0; }

    .cover-wrapper {
    padding-top: 30px;   /* smaller gap on mobile */
  }
  }
@media (max-width: 600px) {
  form {
    flex-direction: column; /* ✅ stacks input and button vertically */
  }

  input[type="email"],
button {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;  /* ✅ NEW - prevents off-screen padding overflow */
}
}

/* Base motion state */
.lp-block[data-motion="true"] .lp-motion {
  opacity: 0;
  transition-property: opacity, transform, filter;
  transition-duration: var(--lp-motion-duration);
  transition-timing-function: var(--lp-motion-easing);
  transition-delay: var(--lp-motion-delay);
  will-change: opacity, transform, filter;
}


/* Layout preservation */
.lp-motion {
  display: block;
  width: 100%;
}

/* Visible state ALWAYS wins */
.lp-block[data-motion="true"].motion-visible .lp-motion {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: none;
}

/* ---------------------- */
/* Fade presets */
/* ---------------------- */

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="fade"] .lp-motion {
  transform: translateY(0);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="fade-up"] .lp-motion {
  transform: translateY(30px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="fade-down"] .lp-motion {
  transform: translateY(-30px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="fade-left"] .lp-motion {
  transform: translateX(30px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="fade-right"] .lp-motion {
  transform: translateX(-30px);
}

/* ---------------------- */
/* Slide presets */
/* ---------------------- */

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="slide-up"] .lp-motion {
  transform: translateY(60px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="slide-down"] .lp-motion {
  transform: translateY(-60px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="slide-left"] .lp-motion {
  transform: translateX(-60px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="slide-right"] .lp-motion {
  transform: translateX(60px);
}

/* ---------------------- */
/* Scale presets */
/* ---------------------- */

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="scale-up"] .lp-motion {
  transform: scale(0.9);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="scale-down"] .lp-motion {
  transform: scale(1.1);
}

/* ---------------------- */
/* Fancy presets */
/* ---------------------- */

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="blur-in"] .lp-motion {
  filter: blur(10px);
  transform: translateY(20px);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="rotate-in"] .lp-motion {
  transform: rotate(-6deg) scale(0.95);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="flip-up"] .lp-motion {
  transform: rotateX(90deg);
  transform-origin: bottom;
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="flip-left"] .lp-motion {
  transform: rotateY(90deg);
  transform-origin: left;
}

/* ---------------------- */
/* Attention presets */
/* ---------------------- */

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="pop"] .lp-motion {
  transform: scale(0.8);
}

.lp-block[data-motion="true"]:not(.motion-visible)[data-motion-preset="bounce"] .lp-motion {
  transform: translateY(40px);
}

/* Bounce animation runs AFTER visible */
.lp-block[data-motion="true"][data-motion-preset="bounce"].motion-visible .lp-motion {
  animation: lp-bounce 0.6s ease-out;
}

@keyframes lp-bounce {
  0%   { transform: translateY(40px); }
  60%  { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}



/* ============================== */
/* Scroll Arrow (Live Landing) */
/* ============================== */

.scroll-arrow-item {
  display: block;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  will-change: transform, opacity;
}

/* Bounce */
.scroll-arrow-item.bounce {
  animation-name: arrow-bounce;
}

/* Float */
.scroll-arrow-item.float {
  animation-name: arrow-float;
}

/* Pulse */
.scroll-arrow-item.pulse {
  animation-name: arrow-pulse;
}

/* Keyframes (these stay the same) */
@keyframes arrow-bounce {
  0% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(10px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.6; }
}

@keyframes arrow-float {
  0% { transform: translateY(0); }
  50% { transform: translateY(6px); }
  100% { transform: translateY(0); }
}

@keyframes arrow-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 0.6; }
}







  `;
}
