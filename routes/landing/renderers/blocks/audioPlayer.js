export function renderAudioPlayerBlock(block, landingPage) {
  const {
    audio_url = "",
    cover_url = "",
    title = "",
    alignment = "center",
    padding = 20,
    show_cover = true,
    show_title = true,
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

  const playlistCount = block.playlist?.length || 0;
  const playlistLabel = playlistCount === 1 ? "Track" : "Playlist";

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

  <div class="audio-main-row" style="display:flex;
  align-items:center;
  gap:24px;">

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
      <div class="audio-right" style="flex:1; text-align:left;">

  ${
    show_title
      ? `<div style="margin-bottom:8px;">
          <span id="main_title_${block.id}" style="
            font-size:1rem;
            font-weight:600;
            color:${text_color};
          ">
            ${title || ""}
          </span>
        </div>`
      : ``
  }

  <div class="audio-controls-row" style="
  display:flex;
  flex-direction:column;
  gap:10px;
">
      
      <div class="audio-controls" style="
  display:flex;
  align-items:center;
  gap:14px;
">

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
  justify-content:flex-start;
  margin-top:6px;
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
        style="width:100%; margin-top:10px; accent-color:${progress_color}; cursor:pointer;"
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
</div>

  <audio id="audio_${block.id}" src="${audio_url || ""}"></audio>

  <!-- PLAYLIST -->
${
  block.playlist && block.playlist.length >= 1
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
      ▼ ${playlistLabel} (${playlistCount} tracks)
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
        margin-top:6px;
        align-self:flex-start;
        padding:3px 8px;
        border-radius:999px;
        background:#020617;
        border:1px solid rgba(34,197,94,0.35);
        font-size:0.7rem;
        font-weight:700;
        color:#22c55e;
        line-height:1;
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

    .audio-right {
    padding-top: 6px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 12px;
}

.audio-main-row {
  align-items: flex-start;
}

.audio-player-stack {
  width: 100%;
  max-width: 100%;
  margin: 0;
}
.audio-cover-img {
  margin-top: -6px;
  width: 140px;
  height: 140px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

.audio-controls-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 12px;
}

.audio-controls {
  width: 100%;
  max-width: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin: 0;
}

#playbtn_${block.id} {
  width: 45px !important;
    height: 45px !important;
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

#seek_${block.id} {
  width: 100%;
}

.audio-controls-row input[type="range"] {
  max-width: 100%;
}



@media (min-width: 641px) {

  .audio-player-stack {
    max-width: 100%;
  }

  .audio-controls-row {
    align-items: flex-start;
  }

  .audio-player-shell {
    padding: 32px;
  }

  #main_title_${block.id} {
    margin-top: 0 !important;
    margin-bottom: 10px !important;
    line-height: 1.15;
  }
    

}

@media (max-width: 640px) {

  /* Force true Spotify-style vertical layout */
  .audio-main-row {
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .audio-right {
    width: 100%;
    align-items: center;
    text-align: center;
    padding-top: 0;
  }

  /* Image balance */
  .audio-cover-img {
    width: 110px;
    height: 110px;
    margin-top: 0;
  }

  /* Controls stack cleanly */
  .audio-controls-row {
    width: 100%;
    align-items: center;
    gap: 12px;
  }

  .audio-controls {
    width: 100%;
    justify-content: center;
    gap: 16px;
  }

  /* Scrubber must be full width */
  #seek_${block.id} {
    width: 100%;
  }

  /* Volume must not float */
  .audio-volume {
    width: 100%;
    justify-content: center;
  }

  /* Time row must stay inside card */
  .audio-time {
    min-width: 0;
    width: 100%;
    padding: 0 4px;
  }

}


  </style>


  <script>
  const PREVIEW_ENABLED = ${block.preview_enabled ? "true" : "false"};
const PREVIEW_DURATION = ${Number(block.preview_duration || 0)};

(function(){
  function init(){

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

    function loadTrackByIndex(index, autoPlay) {
  const track = tracks[index] || tracks[0];
  if (!track || !track.audio_url) return;

  currentIndex = index;

  // reset preview state
  audioEl._previewAlertShown = false;
  if (previewNotice) previewNotice.style.display = "none";

  // reset UI
  cur.textContent = "00:00";
  dur.textContent = "00:00";
  seek.value = 0;

  // update title
  if (mainTitle) {
    mainTitle.textContent = track.title || ("Track " + (index + 1));
  }

  // update cover
  if (coverImg && track.cover_url) {
    coverImg.src = track.cover_url;
  }

  highlightActive(index);

  // load audio
  audioEl.src = track.audio_url;
  audioEl.load();

  if (autoPlay) {
    audioEl.play().catch(() => {});
  }
}

// initial load
if (tracks.length > 0) {
  let idx = tracks.findIndex(t => t.audio_url === '${audio_url}');
  if (idx < 0) idx = 0;
  loadTrackByIndex(idx, false);
} else if ('${audio_url}') {
  audioEl.src = '${audio_url}';
  audioEl.load();
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
    audioEl.currentTime = Math.max(0, audioEl.currentTime - 10);
  };
}

    // FORWARD 10
    if (fwdBtn) {
  fwdBtn.onclick = () => {
    const d = audioEl.duration || 1;
    let t = audioEl.currentTime + 10;

    if (
      PREVIEW_ENABLED &&
      PREVIEW_DURATION > 0 &&
      t >= Math.min(PREVIEW_DURATION, d)
    ) {
      t = PREVIEW_DURATION;
    }

    audioEl.currentTime = t;
  };
}

if (vol) {
  vol.oninput = () => {
    audioEl.volume = vol.value / 100;
  };
}

    


    if (seek) {
  seek.oninput = () => {
    const d = audioEl.duration || 1;
    const pct = seek.value / 100;
    let newTime = pct * d;

    // 🔒 PREVIEW LIMIT
    if (
      PREVIEW_ENABLED &&
      PREVIEW_DURATION > 0 &&
      newTime >= Math.min(PREVIEW_DURATION, d)
    ) {
      newTime = PREVIEW_DURATION;
      seek.value = (PREVIEW_DURATION / d) * 100;
      cur.textContent = fmt(PREVIEW_DURATION);
    }

    audioEl.currentTime = newTime;
  };
}

audioEl.addEventListener('loadedmetadata', () => {
  dur.textContent = fmt(audioEl.duration || 0);
});

audioEl.addEventListener('timeupdate', () => {
  const t = audioEl.currentTime || 0;
  const d = audioEl.duration || 1;

  if (
    PREVIEW_ENABLED &&
    PREVIEW_DURATION > 0 &&
    t >= Math.min(PREVIEW_DURATION, d)
  ) {
    audioEl.pause();
    audioEl.currentTime = 0;

    seek.value = 0;
    cur.textContent = "00:00";

    if (!audioEl._previewAlertShown) {
      audioEl._previewAlertShown = true;
      if (previewNotice) previewNotice.style.display = "block";
    }

    setPlayingUI(false);
    return;
  }

  cur.textContent = fmt(t);
  seek.value = (t / d) * 100;
});

audioEl.addEventListener('ended', () => {
  const count = tracks.length;
  if (!count) return;

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
    setPlayingUI(false);
    seek.value = 0;
    return;
  }

  loadTrackByIndex(nextIndex, true);
});






    

    // Collapsible playlist header
    if (plistHeader && plist && tracks.length >= 1) {
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
    if (plist && tracks.length >= 1) {
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
init();
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
