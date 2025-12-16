export function renderAudioPlayerBlock(block, landingPage) {
  const {
    audio_url = "",
    cover_url = "",
    title = "",
    alignment = "center",
    padding = 20,
    show_cover = true,
    show_title = true,
    waveform_color = "#7bed9f",
    progress_color = "#22c55e",
    match_main_bg = false,
    use_gradient = false,
    bg_color = "",
    gradient_start = "#F285C3",
    gradient_end = "#7bed9f",
    gradient_direction = "90deg",
    text_color = "#ffffff",
  } = block;

  const formatPrice = (p) =>
    p && Number(p) > 0 ? `$${Number(p).toFixed(2)}` : "";

  // Allow rendering if we have either a main audio OR at least one playlist track
  if (!audio_url && !(block.playlist && block.playlist.length)) return "";

  let containerBackground;
  if (match_main_bg) {
    containerBackground = landingPage?.bg_theme
      ? landingPage.bg_theme
      : "#0d1117";
  } else if (use_gradient) {
    containerBackground = `linear-gradient(${gradient_direction}, ${gradient_start}, ${gradient_end})`;
  } else if (bg_color) {
    containerBackground = bg_color;
  } else {
    containerBackground = "#0d1117";
  }

  return `
<div class="audio-player-shell" style="
  background:${containerBackground};
  border:1px solid #1f2937;
  padding:${padding}px;
  border-radius:16px;
  max-width:700px;
  margin:45px auto;
  color:${text_color};
  box-shadow:0 0 25px rgba(0,0,0,0.35);
  text-align:${alignment};
">

  <!-- MAIN ROW -->
  <div class="audio-player-main">
  <div class="audio-player-stack">

  <div class="audio-main-row" style="display:flex; align-items:center; gap:22px;">

    <!-- COVER -->
    ${
      show_cover && cover_url
        ? `<img id="cover_${block.id}" src="${cover_url}" class="audio-cover-img"/>`
        : show_cover
        ? `<img id="cover_${block.id}" src="" style="
              width:70px;
              height:70px;
              object-fit:cover;
              border-radius:8px;
              background:rgba(15,23,42,0.9);
            "/>`
        : ""
    }

    <div id="np_${block.id}" style="
          width:16px;
          height:12px;
          display:flex;
          align-items:flex-end;
          gap:2px;
          transform: translateY(-2px);
          visibility:hidden;
        ">
          <span style="width:3px; height:3px; background:${progress_color}; animation:np1 1s infinite;"></span>
          <span style="width:3px; height:6px; background:${progress_color}; animation:np2 1s infinite;"></span>
          <span style="width:3px; height:10px; background:${progress_color}; animation:np3 1s infinite;"></span>
        </div>

    <!-- TITLE + NOW PLAYING -->
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
      
        ${
          show_title
            ? `<div style="display:flex; align-items:center; gap:10px;">
      <span id="main_title_${
        block.id
      }" style="font-size:1.5rem; font-weight:600;">
        ${title || ""}
      </span>
    </div>`
            : ""
        }

        
      </div>

     



  </div>


  <!-- CONTROLS -->
    <div class="audio-controls-row">
      <div class="audio-controls" style="display:flex; align-items:center; gap:18px;">

        <!-- BACK 10 -->
        <div id="back_${block.id}" style="
          width:40px;
          height:40px;
          border-radius:8px;
          background:#1e293b;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 2px 4px rgba(0,0,0,0.25);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${progress_color}">
            <path d="M15 18V6l-9 6 9 6z" />
          </svg>
        </div>

        <!-- PLAY / PAUSE -->
        <div id="playbtn_${block.id}" style="
          width:45px;
          height:45px;
          border-radius:50%;
          background:${progress_color};
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 3px 8px rgba(0,0,0,0.3);
        ">
          <svg id="icon_${
            block.id
          }" width="26" height="26" fill="#000" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>

        <!-- FORWARD 10 -->
        <div id="fwd_${block.id}" style="
          width:40px;
          height:40px;
          border-radius:8px;
          background:#1e293b;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 2px 4px rgba(0,0,0,0.25);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${progress_color}">
            <path d="M9 6v12l9-6-9-6z" />
          </svg>
        </div>

        
      </div>

      <div class="audio-volume" style="
  display:flex;
  justify-content:center;
  margin-top:10px;
">
  <input 
    id="vol_${block.id}"
    type="range"
    min="0"
    max="100"
    value="80"
    style="width:140px; accent-color:${progress_color};"
  />
</div>

      <!-- SCRUBBER -->
      <input 
        id="seek_${block.id}"
        type="range"
        min="0"
        max="100"
        value="0"
        style="width:100%; margin-top:12px; accent-color:${progress_color};"
      />

      <div class="audio-time" style="
        display:flex;
        justify-content:space-between;
        margin-top:6px;
        font-size:0.85rem;
        color:#94a3b8;
      ">
        <span id="cur_${block.id}">00:00</span>
        <span id="dur_${block.id}">00:00</span>
      </div>

    </div>

  </div>

  <div id="preview_notice_${block.id}" style="
  display:none;
  margin-top:12px;
  padding:10px 14px;
  border-radius:10px;
  background:rgba(34,197,94,0.15);
  border:1px solid #22c55e;
  color:#22c55e;
  font-size:0.9rem;
  font-weight:600;
">
  Buy now to unlock the full track.
</div>
${
  block.sell_singles &&
  audio_url &&
  (!block.playlist || block.playlist.length <= 1)
    ? `
<div style="margin-top:20px;">
  <button
    onclick="startAudioCheckoutSingle(
      '${landingPage.id}',
      '${landingPage.user_id}',
      '${block.id}',
      '${audio_url}',
      '${title || "Audio Track"}',
      ${Math.round((block.single_price || 0) * 100)},
      '${cover_url || ""}'
    )"
    style="
      width: 100%;
      margin: 0 auto;
min-height: 56px;
padding: 16px 20px;
background: #22c55e;
color: #000;
font-size: 1rem;
font-weight: 700;
border-radius: 14px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
box-sizing: border-box;
flex-shrink: 0;
line-height: 1.2;
    "
  >
    ${block.single_button_text || "Buy Now"}${
        block.single_price ? ` • ${formatPrice(block.single_price)}` : ""
      }
  </button>
</div>
`
    : ""
}

</div>

  <div
  id="wavewrap_${block.id}"
  style="
    margin-top:18px;
    padding:0;
    overflow:hidden;
    position:relative;
    height:50px;
  "
>
  <div style="margin-top:10px; padding:0 20px;">
  <div id="wave_${block.id}" style="height:50px;"></div>
</div>
</div>

  <audio id="audio_${block.id}" src="${audio_url || ""}"></audio>

  <!-- PLAYLIST -->
${
  block.playlist && block.playlist.length > 1
    ? `
<div class="audio-player-playlist" style="margin-top:18px;">
  <div id="plist_header_${block.id}" style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    cursor:pointer;
    margin-bottom:8px;
  ">
    <div id="plist_toggle_${
      block.id
    }" style="font-weight:600; font-size:0.95rem;">
      ▼ Playlist (${block.playlist.length} tracks)
    </div>
    <div style="font-size:0.8rem; opacity:0.8;">
      Click a track to play, double-click to restart
    </div>
  </div>

  <ul id="plist_${block.id}" style="
    list-style:none;
    padding:0;
    margin:0;
    display:block;
    text-align:left;
  ">
    ${block.playlist
      .map(
        (track, i) => `
<li id="track_${block.id}_${i}" data-index="${i}" style="
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap:14px;
  height:56px;
  padding:8px 14px;
  background:${
    track.audio_url === audio_url ? "#22c55e15" : "rgba(15,23,42,0.7)"
  };
  border:1px solid ${
    track.audio_url === audio_url ? "#22c55e" : "rgba(148,163,184,0.35)"
  };
  border-radius:8px;
  cursor:pointer;
  margin-bottom:10px;
  overflow:hidden;
  line-height:1;
">

  ${
    track.cover_url
      ? `<div style="
          width:40px;
          height:40px;
          display:flex;
          flex-shrink:0;
        ">
          <img src="${track.cover_url}" style="
            width:40px;
            height:40px;
            border-radius:6px;
            object-fit:cover;
            object-position:center;
            display:block;
          ">
       </div>`
      : ""
  }


  <span style="
  flex:1;
  display:flex;
  flex-direction:column;
  overflow:hidden;
">
  <span style="
    font-size:0.95rem;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  ">
    ${track.title || `Track ${i + 1}`}
  </span>

  ${
    block.sell_singles && (track.price || block.single_price)
      ? `<span style="
          font-size:0.75rem;
          font-weight:600;
          color:#22c55e;
        ">
          $${Number(track.price || block.single_price).toFixed(2)}
        </span>`
      : ""
  }
</span>


  
  ${
    block.sell_singles
      ? `<button onclick="startAudioCheckoutSingle('${landingPage.id}', '${
          landingPage.user_id
        }', '${block.id}', '${track.audio_url}', '${track.title}', ${Math.round(
          (track.price || block.single_price || 0) * 100
        )}, '${
          track.cover_url || block.cover_url || ""
        }'); event.stopPropagation();" 
         style="
           margin-left:12px;
           padding:6px 12px;
           width:90px;
           background:#22c55e;
           color:#000;
           border-radius:6px;
           font-size:0.8rem;
           font-weight:600;
           cursor:pointer;
         ">
         ${block.single_button_text || "Buy"}
       </button>`
      : ""
  }
</li>
`
      )
      .join("")}

  </ul>

  <div style="display:flex; align-items:center; gap:6px; margin-top:16px;">
  <button id="rep_${block.id}" style="
    padding:3px 6px;          /* ↓ tighter padding */
    border-radius:12px;       /* ↓ smaller radius */
    width: 90px;
    border:1px solid #334155;
    background:#1e293b;
    color:#e5e7eb;
    font-size:0.8rem;
    cursor:pointer;
    white-space:nowrap;       
  ">
    Repeat Off
  </button>
  <button id="shuf_${block.id}" style="
    padding:3px 6px;
    border-radius:12px;
    width: 90px;
    border:1px solid #334155;
    background:#1e293b;
    color:#e5e7eb;
    font-size:0.8rem;
    cursor:pointer;
    white-space:nowrap;
  ">
    Shuffle Off
  </button>
</div>
${
  block.sell_album && block.playlist && block.playlist.length > 0
    ? `
<div style="margin-top:20px;
  margin-top:20px;
  width:100%;
  padding-left:0;
  padding-right:0;">
  <button 
    onclick="startAudioCheckoutAlbum('${landingPage.id}', '${
        landingPage.user_id
      }', '${block.id}', ${Math.round((block.album_price || 0) * 100)});"
    style="
    flex: 1;
      width:100% !important;
      max-width:100% !important;
      padding:14px 0;
      background:#22c55e;
      color:#000;
      font-size:1rem;
      font-weight:700;
      border-radius:10px;
      cursor:pointer;
      display:block;
      
margin:0 auto;
    "
  >
    ${block.album_button_text || "Buy Album"}${
        block.album_price ? ` • ${formatPrice(block.album_price)}` : ""
      }

  </button>
</div>
    `
    : ""
}


</div>
`
    : ""
}

  <style>
    @keyframes np1 {0%{height:3px;}50%{height:9px;}100%{height:3px;}}
    @keyframes np2 {0%{height:6px;}50%{height:12px;}100%{height:6px;}}
    @keyframes np3 {0%{height:10px;}50%{height:4px;}100%{height:10px;}}

    /* Gradient fade AFTER preview limit */


.ws-preview-mask::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: calc(100% - var(--preview-stop));
  background: rgba(10, 10, 10, 0.85);
  pointer-events: none;
  z-index: 4;
}

/* hard vertical cutoff line */
.ws-preview-mask::before {
  content: "";
  position: absolute;
  top: 0;
  left: var(--preview-stop);
  transform: translateX(-1px);
  width: 2px;
  height: 100%;
  background: #22c55e;
  z-index: 5;
}


@media (min-width: 641px) {

  .audio-player-stack {
    max-width: 100%;
  }

  .audio-controls-row {
    align-items: flex-start;
  }

  .audio-controls {
    max-width: 300px;
    justify-content: space-between;
  }

  #main_title_${block.id} {
    margin-top: 0 !important;
    margin-bottom: 10px !important;
    line-height: 1.15;
  }
    

}

.audio-cover-img {
  width: 240px;
  height: 240px;
  object-fit: cover;
  border-radius: 16px;
}

.audio-main-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}

.audio-player-main img {
  width: 240px;
  height: 240px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(0,0,0,0.45);
}

.audio-player-stack {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.audio-controls-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
}

.audio-controls {
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  margin-top: 20px;
}

#playbtn_${block.id} {
  width: 65px !important;
    height: 65px !important;
}
    

.audio-time {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  min-width: 260px;
}

/* mobile styles */

/* MOBILE AUDIO PLAYER LAYOUT */
@media (max-width: 640px) {

  .audio-player-shell {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* MAIN PLAYER CARD */
  .audio-player-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .audio-player-main > .audio-main-row > div {
    text-align: center;
  }

  .audio-controls {
  width: 100%;
  justify-content: space-between;
}


  /* COVER ART */
  .audio-player-main img {
    width: 220px !important;
    height: 220px !important;
    border-radius: 18px;
    margin-bottom: 14px;
    box-shadow: 0 18px 40px rgba(0,0,0,0.45);
  }

  /* TITLE */
  #main_title_${block.id} {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  

  /* PLAY BUTTON */
  #playbtn_${block.id} {
    width: 65px !important;
    height: 65px !important;
  }

  /* SCRUBBER */
  #seek_${block.id} {
    margin-top: 14px;
  }

  /* TIME ROW */
  .audio-time {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  min-width: 260px;
}

  /* PLAYLIST SECTION */
  .audio-player-playlist {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid rgba(148,163,184,0.25);
  }

  /* PLAYLIST ROWS */
  .audio-player-playlist li {
    height: 64px;
    border-radius: 12px;
  }

  /* BUY ALBUM BUTTON */
  .audio-player-playlist button {
    width: 100%;
    border-radius: 14px;
    font-size: 1rem;
    padding: 16px 0;
  }
    .audio-main-row {
  flex-direction: column;
  align-items: center;
}

.audio-cover {
    width: 100%;
    max-width: 320px;
    aspect-ratio: 1 / 1;
    height: auto;
    margin: 0 auto 18px;
  }

  .audio-cover img {
    width: 100%;
    height: 100%;
    border-radius: 22px;
  }
}




  </style>

  <script>
  const PREVIEW_ENABLED = ${block.preview_enabled ? "true" : "false"};
const PREVIEW_DURATION = ${Number(block.preview_duration || 0)};

(function(){
  function init(){
  let wsReady = false;

    const playBtn = document.getElementById('playbtn_${block.id}');
    const icon = document.getElementById('icon_${block.id}');
    const backBtn = document.getElementById('back_${block.id}');
    const fwdBtn = document.getElementById('fwd_${block.id}');
    const vol = document.getElementById('vol_${block.id}');
    const seek = document.getElementById('seek_${block.id}');
    const nowPlaying = document.getElementById('np_${block.id}');
    function showNowPlaying() {
  if (nowPlaying) nowPlaying.style.visibility = "visible";
}

function hideNowPlaying() {
  if (nowPlaying) nowPlaying.style.visibility = "hidden";
}
    const container = document.getElementById('wave_${block.id}');
    const cur = document.getElementById('cur_${block.id}');
    const dur = document.getElementById('dur_${block.id}');
    const plist = document.getElementById('plist_${block.id}');
    const plistHeader = document.getElementById('plist_header_${block.id}');
    const plistToggle = document.getElementById('plist_toggle_${block.id}');
    const repBtn = document.getElementById('rep_${block.id}');
    const shufBtn = document.getElementById('shuf_${block.id}');
    const mainTitle = document.getElementById('main_title_${block.id}');
    const coverImg = document.getElementById('cover_${block.id}');
    const tracks = ${JSON.stringify(block.playlist || [])};
    const previewNotice = document.getElementById('preview_notice_${block.id}');
    

    const audioEl = document.getElementById('audio_${block.id}');
    audioEl.addEventListener("play", () => {
  setPlayingUI(true);
});

audioEl.addEventListener("pause", () => {
  setPlayingUI(false);
});
audioEl.preload = "metadata";

const PLAY_ICON = '<path d="M8 5v14l11-7z"/>';
const PAUSE_ICON = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';

function setPlayingUI(isPlaying) {
  if (!icon) return;

  icon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;

  if (isPlaying) {
    showNowPlaying();
  } else {
    hideNowPlaying();
  }
}


    let playlistOpen = true;
    let repeatMode = false;
    let shuffleMode = false;
    let clickTimeout = null;
    let currentIndex = 0;

    function fmt(sec) {
  if (!sec || isNaN(sec)) return "0:00";

  sec = Math.floor(sec);

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return (
      hours + ":" +
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0")
    );
  }

  return (
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0")
  );
}



    // Preload durations for playlist items
    tracks.forEach((t, i) => {
      if (!t.audio_url) return;
      const audio = new Audio(t.audio_url);
      audio.addEventListener('loadedmetadata', () => {
        const span = document.getElementById('trkdur_${block.id}_' + i);
        if (span) span.textContent = fmt(audio.duration);
      });
    });

    if(!container || typeof WaveSurfer === 'undefined')
      return setTimeout(init,100);

    const ws = WaveSurfer.create({
      container,
      waveColor:'${waveform_color}',
      progressColor:'${progress_color}',
      cursorColor:'rgba(255,255,255,0.4)',
      barWidth:2,
      barGap:2,
      height:30,
      responsive:true,
       backend: 'MediaElement',
  media: audioEl,
    });

    function highlightActive(index) {
      if (!plist) return;
      plist.querySelectorAll("li").forEach(li => {
        li.style.background = "rgba(15,23,42,0.7)";
        li.style.border = "1px solid rgba(148,163,184,0.35)";
      });
      const active = document.getElementById('track_${block.id}_' + index);
      if (active) {
        active.style.background = "#22c55e15";
        active.style.border = "1px solid #22c55e";
      }
    }

    function loadTrackByIndex(index, autoPlay){
      const track = tracks[index] || tracks[0];
      if (!track || !track.audio_url) return;
      currentIndex = index;

      ws.load(track.audio_url);

       ws._previewAlertShown = false;
  if (previewNotice) previewNotice.style.display = "none";

      cur.textContent = "00:00";
      dur.textContent = "00:00";
      seek.value = 0;

      // Update main title (not row titles)
      if (mainTitle) {
        mainTitle.textContent = track.title || ("Track " + (index + 1));
      }

      // Update ONLY this block's cover image
      if (coverImg && track.cover_url) {
        coverImg.src = track.cover_url;
      }

      highlightActive(index);

      ws.once('ready', () => {
        dur.textContent = fmt(ws.getDuration());
        if (autoPlay) {
          ws.play();
          icon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
           showNowPlaying();
        } else {
          icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          hideNowPlaying();
        }
      });
    }

    // Determine initial index (match current audio_url if possible)
    if (tracks.length > 0) {
      let idx = tracks.findIndex(t => t.audio_url === '${audio_url}');
      if (idx < 0) idx = 0;
      currentIndex = idx;
      loadTrackByIndex(currentIndex, false);
    } else if ('${audio_url}') {
      // fallback single track
      ws.load('${audio_url}');
    }

    // PLAY / PAUSE
if (playBtn) {
  playBtn.onclick = () => {
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  };
}


    // BACK 10
    if (backBtn) {
      backBtn.onclick = () => {
        const t = ws.getCurrentTime() - 10;
        ws.seekTo(Math.max(0, t) / ws.getDuration());
      };
    }

    // FORWARD 10
    if (fwdBtn) {
  fwdBtn.onclick = () => {
    const d = ws.getDuration() || 1;
    let t = ws.getCurrentTime() + 10;

    if (
      PREVIEW_ENABLED &&
      PREVIEW_DURATION > 0 &&
      t >= Math.min(PREVIEW_DURATION, d)
    ) {
      t = PREVIEW_DURATION;
    }

    ws.seekTo(t / d);
  };
}

    if (vol) {
      vol.oninput = () => ws.setVolume(vol.value/100);
    }

    ws.on('audioprocess', () => {
    if (audioEl.paused) return;

  const t = ws.getCurrentTime();
  const d = ws.getDuration() || 1;


  // 🔒 PREVIEW HARD STOP
  if (
    PREVIEW_ENABLED &&
    PREVIEW_DURATION > 0 &&
    t >= Math.min(PREVIEW_DURATION, d)
  ) {
    ws.pause();
    ws.seekTo(0);

    icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    seek.value = 0;
    cur.textContent = "00:00";

   if (!ws._previewAlertShown) {
  ws._previewAlertShown = true;
  if (previewNotice) previewNotice.style.display = "block";
}
    return;
  }

  cur.textContent = fmt(t);
  seek.value = (t / d) * 100;
});


    if (seek) {
  seek.oninput = () => {
    const d = ws.getDuration() || 1;
    const pct = seek.value / 100;
    const newTime = pct * d;

    if (
      PREVIEW_ENABLED &&
      PREVIEW_DURATION > 0 &&
      newTime >= Math.min(PREVIEW_DURATION, d)
    ) {
      const limitPct = PREVIEW_DURATION / d;
      ws.seekTo(limitPct);
      seek.value = limitPct * 100;
      cur.textContent = fmt(PREVIEW_DURATION);
      return;
    }

    ws.seekTo(pct);
  };
}


ws.on('ready', () => {
  wsReady = true;
  const duration = ws.getDuration();

  dur.textContent = fmt(duration);

  if (!audioEl.paused) {
    const t = audioEl.currentTime || 0;
    audioEl.pause();
    ws.seekTo(t / duration);
    ws.play();
    setPlayingUI(true); // 🔥 THIS WAS MISSING
  }

  if (PREVIEW_ENABLED && PREVIEW_DURATION > 0) {
    const limit = Math.min(PREVIEW_DURATION, duration);
    const pct = (limit / duration) * 100;
    container.style.setProperty("--preview-stop", pct + "%");
    container.classList.add("ws-preview-mask");
  }
});




    ws.on('finish', () => {
      const count = tracks.length;
      if (!count) {
        icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        nowPlaying.style.visibility = "hidden";
        seek.value = 0;
        return;
      }

      let nextIndex = currentIndex;

      if (shuffleMode && count > 1) {
        do {
          nextIndex = Math.floor(Math.random() * count);
        } while (nextIndex === currentIndex);
      } else if (currentIndex < count - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode) {
        nextIndex = 0;
      } else {
        icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        nowPlaying.style.visibility = "hidden";
        seek.value = 0;
        return;
      }

      loadTrackByIndex(nextIndex, true);
    });

    // Collapsible playlist header
    if (plistHeader && plist && tracks.length > 1) {
      plistHeader.onclick = () => {
        playlistOpen = !playlistOpen;
        plist.style.display = playlistOpen ? "block" : "none";
        if (plistToggle) {
          plistToggle.textContent =
            (playlistOpen ? "▼" : "▲") + " Playlist (" + tracks.length + " tracks)";
        }
      };
    }

    // Repeat button
    if (repBtn) {
      repBtn.onclick = () => {
        repeatMode = !repeatMode;
        repBtn.textContent = repeatMode ? "Repeat On" : "Repeat Off";
        repBtn.style.background = repeatMode ? "${progress_color}" : "#1e293b";
        repBtn.style.color = repeatMode ? "#000" : "#e5e7eb";
      };
    }

    // Shuffle button
    if (shufBtn) {
      shufBtn.onclick = () => {
        shuffleMode = !shuffleMode;
        shufBtn.textContent = shuffleMode ? "Shuffle On" : "Shuffle Off";
        shufBtn.style.background = shuffleMode ? "${progress_color}" : "#1e293b";
        shufBtn.style.color = shuffleMode ? "#000" : "#e5e7eb";
      };
    }

    // Playlist item click / double-click
    if (plist && tracks.length > 1) {
      plist.querySelectorAll("li").forEach(item => {
        item.onclick = () => {
          if (clickTimeout) {
            // Double-click: restart selected track
            clearTimeout(clickTimeout);
            clickTimeout = null;
            const index = Number(item.dataset.index);
            loadTrackByIndex(index, true);
          } else {
            // Single-click: play selected track
            clickTimeout = setTimeout(() => {
              clickTimeout = null;
              const index = Number(item.dataset.index);
              loadTrackByIndex(index, true);
            }, 220);
          }
        };
      });
    }
  }

  if(!window._wavesurferLoaded){
    const s=document.createElement('script');
    s.src="https://unpkg.com/wavesurfer.js@7";
    s.onload=()=>{window._wavesurferLoaded=true;init();}
    document.body.appendChild(s);
  } else init();
})();

window.startAudioCheckoutSingle = async function(landingId, sellerId, blockId, audioUrl, title, price, coverUrl){
  try {
    const body = {
      audio_type: "single",
      landingPageId: landingId,
      blockId,
      sellerId,
      audio_urls: [audioUrl], 
      product_name: title || "Audio Track",
      price_in_cents: price,
      cover_url: coverUrl,
    };

    const res = await fetch("https://cre8tlystudio.com/api/seller-checkout/create-audio-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch (err) {
    console.error("Checkout error:", err);
  }
};


window.startAudioCheckoutAlbum = async function(landingId, sellerId, blockId, price){
  try {
    const playlist = ${JSON.stringify(block.playlist || [])};

    const body = {
      audio_type: "album",
      landingPageId: landingId,
      blockId,
      sellerId,
      audio_urls: playlist.map(t => t.audio_url),
      product_name: "${block.album_button_text || "Full Album"}",
      price_in_cents: price,
      cover_url: (playlist[0] && playlist[0].cover_url) || "${
        block.cover_url
      }" || "",
    };

    const res = await fetch("https://cre8tlystudio.com/api/seller-checkout/create-audio-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch (err) {
    console.error("Checkout error:", err);
  }
};



  </script>



</div>
`;
}
