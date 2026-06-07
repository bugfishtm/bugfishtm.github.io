/* ============================================================
   BUGFISH — HACKER SITE — app.js
   ============================================================
   Edit the CONFIG object below to customize everything.
   No internet required — runs fully offline.
   ============================================================ */

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {

  // ---- Identity ----
  name:        "BUGFISH",
  tagline:     "i am not even having a good time",
  description: "Code. Music. Digital Art. Building real things that ship. Operating in the anti-corruption space while maintaining a daily coding practice.",
  tags:        ["#developer", "#hacker", "#musician", "#digital-art", "#open-source", "#linux"],
  mainSite:    "https://bugfish.eu",

  // ---- About — profile rows (key/value pairs) ----
  aboutStats: [
    { key: "ALIAS",    val: "Bugfish" },
    { key: "ROLE",     val: "Full-Stack Developer" },
    { key: "SITE",     val: "www.bugfish.eu" },
  ],

  // ---- About — skills block ----
  aboutSkills: [
    { key: "WEB",       val: "PHP, JavaScript, jQuery, XHTML, CSS, Bash" },
    { key: "SOFTWARE",     val: "C#, C++, Java, ASM, Python" },
    { key: "AREAS",     val: "CMS, DNS, Mail, Games, Music, Administration" },
    { key: "OS",        val: "Linux / Windows" },
  ],

  // ---- Distribution accounts ----
  // Remove or add objects freely.
  distribution: [
    {
      icon: "./overview/bugfish.jpg",
      name: "Bugfish",
      url:  "https://bugfish.eu",
      desc: "My personal website and workspace"
    },
    {
      icon: "./overview/suitefish.png",
      name: "Suitefish",
      url:  "https://suitefish.com",
      desc: "Official website of the suitefish project"
    },
    {
      icon: "./video/youtube.png",
      name: "YouTube",
      url:  "https://youtube.com/bugfishtm",
      desc: "Collection of gameplays, media and music"
    },
    {
      icon: "./software/github1.png",
      name: "GitHub",
      url:  "https://github.com/bugfishtm",
      desc: "Open source projects and repositories"
    },
    {
      icon: "./software/docker.png",
      name: "DockerHub",
      url:  "https://hub.docker.com/u/bugfishtm",
      desc: "Docker images and container releases"
    },
    {
      icon: "./overview/delayed.png",
      name: "itch.io",
      url:  "https://bugfishtm.itch.io",
      desc: "Indie game releases and interactive projects"
    },
  ],

  // ---- About — bio text (use \n for new paragraph) ----
  aboutBio: `<b>Welcome</b>. I'm Bugfish — software developer, tinkerer, and builder with a habit of shipping things that actually work.
<br /><br />
I've been writing code since 2008. My work spans system tools, web platforms, games, music production, and digital art.
<br /><br />
Currently part of the anti-corruption space — navigating red tape and bureaucracy while still pushing commits every day.
<br /><br />
I have a lot of troubel with local authorities, if something unexpected occurs - feel free to download my insurance files with exclusive german torture documentation!
<br /><br />
<b>Download Mirror 1</b><br />
https://files.bugfish.eu/index.php/s/xkKdnaHoEeScnSn<br />
<br />
<b>Download Mirror 2</b><br />
Part 1 - https://1024terabox.com/s/1axQ8Q6By_B2hMpuTitXt3g<br />
Part 2 - https://1024terabox.com/s/18v7lmjlRr2ySpng51AqXDg<br />
Part 3 - https://1024terabox.com/s/1P5C8_gme9K2IptGQH--qzw<br />
Part 4 - https://1024terabox.com/s/1ac1hBq5wxSc7tDvjzOsWOw<br />
Part 5 - https://1024terabox.com/s/1BwKw0Vh9zFhiSu4xlMH-8g<br />
Part 6 - https://1024terabox.com/s/13v6znu40XWrliYama-QNyg<br />
Part 7 - https://1024terabox.com/s/10Q_G71rjf9cJySigrrtqKA<br />
Part 8 - https://1024terabox.com/s/1_hcysXTvPQlHbxVbHeXC-Q<br />
Part 9 - https://1024terabox.com/s/1vUdomsHR8Nf0asW25se-bw<br />
Part 10 - https://1024terabox.com/s/1Yq3uoi4EoVQu-osPh3xRRg<br />
Part 11 - https://1024terabox.com/s/1bDW1tSGsLXYT2Tsl8n55Lw<br />
Part 12 - https://1024terabox.com/s/1RaNqMZ8VyZX1P2C-p-k5wg<br />
Part 13 - https://1024terabox.com/s/1Yd5ulYTV470YZIv6jKAlug<br />
<br />
<b>Password List</b><br />
Password 0 Will be published in case I am MIA.<br />
Password 1 2D78CE8A1D741§3D4r8C958081E01F60!9312BAE91ECc1D81A23C1DFC3A1D89f<br />
Password 2 biPxSpByfQfJg2pCWkeMZleHsyC01KNjmgPB<br />
Password 3 5PQjLa7HcjjRU68ugwNERi3m52EmKLD6wV98<br />
`,

  // ---- Projects ----
  projects: [

{ icon: "./software/suitefish.png", name: "Suitefish CMS", url: "https://bugfishtm.github.io/suitefish-cms", desc: "A web framework prioritizing security, flexibility, and performance with a dedicated developer community." },
{ icon: "./software/dnshttp.png", name: "Bind9 Web Manager", url: "https://bugfishtm.github.io/Bind9-Web-Manager", desc: "All-in-One DNS solution for effortless management, replication, and user administration." },
{ icon: "./software/bugfish.jpg", name: "Bugfish Framework", url: "https://bugfishtm.github.io/bugfish-framework", desc: "A web framework prioritizing security, flexibility, and performance, streamlining development and scalability." },
{ icon: "./software/dolibarr.jpg", name: "Dolibarr Module", url: "https://bugfishtm.github.io/Bugfish-Dolibarr-Module", desc: "Integrates the Bugfish Framework into Dolibarr, offering advanced features for development and debugging." },
{ icon: "./software/obr.png", name: "Online Book Renting", url: "https://bugfishtm.github.io/Online-Book-Renting", desc: "Manage books on a public page and let users rent or donate them, with a powerful admin user management system." },
{ icon: "./software/mrod.png", name: "Mail Relaying over DNS", url: "https://bugfishtm.github.io/Mail-Relaying-over-DNS", desc: "Sets up a backup MX server that stores incoming emails if the primary server is offline and forwards them when it's back." },
{ icon: "./software/android.png", name: "Android Web App", url: "https://bugfishtm.github.io/Android-Web-App-Example", desc: "Ready-to-use Android Studio project for a simple web app with built-in forward, back, and home controls." },
{ icon: "./software/dci.png", name: "Dovecot Certificate Interface", url: "https://bugfishtm.github.io/Dovecot-Certificate-Interface", desc: "Manages per-domain SSL certificates for Dovecot with ISPConfig integration, automation, and user management." },
{ icon: "./software/imgdl.png", name: "Image Downloader", url: "https://bugfishtm.github.io/bugfish-image-downloader", desc: "Input a URL and retrieve all images found on that website automatically." },
{ icon: "./software/hashcracker.png", name: "Hash Cracker", url: "https://bugfishtm.github.io/windows-hash-cracker", desc: "A fast and flexible Windows tool for encoding and brute-forcing password hashes across multiple algorithms." },
{ icon: "./software/nuke.png", name: "Bugfish Nuke", url: "https://bugfishtm.github.io/bugfish-nuke", desc: "Emergency data deletion tool for Windows to quickly and securely erase sensitive files and system traces." },
{ icon: "./software/jquery.png", name: "jQuery Sortselect", url: "https://bugfishtm.github.io/bugfish-jquery-sortselect", desc: "jQuery plugin adding sortable dual list box functionality to multiple select elements, with multi-instance support." },
{ icon: "./software/proxmox.png", name: "Proxmox VMA2RAW", url: "https://bugfishtm.github.io/proxmox-vma2raw", desc: "Docker image to convert Proxmox VMA backup files to raw disk images mountable on Windows and Linux." },
{ icon: "./software/nbd.png", name: "N-Body Simulator", url: "https://bugfishtm.github.io/nbody-simulator", desc: "Interactive 2D JavaScript N-body simulator with real-time gravity and orbital motion. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./software/jme.png", name: "Markdown Editor", url: "https://bugfishtm.github.io/js-markdown-editor", desc: "Single-file Markdown editor with live preview, heading sidebar, and open/save support. No backend. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./software/pf.png", name: "Personal Accounting", url: "https://bugfishtm.github.io/js-personal-finances", desc: "Browser-based finance dashboard for income, expenses, and debts with live charts and JSON import/export. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./software/apiml.png", name: "AI/ML API Interface", url: "https://bugfishtm.github.io/simple-aiml-api-interface", desc: "Single-file browser UI for the AIML API covering chat, image, TTS, STT, and more across 15+ models. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./software/fbr.png", name: "Floor Plan Designer", url: "https://bugfishtm.github.io/floor-plan-designer", desc: "Browser-based 2D floor plan designer with furniture placement, annotations, and JSON/PNG export. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./overview/scel.png", name: "License Key Manager", url: "https://bugfishtm.github.io/suitefish-scel", desc: "Cryptographic system used to authenticate Release Files issued under the Suitefish Commercial Exception License. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./overview/imgcovert.png", name: "Image Converter", url: "https://bugfishtm.github.io/js-image-converter", desc: "Image Converter is a browser-based image format conversion tool built as a single self-contained HTML file. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./overview/audi.png", name: "Audio Converter", url: "https://bugfishtm.github.io/js-audio-converter", desc: "Audio Converter is a browser-based audio format conversion tool built as a single self-contained HTML file. ⚠️ Developed using AI; proceed at your own risk." },
{ icon: "./overview/apiforge.png", name: "API Request Tool", url: "https://bugfishtm.github.io/js-api-request-tool", desc: "APIForge is a browser-based HTTP request tool built as a single self-contained HTML file. ⚠️ Developed using AI; proceed at your own risk." },

  ],

  // ---- Social accounts ----
  social: [
    { icon: "./software/github1.png", name: "GitHub",     url: "https://github.com/bugfishtm",                      desc: "Code repositories" },
    { icon: "./software/docker.png", name: "DockerHub",     url: "https://hub.docker.com/u/bugfishtm",                      desc: "Docker repositories" },
   
    { icon: "./social/twitter1.png", name: "Twitter/X",  url: "https://x.com/bugfishx658",                         desc: "Status updates" },
    { icon: "./social/discord.jpg", name: "Discord",    url: "https://discord.com/invite/xCj7AEMmye",   desc: "Community server" },
    { icon: "./social/telegram.png", name: "Telegram",   url: "https://t.me/bugfishofficial",     desc: "Official channel" },
    { icon: "./social/steam1.png", name: "Steam",   url: "https://steamcommunity.com/groups/team-bugfish",     desc: "Gaming group" },
    { icon: "./social/patreon.png", name: "Patreon",   url: "https://www.patreon.com/c/Bugfish",     desc: "Support me" },
    { icon: "./music/spotify.png", name: "Spotify",    url: "https://open.spotify.com/artist/22t8XUzb2rVqKywyCaS36k", desc: "Music streaming" },
    { icon: "./music/bandcamp1.png", name: "Bandcamp",   url: "https://bugfish.bandcamp.com",                       desc: "Music downloads" },
    { icon: "./video/youtube.png", name: "YouTube",    url: "https://youtube.com/bugfishtm",                      desc: "Videos and art" },
    { icon: "./music/soundcloud.png", name: "SoundCloud", url: "https://soundcloud.com/bugfishtm",                   desc: "Music streaming" },
    { icon: "./social/fb.png", name: "Facebook",   url: "https://facebook.com/officialbugfish",               desc: "Social page" },
    { icon: "./social/insta.png", name: "Instagram",  url: "https://instagram.com/bugfish_tm",                   desc: "Visual content" },
    { icon: "./social/tiktok1.png", name: "TikTok",     url: "https://tiktok.com/@bugfish_tm",                     desc: "Short videos" },
    { icon: "./video/deviantart.png", name: "DeviantArt", url: "https://deviantart.com/bxgfxsh",                     desc: "Digital art gallery" },
    { icon: "./social/blogger.png", name: "Blogger",    url: "https://bugfishtm.blogspot.com",                     desc: "Blog posts" },
    { icon: "./video/pixabay.png", name: "PixaBay",    url: "https://pixabay.com/de/users/bugfish-15886987/",                     desc: "Free gallery" },
    { icon: "./video/dailymotion.png", name: "DailyMotion",    url: "https://www.dailymotion.com/user/bugfish",                     desc: "Media gallery" },
    { icon: "./social/openpetition.png", name: "OpenPetition",    url: "https://www.openpetition.de/organisation/team-bugfish",                     desc: "Political petitions" },
  ],

  // ---- Countdown — counting DOWN to a future date ----
  countdown: {
    label:    "DEAD OR ALIVE",
    sublabel: "TEAM BUGFISH VS POLIZEI",
    date:     "2026-11-07",            // ISO date string (YYYY-MM-DD)
  },

  // ---- Music player tracks ----
  // Put your .mp3 files in a music/ subfolder next to index.html.
  // title: display name shown in the player
  // file:  relative path to the mp3
  music: [
    { title: "Mortis", file: "./music/mortis.mp3" },
    { title: "Fear", file: "./music/fear.mp3" },
    { title: "Transcend", file: "./music/transcend.mp3" },
  ],

  // ---- Uptime counters — counting UP from past dates ----
  // Add or remove objects to add/remove counters.
  uptimeCounters: [
    {
      label:       "SEEDER SINCE",
      date:        "2008-01-01",       // ISO date string (YYYY-MM-DD)
      description: "First line of code written"
    },
    {
      label:       "RESISTANCE SINCE",
      date:        "2018-08-21",       // ISO date string
      description: "Evading the state and crooked cops"
    },
  ],

};

// ============================================================
// MUSIC PLAYER
// ============================================================

function initMusicPlayer() {
  const container = document.getElementById("music-player-container");
  if (!CONFIG.music || !CONFIG.music.length) return;

  const tracks = CONFIG.music;
  let current  = 0;
  let playing  = false;

  const audio = new Audio();
  audio.volume = 0.7;

  // Build player HTML
  container.innerHTML = `
    <div class="music-player">
      <div class="mp-header">
        <span class="mp-label">// MUSIC</span>
        <span class="mp-track-name" id="mp-name">${tracks[0].title}</span>
        <span class="mp-time"><span id="mp-cur">0:00</span>&nbsp;/&nbsp;<span id="mp-dur">0:00</span></span>
      </div>
      <div class="mp-progress-wrap" id="mp-prog-wrap">
        <div class="mp-progress-bar">
          <div class="mp-progress-fill" id="mp-fill"></div>
        </div>
      </div>
      <div class="mp-controls">
        <button class="mp-btn" id="mp-prev" title="Previous">⏮</button>
        <button class="mp-btn" id="mp-play" title="Play/Pause">▶</button>
        <button class="mp-btn" id="mp-next" title="Next">⏭</button>
        <div class="mp-vol">
          <span class="mp-vol-label">VOL</span>
          <input type="range" class="mp-vol-slider" id="mp-vol" min="0" max="1" step="0.05" value="0.7">
        </div>
      </div>
      <ul class="mp-tracklist" id="mp-tracklist"></ul>
    </div>
  `;

  const nameEl   = document.getElementById("mp-name");
  const curEl    = document.getElementById("mp-cur");
  const durEl    = document.getElementById("mp-dur");
  const fillEl   = document.getElementById("mp-fill");
  const playBtn  = document.getElementById("mp-play");
  const prevBtn  = document.getElementById("mp-prev");
  const nextBtn  = document.getElementById("mp-next");
  const volEl    = document.getElementById("mp-vol");
  const progWrap = document.getElementById("mp-prog-wrap");
  const listEl   = document.getElementById("mp-tracklist");

  // Build track list
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "mp-track-item" + (i === 0 ? " active" : "");
    li.dataset.idx = i;
    li.innerHTML = `
      <span class="mp-track-num">${String(i + 1).padStart(2, "0")}</span>
      <span class="mp-track-title">${t.title}</span>
      <span class="mp-eq${playing ? "" : " paused"}"><span></span><span></span><span></span></span>
    `;
    li.addEventListener("click", () => loadTrack(i, true));
    listEl.appendChild(li);
  });

  function fmtTime(s) {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function updateTrackList() {
    document.querySelectorAll(".mp-track-item").forEach((el, i) => {
      el.classList.toggle("active", i === current);
      const eq = el.querySelector(".mp-eq");
      if (eq) eq.classList.toggle("paused", !playing);
    });
  }

  function loadTrack(idx, autoplay = false) {
    current = idx;
    audio.src = tracks[idx].file;
    nameEl.textContent = tracks[idx].title;
    fillEl.style.width = "0%";
    curEl.textContent = "0:00";
    durEl.textContent = "0:00";
    updateTrackList();
    if (autoplay) {
      audio.play().catch(() => {});
      playing = true;
      playBtn.textContent = "⏸";
      playBtn.classList.add("play-active");
      updateTrackList();
    }
  }

  function togglePlay() {
    if (audio.paused) {
      if (!audio.src || audio.src === window.location.href) loadTrack(current, true);
      else audio.play().catch(() => {});
      playing = true;
      playBtn.textContent = "⏸";
      playBtn.classList.add("play-active");
    } else {
      audio.pause();
      playing = false;
      playBtn.textContent = "▶";
      playBtn.classList.remove("play-active");
    }
    updateTrackList();
  }

  playBtn.addEventListener("click", togglePlay);

  prevBtn.addEventListener("click", () => {
    loadTrack((current - 1 + tracks.length) % tracks.length, playing);
  });

  nextBtn.addEventListener("click", () => {
    loadTrack((current + 1) % tracks.length, playing);
  });

  audio.addEventListener("ended", () => {
    loadTrack((current + 1) % tracks.length, true);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    fillEl.style.width = pct + "%";
    curEl.textContent = fmtTime(audio.currentTime);
    durEl.textContent = fmtTime(audio.duration);
  });

  progWrap.addEventListener("click", e => {
    const rect = progWrap.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  volEl.addEventListener("input", () => { audio.volume = parseFloat(volEl.value); });

  // Load first track (no autoplay — browser policy)
  loadTrack(0, false);
}

// ============================================================
// ZORK GAME ENGINE
// ============================================================
const GAME = {
  currentRoom: "server_room",
  inventory:   [],

  rooms: {
    server_room: {
      name:    "HALLWAY",
      desc:    "A dimly lit hallway. Orange LEDs blink across racks of humming equipment. You can see doors leading in different directions.",
      exits:   { north: "code_vault", east: "music_studio", south: "art_gallery", west: "the_net" },
      items:   [],
      visited: false,
    },
    code_vault: {
      name:    "CODE VAULT",
      desc:    "Rows of glowing monitors display cascading lines of PHP and JavaScript. Git commits stretch back to 2008.",
      exits:   { south: "server_room" },
      items:   ["debugger"],
      visited: false,
    },
    music_studio: {
      name:    "MUSIC STUDIO",
      desc:    "Synthesizers and MIDI controllers cover every surface. The speakers crackle with a half-finished track.",
      exits:   { west: "server_room" },
      items:   ["headphones"],
      visited: false,
    },
    art_gallery: {
      name:    "ART GALLERY",
      desc:    "Digital canvases cover the walls. Some pieces are dated 2012, others were rendered last night.",
      exits:   { north: "server_room" },
      items:   ["pixel_brush"],
      visited: false,
    },
    the_net: {
      name:    "TORTURE CHAMBER",
      desc:    "You can hear screams of pain in the distance.",
      exits:   { east: "server_room" },
      items:   ["rope"],
      visited: false,
    },
  },

  items: {
    debugger:    { name: "DEBUGGER",     desc: "A handheld debugger with a cracked screen. Still finds every bug on the first pass." },
    headphones:  { name: "HEADPHONES",   desc: "Over-ear headphones with warm pads. They play music." },
    rope: { name: "ROPE",  desc: "Strong and resilient." },
  },

  cmdHistory: [],

  process(input) {
    const raw   = input.trim();
    const lower = raw.toLowerCase();
    const parts = lower.split(/\s+/);
    const cmd   = parts[0];
    const arg   = parts.slice(1).join(" ");

    if (!cmd) return [];

    // Direction aliases
    const dirMap = { n: "north", s: "south", e: "east", w: "west" };
    if (dirMap[cmd]) return this._go(dirMap[cmd]);

    switch (cmd) {
      case "help":    return this._help();
      case "look":
      case "l":       return this._look();
      case "go":      return this._go(arg);
      case "take":
      case "get":     return this._take(arg);
      case "drop":    return this._drop(arg);
      case "examine":
      case "x":       return this._examine(arg);
      case "inventory":
      case "inv":
      case "i":       return this._inventory();
      case "clear":   return [{ _clear: true }];
      case "ls":      return ["Hint: this isn't a real shell. Try 'look'."];
      case "pwd":     return [`/${this.currentRoom}`];
      case "sudo":    return ["Permission granted."];
      default:
        return [`Command not found: '${cmd}'. Type 'help'.`];
    }
  },

  _help() {
    return [
      "─── COMMAND REFERENCE ───────────────────",
      "  look / l          examine surroundings",
      "  go [dir]          move: north south east west",
      "  n / s / e / w     shorthand directions",
      "  take [item]       pick up an item",
      "  drop [item]       drop an item",
      "  examine [item]    inspect an item",
      "  inventory / i     check your bag",
      "  clear             clear terminal",
      "─────────────────────────────────────────",
    ];
  },

  _look() {
    const room  = this.rooms[this.currentRoom];
    const exits = Object.keys(room.exits).map(d => d.toUpperCase()).join("  ");
    const lines = [
      `╔═ ${room.name} ${"═".repeat(Math.max(0, 34 - room.name.length))}╗`,
      room.desc,
      `╚${"═".repeat(40)}╝`,
    ];
    if (room.items.length) {
      const itemNames = room.items.map(k => this.items[k]?.name || k).join(", ");
      lines.push(`ITEMS    : ${itemNames}`);
    } else {
      lines.push(`ITEMS    : None`);
    }
    return lines;
  },

  _go(dir) {
    const room = this.rooms[this.currentRoom];
    if (!dir) return ["Go where? Specify: north, south, east, west."];
    const dest = room.exits[dir];
    if (!dest) return [`No exit to the ${dir.toUpperCase()}.`];

    this.currentRoom = dest;
    const newRoom = this.rooms[dest];

    const out = [`> Moving ${dir.toUpperCase()}...`, ""];
    if (!newRoom.visited) {
      newRoom.visited = true;
      out.push(...this._look());
    } else {
      out.push(`[ ${newRoom.name} ]`);
      const exits = Object.keys(newRoom.exits).map(d => d.toUpperCase()).join("  ");
      if (newRoom.items.length) {
        out.push(`ITEMS: ${newRoom.items.map(k => this.items[k]?.name || k).join(", ")}`);
      } else {
        out.push(`ITEMS: None`);
      }
    }
    return out;
  },

  _take(name) {
    if (!name) return ["Take what?"];
    const room  = this.rooms[this.currentRoom];
    const found = room.items.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name)
    );
    if (!found) return [`No '${name}' here.`];
    room.items = room.items.filter(k => k !== found);
    this.inventory.push(found);
    return [`Picked up: ${this.items[found]?.name || found}`];
  },

  _drop(name) {
    if (!name) return ["Drop what?"];
    const found = this.inventory.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name)
    );
    if (!found) return [`Not carrying '${name}'.`];
    this.inventory = this.inventory.filter(k => k !== found);
    this.rooms[this.currentRoom].items.push(found);
    return [`Dropped: ${this.items[found]?.name || found}`];
  },

  _examine(name) {
    if (!name) return ["Examine what?"];
    const all  = [...this.inventory, ...this.rooms[this.currentRoom].items];
    const found = all.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name)
    );
    if (!found) return [`You don't see any '${name}' here.`];
    return [this.items[found]?.desc || "Nothing special."];
  },

  _inventory() {
    if (!this.inventory.length) return ["You're carrying nothing."];
    return ["CARRYING:", ...this.inventory.map(k => `  ▸ ${this.items[k]?.name || k}`)];
  },

};

// ============================================================
// MATRIX RAIN
// ============================================================

function initMatrix() {
  const canvas = document.getElementById("matrix-canvas");
  const ctx    = canvas.getContext("2d");
  const chars  = "01ABCDEFabcdef!@#$%^&*<>/\\[]{}|=+-~`ΩΨΦΣΞΔΛΘαβγδεζηθι".split("");
  const fSize  = 14;
  let cols, drops;

  function resize() {
    canvas.width  = canvas.offsetWidth  || canvas.parentElement.offsetWidth;
    canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;
    cols  = Math.floor(canvas.width / fSize);
    drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -50));
  }

  function draw() {
    ctx.fillStyle = "rgba(8,8,8,0.055)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const bright = Math.random() > 0.92;
      ctx.fillStyle = bright ? "#ff8c00" : "#7a3000";
      ctx.globalAlpha = Math.random() * 0.5 + 0.1;
      ctx.font = `${fSize}px monospace`;
      ctx.fillText(ch, i * fSize, drops[i] * fSize);
      ctx.globalAlpha = 1;

      if (drops[i] * fSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  setInterval(draw, 48);
}


// ============================================================
// ZORK TERMINAL UI
// ============================================================

function initGame() {
  const output = document.getElementById("game-output");
  const input  = document.getElementById("game-input");
  const term   = document.getElementById("zork-terminal");

  let histIdx  = -1;

  function addLine(text, type = "") {
    const d = document.createElement("div");
    d.className = text === "" ? "game-line empty" : `game-line ${type}`;
    if (text !== "") d.textContent = text;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  function printLines(lines, type = "") {
    if (!Array.isArray(lines)) lines = [lines];
    lines.forEach(ln => {
      if (typeof ln === "object" && ln._clear) { output.innerHTML = ""; return; }
      addLine(ln, type);
    });
  }

  // Boot sequence
  const boot = [
    "Type 'help' for commands.",
    "Type 'look' to explore.",
    "",
  ];

  let bi = 0;
  function bootTick() {
    if (bi < boot.length) {
      addLine(boot[bi], "sys");
      bi++;
      setTimeout(bootTick, 100);
    } else {
      printLines(GAME._look());
      addLine("", "");
      input.focus();
    }
  }
  bootTick();

  function submit() {
    const val = input.value.trim();
    if (!val) return;

    GAME.cmdHistory.unshift(val);
    histIdx = -1;

    addLine(`> ${val}`, "cmd");
    input.value = "";

    const result = GAME.process(val);
    printLines(result);
    addLine("", "");
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx < GAME.cmdHistory.length - 1) {
        histIdx++;
        input.value = GAME.cmdHistory[histIdx];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        input.value = GAME.cmdHistory[histIdx];
      } else {
        histIdx = -1;
        input.value = "";
      }
    }
  });

  term.addEventListener("click", () => input.focus());
}

// ============================================================
// ABOUT SECTION
// ============================================================

function initAbout() {
  const container = document.getElementById("about-container");

  // Stats block
  const stats = document.createElement("div");
  stats.className = "about-block";
  stats.innerHTML = `<div class="about-block-title">// profile.dat</div>`;
  CONFIG.aboutStats.forEach(r => {
    const row = document.createElement("div");
    row.className = "about-row";
    row.innerHTML = `<span class="about-key">${r.key}</span><span class="about-val">${r.val}</span>`;
    stats.appendChild(row);
  });
  container.appendChild(stats);

  // Skills block
  const skills = document.createElement("div");
  skills.className = "about-block";
  skills.innerHTML = `<div class="about-block-title">// skills.dat</div>`;
  CONFIG.aboutSkills.forEach(r => {
    const row = document.createElement("div");
    row.className = "about-row";
    row.innerHTML = `<span class="about-key">${r.key}</span><span class="about-val">${r.val}</span>`;
    skills.appendChild(row);
  });
  container.appendChild(skills);

  // Bio block
  const bio = document.createElement("div");
  bio.className = "about-bio";
  bio.innerHTML = `<div class="about-block-title">// bio.txt</div>`;
  bio.innerHTML = CONFIG.aboutBio;
  container.appendChild(bio);
}


// ============================================================
// UPTIME COUNTERS
// ============================================================

function initCounters() {
  const grid = document.getElementById("counters-grid");

  CONFIG.uptimeCounters.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "counter-card";
    card.innerHTML = `
      <div class="counter-card-label">${c.label}</div>
      <div class="counter-card-since">SINCE ${c.date}</div>
      <div class="counter-segments">
        <div class="counter-seg">
          <div class="counter-num" id="c-d-${idx}">0000</div>
          <div class="counter-unit">DAYS</div>
        </div>
        <div class="counter-sep">:</div>
        <div class="counter-seg">
          <div class="counter-num" id="c-h-${idx}">00</div>
          <div class="counter-unit">HRS</div>
        </div>
        <div class="counter-sep">:</div>
        <div class="counter-seg">
          <div class="counter-num" id="c-m-${idx}">00</div>
          <div class="counter-unit">MIN</div>
        </div>
        <div class="counter-sep">:</div>
        <div class="counter-seg">
          <div class="counter-num" id="c-s-${idx}">00</div>
          <div class="counter-unit">SEC</div>
        </div>
      </div>
      <div class="counter-card-desc">${c.description}</div>
    `;
    grid.appendChild(card);
  });

  const pad = (n, w = 2) => String(n).padStart(w, "0");

  function tick() {
    CONFIG.uptimeCounters.forEach((c, idx) => {
      const diff = Date.now() - new Date(c.date).getTime();
      if (diff < 0) return;
      const s = Math.floor(diff / 1000);
      document.getElementById(`c-d-${idx}`).textContent = pad(Math.floor(s / 86400), 4);
      document.getElementById(`c-h-${idx}`).textContent = pad(Math.floor(s / 3600) % 24);
      document.getElementById(`c-m-${idx}`).textContent = pad(Math.floor(s / 60) % 60);
      document.getElementById(`c-s-${idx}`).textContent = pad(s % 60);
    });
  }

  tick();
  setInterval(tick, 1000);
}


// ============================================================
// COUNTDOWN
// ============================================================

function initCountdown() {
  const container = document.getElementById("countdown-container");
  const cd = CONFIG.countdown;

  const card = document.createElement("div");
  card.className = "countdown-card";
  card.innerHTML = `
    <div class="countdown-label" style="margin: 0px 0px 0px 0px;padding: 0px 0px 0px 0px;">${cd.label}</div>
    <div class="countdown-sublabel" style="margin: 0px 0px 0px 0px;padding: 0px 0px 0px 0px;">${cd.sublabel}</div>
    <div class="countdown-number" id="cd-num" style="margin: 0px 0px 0px 0px;padding: 0px 0px 0px 0px;">---</div>
    <div class="countdown-unit" style="margin: 0px 0px 0px 0px;padding: 0px 0px 0px 0px;">DAYS REMAINING</div>
    <div class="countdown-date" style="margin: 0px 0px 0px 0px;padding: 0px 0px 0px 0px;">TARGET: ${cd.date}</div>
  `;
 // container.appendChild(card);

  function tick() {
    const diff = new Date(cd.date).getTime() - Date.now();
    const el   = document.getElementById("cd-num");
    if (diff <= 0) { el.textContent = "000"; return; }
    el.textContent = String(Math.ceil(diff / 86400000)).padStart(3, "0");
  }

  //tick();
  //setInterval(tick, 60000);
}


// ============================================================
// CARD GRIDS
// ============================================================

function isImagePath(str) {
  if (!str) return false;
  return str.includes("/") || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(str);
}

function buildIconHtml(icon, name) {
  if (isImagePath(icon)) {
    return `<div class="card-img-wrap"><img src="${icon}" alt="${name}" loading="lazy"></div>`;
  }
  return `<div class="card-icon">${icon || "??"}</div>`;
}

function initGrid(id, items) {
  const grid = document.getElementById(id);
  items.forEach(item => {
    const a = document.createElement("a");
    a.className = "card";
    a.href      = item.url || "#";
    if (item.url) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.innerHTML = `
      ${buildIconHtml(item.icon, item.name)}
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.desc}</div>
      <div class="card-arrow">↗</div>
    `;
    grid.appendChild(a);
  });
}


// ============================================================
// SIDEBAR TOGGLE (mobile)
// ============================================================

function initSidebar() {
  const btn     = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  const open  = () => { sidebar.classList.add("open");  overlay.classList.add("active");  btn.classList.add("active");  };
  const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("active"); btn.classList.remove("active"); };

  btn.addEventListener("click", () => sidebar.classList.contains("open") ? close() : open());
  overlay.addEventListener("click", close);
  document.querySelectorAll(".nav-link").forEach(l => l.addEventListener("click", () => {
    if (window.innerWidth <= 768) close();
  }));
}


// ============================================================
// SCROLLSPY
// ============================================================

function initScrollspy() {
  const ids   = ["hero","about","counters","countdown","distribution","projects","social"];
  const links = {};
  ids.forEach(id => { links[id] = document.querySelector(`.nav-link[href="#${id}"]`); });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
        if (links[e.target.id]) links[e.target.id].classList.add("active");
      }
    });
  }, { threshold: 0.25 });

  ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
}


// ============================================================
// HERO INIT
// ============================================================

function initHero() {
  document.title = `${CONFIG.name}`;
  document.getElementById("hero-tagline").textContent = CONFIG.tagline;
  document.getElementById("hero-desc").textContent    = CONFIG.description;

  const pillsEl = document.getElementById("hero-pills");
  CONFIG.tags.forEach(tag => {
    const s = document.createElement("span");
    s.className   = "pill";
    s.textContent = tag;
    pillsEl.appendChild(s);
  });

  // Update main-site button href
  document.querySelector('a[href="https://bugfish.eu"]').href = CONFIG.mainSite;

  document.getElementById("footer-year").textContent =
    `© ${new Date().getFullYear()} ${CONFIG.name}`;
}


// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initMusicPlayer();
  initMatrix();
  initGame();
  initAbout();
  initCounters();
  initCountdown();
  initGrid("dist-grid",      CONFIG.distribution);
  initGrid("projects-grid",  CONFIG.projects);
  initGrid("social-grid",    CONFIG.social);
  initSidebar();
  initScrollspy();
});
