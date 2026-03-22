// ── State ──
let currentCinema  = 'hollywood';
let currentGenre   = 'all';
let currentMood    = 'all';
let searchQ        = '';
let selectedMovies = new Set();
let songStates     = {};
let generatedSongs = [];

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  buildGenreStrip('hollywood');
  renderMovies();
});

function scrollToApp() {
  document.getElementById('appSection').scrollIntoView({ behavior: 'smooth' });
}

function currentMovieList() {
  return currentCinema === 'hollywood' ? HOLLYWOOD : BOLLYWOOD;
}

function switchCinema(cinema, el) {
  currentCinema = cinema;
  currentGenre  = 'all';
  searchQ       = '';
  document.querySelector('.search-input').value = '';
  document.querySelectorAll('.cinema-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  buildGenreStrip(cinema);
  renderMovies();
}

function buildGenreStrip(cinema) {
  const genres = cinema === 'hollywood' ? HW_GENRES : BW_GENRES;
  const strip  = document.getElementById('genreStrip');
  strip.innerHTML = genres.map((g, i) => `
    <button class="filter-chip ${i === 0 ? 'active' : ''}" onclick="filterGenre('${g}',this)">
      ${g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
    </button>`).join('');
}

function filterGenre(g, el) {
  currentGenre = g;
  document.querySelectorAll('#genreStrip .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderMovies();
}

function handleSearch(val) {
  searchQ = val.toLowerCase();
  renderMovies();
}

// ── Movie render ──
function renderMovies() {
  const list     = currentMovieList();
  const filtered = list.filter(m => {
    const matchG = currentGenre === 'all' || m.genre === currentGenre;
    const matchS = !searchQ || m.name.toLowerCase().includes(searchQ);
    return matchG && matchS;
  });

  const grid = document.getElementById('movieGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="grid-loading">No movies found</div>`;
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const globalIdx = list.indexOf(m);
    const key       = `${currentCinema}:${globalIdx}`;
    const sel       = selectedMovies.has(key);
    return `
      <div class="movie-card ${sel ? 'selected' : ''}" onclick="toggleMovie('${currentCinema}',${globalIdx})">
        <img class="movie-poster" 
          src="${m.poster}" 
          alt="${m.name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="movie-poster-placeholder" style="display:none">
          <span style="font-size:2.2rem">${m.emoji}</span>
          <span>${m.name}</span>
        </div>
        <div class="movie-overlay">
          <div class="movie-overlay-title">${m.name}</div>
          <div class="movie-overlay-year">${m.year}</div>
        </div>
        <div class="movie-check">✓</div>
      </div>`;
  }).join('');
}

function toggleMovie(cinema, idx) {
  const key = `${cinema}:${idx}`;
  if (selectedMovies.has(key)) selectedMovies.delete(key);
  else selectedMovies.add(key);
  const total = selectedMovies.size;
  document.getElementById('movieCount').textContent = total;
  document.getElementById('step1Btn').disabled = total < 5;
  renderMovies();
}

// ── Step navigation ──
function goStep1() { setStep(1); renderMovies(); }

function goStep2() {
  generatedSongs = buildSongList();
  songStates     = {};
  document.getElementById('songCount').textContent = '0';
  document.getElementById('step2Btn').disabled = true;
  setStep(2);
  renderSongs();
}

async function goStep3() {
  setStep(3);
  await fetchRecs();
}

function setStep(n) {
  document.querySelectorAll('.step-section').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === n);
  });
  [1, 2, 3].forEach(i => {
    const si = document.getElementById(`si${i}`);
    si.classList.remove('active', 'done');
    if      (i < n)  si.classList.add('done');
    else if (i === n) si.classList.add('active');
    const el = si.querySelector('.step-num');
    el.textContent = i < n ? '✓' : `0${i}`;
  });
  [1, 2].forEach(i => {
    document.getElementById(`sc${i}`).classList.toggle('done', i < n);
  });
  window.scrollTo({ top: document.getElementById('appSection').offsetTop - 20, behavior: 'smooth' });
}

// ── Songs ──
function buildSongList() {
  const selGenres = new Set();
  selectedMovies.forEach(key => {
    const [cinema, idx] = key.split(':');
    const list = cinema === 'hollywood' ? HOLLYWOOD : BOLLYWOOD;
    selGenres.add(list[parseInt(idx)].genre);
  });

  const scored = ALL_SONGS.map(s => ({
    ...s,
    score: s.genres.filter(g => selGenres.has(g)).length
  })).sort((a, b) => b.score - a.score);

  const seen = new Set();
  const result = [];
  for (const s of scored) {
    if (!seen.has(s.title) && result.length < 16) {
      seen.add(s.title);
      result.push(s);
    }
  }
  return result;
}

function renderSongs() {
  const mood   = currentMood;
  const list   = document.getElementById('songList');
  const toShow = generatedSongs.filter(s => mood === 'all' || s.vibe === mood);

  list.innerHTML = toShow.map(s => {
    const idx   = generatedSongs.indexOf(s);
    const state = songStates[idx];
    return `
      <div class="song-card ${state || ''}" id="sc${idx}">
        <div class="song-emoji">${s.emoji}</div>
        <div class="song-info">
          <div class="song-title">${s.title}</div>
          <div class="song-artist">${s.artist}</div>
          <div class="song-vibe">${s.mood}</div>
        </div>
        <div class="song-actions">
          <button class="song-btn like ${state === 'liked' ? 'on' : ''}"    onclick="rateSong(${idx},'liked')">❤️</button>
          <button class="song-btn skip ${state === 'disliked' ? 'on' : ''}" onclick="rateSong(${idx},'disliked')">✕</button>
        </div>
      </div>`;
  }).join('');
}

function rateSong(idx, state) {
  songStates[idx] = songStates[idx] === state ? null : state;
  const liked = Object.values(songStates).filter(v => v === 'liked').length;
  document.getElementById('songCount').textContent = liked;
  document.getElementById('step2Btn').disabled = liked < 2;
  renderSongs();
}

function filterMood(mood, el) {
  currentMood = mood;
  document.querySelectorAll('#moodStrip .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderSongs();
}

// ── AI Recommendations ──
async function fetchRecs() {
  const area = document.getElementById('resultsArea');
  area.innerHTML = `<div class="results-loading">
    <div class="spinner"></div>
    <p>Reading your taste profile…</p>
  </div>`;

  const watched = [...selectedMovies].map(key => {
    const [cinema, idx] = key.split(':');
    const list = cinema === 'hollywood' ? HOLLYWOOD : BOLLYWOOD;
    return `${list[parseInt(idx)].name} (${cinema === 'hollywood' ? 'Hollywood' : 'Bollywood'})`;
  }).join(', ');

  const liked    = generatedSongs.filter((_, i) => songStates[i] === 'liked').map(s => `${s.title} by ${s.artist}`).join(', ');
  const disliked = generatedSongs.filter((_, i) => songStates[i] === 'disliked').map(s => s.title).join(', ');

  const prompt = `You are a world-class movie recommendation engine. Based on this person's taste profile, recommend movies they have NOT seen yet.

Movies they have watched: ${watched}
Songs they liked: ${liked || 'none'}
Songs they skipped: ${disliked || 'none'}

Return ONLY a valid JSON object. No markdown. No backticks. No explanation. Just the raw JSON:
{"hollywood":[{"title":"Movie Title","year":"2023","genre":"Genre","why":"One personal sentence why they would love this","matchScore":"94%","vibe":"Short vibe tag"},{"title":"...","year":"...","genre":"...","why":"...","matchScore":"...","vibe":"..."},{"title":"...","year":"...","genre":"...","why":"...","matchScore":"...","vibe":"..."}],"bollywood":[{"title":"...","year":"...","genre":"...","why":"...","matchScore":"...","vibe":"..."},{"title":"...","year":"...","genre":"...","why":"...","matchScore":"...","vibe":"..."},{"title":"...","year":"...","genre":"...","why":"...","matchScore":"...","vibe":"..."}]}

Rules:
- Exactly 3 Hollywood + 3 Bollywood movies
- Must NOT be in their watched list
- Be very specific in "why" — mention their actual movies or songs
- Match scores between 85-97%`;

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
    });

    const data = await res.json();
    let text = data.content?.[0]?.text || '';

    // Extra cleanup
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd   = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    const recs = JSON.parse(text);

    const likedVibes = [...new Set(
      generatedSongs.filter((_, i) => songStates[i] === 'liked').map(s => s.mood)
    )];

    renderResults(recs, likedVibes, watched);
  } catch (err) {
    area.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--stone)">
      <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
      <p>Something went wrong. Please try again.</p>
      <button class="btn-next" style="margin-top:20px" onclick="goStep3()">Retry</button>
    </div>`;
  }
}

// Lookup poster from our data
function getPosterForTitle(title) {
  const all = [...HOLLYWOOD, ...BOLLYWOOD];
  const found = all.find(m => m.name.toLowerCase() === title.toLowerCase());
  return found ? found.poster : null;
}

function renderResults(recs, vibes, watched) {
  const area = document.getElementById('resultsArea');

  const renderSection = (title, movies) => {
    if (!movies || !movies.length) return '';
    const cards = movies.map((m, i) => {
      const poster = getPosterForTitle(m.title) || `https://placehold.co/200x300/ede8df/9c9080?text=${encodeURIComponent(m.title)}`;
      return `
        <div class="result-card" style="animation-delay:${i * 0.1}s">
          <div class="result-poster-wrap">
            <img class="result-poster" src="${poster}" alt="${m.title}"
              onerror="this.src='https://placehold.co/200x300/ede8df/9c9080?text=${encodeURIComponent(m.title)}'">
            <div class="result-badge">${m.matchScore} match</div>
          </div>
          <div class="result-body">
            <div class="result-title">${m.title}</div>
            <div class="result-meta">${m.year} · ${m.genre}</div>
            <div class="result-why">${m.why}</div>
            <span class="result-vibe">${m.vibe}</span>
          </div>
        </div>`;
    }).join('');
    return `<div class="result-section-title">${title}</div>
            <div class="result-grid">${cards}</div>`;
  };

  const watchedCount = watched.split(',').length;
  const likedCount   = Object.values(songStates).filter(v => v === 'liked').length;

  area.innerHTML = `
    ${renderSection('🎬 Hollywood Picks', recs.hollywood)}
    ${renderSection('🎭 Bollywood Picks', recs.bollywood)}
    <div class="taste-card">
      <h3>Your Taste Profile</h3>
      <p>Based on ${watchedCount} movies & ${likedCount} songs you loved</p>
      <div class="taste-tags">
        ${vibes.map(v => `<span class="taste-tag">${v}</span>`).join('')}
        <span class="taste-tag">🎬 ${watchedCount} watched</span>
        <span class="taste-tag">🎵 ${likedCount} songs liked</span>
      </div>
    </div>`;
}

// ── Reset ──
function resetAll() {
  selectedMovies.clear();
  songStates     = {};
  generatedSongs = [];
  currentCinema  = 'hollywood';
  currentGenre   = 'all';
  currentMood    = 'all';
  searchQ        = '';
  document.querySelector('.search-input').value = '';
  document.getElementById('movieCount').textContent = '0';
  document.getElementById('songCount').textContent  = '0';
  document.getElementById('step1Btn').disabled = true;
  document.querySelectorAll('.cinema-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  buildGenreStrip('hollywood');
  renderMovies();
  setStep(1);
}
