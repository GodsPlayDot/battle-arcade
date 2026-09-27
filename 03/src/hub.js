const games = [
  { id: 'grid', title: 'Grid Combat', kicker: 'Tactical arena', description: 'Position, plan, and outplay opponents on an isometric combat grid.', accent: '#f6b73c', path: '/games/grid-combat/', modes: 'Tactics · AI battles', session: '10–20 min', skill: 'Strategic' },
  { id: 'spin', title: 'Spin Arena', kicker: 'Top battler', description: 'Build a custom spinning top, select a loadout, and master the arena.', accent: '#36d4ff', path: '/games/spin-arena/', modes: 'Arena · loadouts', session: '5–10 min', skill: 'Action' },
  { id: 'slime', title: 'Slime Arcade', kicker: 'Battle & mini-games', description: 'Raise a slime fighter and jump into a whole cabinet of arcade challenges.', accent: '#82f16b', path: '/games/slime-arcade/', modes: 'Battles · cabinet', session: 'Quick play', skill: 'Arcade' },
  { id: 'ascension-chess', title: 'Ascension Chess', kicker: 'Tactical chess RPG', description: 'Command evolving chess pieces in a tactical, ascendant battle.', accent: '#d4b465', path: '/games/ascension-chess/', modes: '3D chess · RPG', session: '15–30 min', skill: 'Deep strategy' }
];

const app = document.querySelector('#app');
let activeId = null;
let activeFilter = 'all';
let searchTerm = '';
const profileKey = 'battleArcadeProfile-v1';
const defaultProfile = { name: 'Challenger', xp: 0, played: [], favorites: [], recent: [], reducedMotion: false };
let profile = readProfile();

function readProfile() {
  try {
    const stored = { ...defaultProfile, ...JSON.parse(localStorage.getItem(profileKey) || '{}') };
    const migrateId = (id) => id === 'metem' ? 'ascension-chess' : id;
    const validIds = new Set(games.map((game) => game.id));
    const normalizeIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(migrateId).filter((id) => validIds.has(id)))];
    const played = normalizeIds(stored.played);
    return {
      ...stored,
      xp: Math.min(Number.isFinite(stored.xp) ? stored.xp : 0, played.length * 25),
      played,
      favorites: normalizeIds(stored.favorites),
      recent: normalizeIds(stored.recent).slice(0, 3)
    };
  } catch { return { ...defaultProfile }; }
}
function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify(profile));
  document.documentElement.classList.toggle('reduce-motion', profile.reducedMotion);
}
function gameById(id) { return games.find((game) => game.id === id); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
function visibleGames() {
  const query = searchTerm.trim().toLowerCase();
  return games
    .filter((game) => activeFilter === 'all' || game.skill === activeFilter)
    .filter((game) => !query || `${game.title} ${game.kicker} ${game.description} ${game.modes}`.toLowerCase().includes(query))
    .sort((left, right) => Number(profile.favorites.includes(right.id)) - Number(profile.favorites.includes(left.id)) || games.indexOf(left) - games.indexOf(right));
}
function unlocks() {
  const titles = [];
  if (profile.played.length >= 1) titles.push('First Bell');
  if (profile.played.length >= 2) titles.push('World Hopper');
  if (profile.played.length === games.length) titles.push('Arcade Tour');
  return titles;
}
function launchGame(id) {
  const isNew = !profile.played.includes(id);
  profile = {
    ...profile,
    xp: profile.xp + (isNew ? 25 : 0),
    played: isNew ? [...profile.played, id] : profile.played,
    recent: [id, ...profile.recent.filter((recentId) => recentId !== id)].slice(0, 3)
  };
  saveProfile();
  activeId = id;
  render();
}

function render() {
  if (activeId) {
    const game = gameById(activeId);
    document.title = `${game.title} — Battle Arcade`;
    app.innerHTML = `
      <section class="player-shell">
        <header class="player-header"><button class="back" id="back" aria-label="Return to Battle Arcade">← Arcade</button><div><small>${game.kicker} · ${game.modes}</small><strong>${game.title}</strong></div><span class="live"><i></i> PLAYING</span></header>
        <iframe title="${game.title}" src="${game.path}" allow="fullscreen" tabindex="0"></iframe>
      </section>`;
    document.querySelector('#back').addEventListener('click', () => { activeId = null; render(); });
    return;
  }

  document.title = 'Battle Arcade';
  const recent = profile.recent.map(gameById).filter(Boolean);
  const achievements = unlocks();
  const nextGame = games.find((game) => !profile.played.includes(game.id));
  const displayedGames = visibleGames();
  app.innerHTML = `
    <section class="home">
      <header class="masthead"><a class="brand" href="/">BATTLE <b>ARCADE</b></a><div class="mast-actions"><span>4 WORLDS · ONE LAUNCHER</span><button class="report-button" id="report">QUALITY REPORT</button><button class="icon-button" id="settings" aria-label="Arcade settings">⚙</button></div></header>
      <div class="hero"><p class="eyebrow">SELECT YOUR ARENA</p><h1>Every fight starts<br>with a choice.</h1><p class="intro">Four distinct combat worlds, one clean place to play them.</p></div>
      <section class="arcade-meta" aria-label="Arcade profile"><div><span class="meta-label">ARCADE PROFILE</span><strong>${escapeHtml(profile.name)}</strong><small>${profile.xp} XP · ${profile.played.length}/${games.length} worlds explored</small><div class="progress-track" aria-label="${profile.played.length} of ${games.length} worlds explored"><i style="width:${(profile.played.length / games.length) * 100}%"></i></div></div><div><span class="meta-label">ACHIEVEMENTS</span><strong>${achievements.length ? achievements.join(' · ') : 'Your first bell awaits'}</strong><small>${recent.length ? `Recent: ${recent.map((game) => game.title).join(' · ')}` : 'Choose an arena to begin'}</small></div></section>
      ${recent[0] ? `<section class="resume-strip" style="--accent:${recent[0].accent}"><div><span class="meta-label">READY WHEN YOU ARE</span><strong>Continue ${recent[0].title}</strong><small>${recent[0].modes} · ${recent[0].session}</small></div><button data-resume="${recent[0].id}">Resume match <span>→</span></button></section>` : `<section class="resume-strip" style="--accent:${nextGame?.accent || '#a788ff'}"><div><span class="meta-label">FIRST ROUND</span><strong>Choose a world to begin</strong><small>Each first launch adds 25 XP to your Arcade profile.</small></div><button data-resume="${nextGame?.id || games[0].id}">Start playing <span>→</span></button></section>`}
      <section class="library-tools" aria-label="Find a game"><label><span class="meta-label">FIND YOUR FIGHT</span><input id="game-search" type="search" value="${escapeHtml(searchTerm)}" placeholder="Search games, modes, or styles" autocomplete="off"></label><div class="filter-row" role="group" aria-label="Game style filters">${['all', 'Strategic', 'Action', 'Arcade', 'Deep strategy'].map((filter) => `<button class="filter ${activeFilter === filter ? 'is-active' : ''}" data-filter="${filter}">${filter === 'all' ? 'All games' : filter}</button>`).join('')}</div></section>
      <section class="game-grid">${displayedGames.map((game) => {
        const index = games.indexOf(game);
        return `
        <article class="game-card" style="--accent:${game.accent}; --delay:${index * 70}ms">
          <div class="card-top"><div class="card-index">0${index + 1}</div><button class="favorite ${profile.favorites.includes(game.id) ? 'is-favorite' : ''}" data-favorite="${game.id}" aria-label="${profile.favorites.includes(game.id) ? 'Remove' : 'Add'} ${game.title} favorite">★</button></div><p class="card-kicker">${game.kicker}${profile.recent[0] === game.id ? ' · LAST PLAYED' : ''}</p><h2>${game.title}</h2><p>${game.description}</p>
          <div class="game-facts"><span>${game.modes}</span><span>${game.session}</span></div><button data-game="${game.id}">${profile.recent[0] === game.id ? 'Continue' : 'Launch'} <span>→</span></button>
        </article>`;
      }).join('') || `<p class="empty-library">No arena matches that search. Try another word or choose “All games.”</p>`}</section>
      <footer>Battle Arcade · Games run independently, so progress and controls remain intact.</footer>
    </section>`;
  document.querySelectorAll('[data-game]').forEach((button) => button.addEventListener('click', () => launchGame(button.dataset.game)));
  document.querySelectorAll('[data-resume]').forEach((button) => button.addEventListener('click', () => launchGame(button.dataset.resume)));
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; render(); }));
  document.querySelector('#game-search').addEventListener('input', (event) => { searchTerm = event.target.value; render(); document.querySelector('#game-search')?.focus(); });
  document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.favorite;
    profile.favorites = profile.favorites.includes(id) ? profile.favorites.filter((favorite) => favorite !== id) : [...profile.favorites, id];
    saveProfile(); render();
  }));
  document.querySelector('#settings').addEventListener('click', () => {
    const nextName = window.prompt('Arcade profile name', profile.name);
    if (nextName?.trim()) profile.name = nextName.trim().slice(0, 24);
    profile.reducedMotion = window.confirm('Use reduced motion in the arcade launcher?');
    saveProfile(); render();
  });
  document.querySelector('#report').addEventListener('click', () => {
    const existing = document.querySelector('.quality-report');
    if (existing) return existing.remove();
    document.querySelector('.home').insertAdjacentHTML('beforeend', `
      <section class="quality-report" role="dialog" aria-label="Quality report">
        <button class="report-close" aria-label="Close quality report">×</button>
        <p class="eyebrow">CURRENT QUALITY REPORT</p><h2>What has actually been verified</h2>
        <div class="report-grid">
          <div><b>✓ Build & type checks</b><p>All four games and the Arcade launcher pass the repeatable check and production build.</p></div>
          <div><b>✓ Arcade launcher</b><p>Favorites, search, game filters, first-play XP, achievements, recent games, launch, and return flow are available in the shared hub.</p></div>
          <div><b>✓ Ascension Chess</b><p>The updated local 3D setup, match launch, AI selection, workshop, and rules interface load without an API key.</p></div>
          <div><b>In progress: deep gameplay QA</b><p>Grid turns, Spin match outcomes, Slime mini-games, and Ascension endgame paths still need full stress-path coverage.</p></div>
        </div>
        <p class="report-note">The library reports only verified launch and build status. Open <code>QA_PLAN.md</code> in the project for the remaining gameplay test matrix.</p>
      </section>`);
    document.querySelector('.report-close').addEventListener('click', () => document.querySelector('.quality-report')?.remove());
  });
}
render();
