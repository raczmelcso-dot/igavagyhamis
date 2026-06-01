// ===================== PROFIL.JS – Profil oldal (profiles.js-t igényel) =====================

function editName() {
  const p = getActiveProfile();
  document.getElementById('name-input').value = p ? (p.name || '') : '';
  document.getElementById('name-display').style.display = 'none';
  document.getElementById('name-edit').style.display = 'flex';
  document.getElementById('name-input').focus();
}

function saveName() {
  const val = document.getElementById('name-input').value.trim();
  const p = getActiveProfile();
  if (!p) return;
  p.name = val;
  saveActiveProfile(p);
  document.getElementById('name-text').textContent = val || 'Névtelen Játékos';
  document.getElementById('profil-header-title').textContent = '👤 ' + (val || 'Névtelen Játékos');
  document.getElementById('name-display').style.display = 'flex';
  document.getElementById('name-edit').style.display = 'none';
}

function cancelName() {
  document.getElementById('name-display').style.display = 'flex';
  document.getElementById('name-edit').style.display = 'none';
}

function confirmReset() {
  const p = getActiveProfile();
  const name = p ? (p.name || 'Névtelen Játékos') : 'Névtelen Játékos';
  if (!confirm(`Biztosan törlöd "${name}" profilját? Ez nem visszavonható!`)) return;
  if (p) deleteProfile(p.id);
  window.location.href = 'index.html';
}

function renderAll() {
  const p = getActiveProfile();
  if (!p) { window.location.href = 'index.html'; return; }

  const rank = getRank(p.totalXP);
  const next = getNextRank(p.totalXP);

  document.getElementById('profil-header-title').textContent = '👤 ' + (p.name || 'Névtelen Játékos');
  document.getElementById('avatar-big').textContent = p.avatar || rank.icon;
  document.getElementById('name-text').textContent  = p.name || 'Névtelen Játékos';
  document.getElementById('rank-label').textContent = rank.icon + ' ' + rank.name;

  const xpInLevel = p.totalXP - rank.minXP;
  const xpNeeded  = next ? next.minXP - rank.minXP : 1;
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
  document.getElementById('xp-bar-fill').style.width = pct + '%';
  document.getElementById('xp-current-label').textContent = p.totalXP + ' XP';
  document.getElementById('xp-next-label').textContent = next
    ? 'Következő rang: ' + next.icon + ' ' + next.name + ' (' + next.minXP + ' XP)'
    : '⭐ Maximális rang elérve!';

  renderRankTimeline(p.totalXP);

  const wrong = p.totalAnswered - p.totalCorrect;
  const acc = p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;
  document.getElementById('st-games').textContent   = p.gamesPlayed;
  document.getElementById('st-correct').textContent = p.totalCorrect;
  document.getElementById('st-wrong').textContent   = wrong;
  document.getElementById('st-acc').textContent     = acc + '%';
  document.getElementById('st-streak').textContent  = p.bestStreak;
  document.getElementById('st-xp').textContent      = p.totalXP;

  renderCatStats(p.catStats);
  renderHistory(p.history);
}

function renderRankTimeline(currentXP) {
  const container = document.getElementById('rank-timeline');
  container.innerHTML = '';
  RANKS.forEach((rank, i) => {
    const unlocked  = currentXP >= rank.minXP;
    const isCurrent = getRank(currentXP).name === rank.name;
    const div = document.createElement('div');
    div.className = 'rank-step' + (unlocked ? ' unlocked' : ' locked') + (isCurrent ? ' current' : '');
    div.innerHTML = `
      <div class="rank-step-icon">${rank.icon}</div>
      <div class="rank-step-info">
        <div class="rank-step-name">${rank.name}</div>
        <div class="rank-step-xp">${rank.minXP} XP</div>
      </div>
      ${isCurrent ? '<div class="rank-step-badge">Jelenlegi</div>' : ''}
      ${unlocked && !isCurrent ? '<div class="rank-step-check">✔</div>' : ''}
    `;
    container.appendChild(div);
    if (i < RANKS.length - 1) {
      const line = document.createElement('div');
      line.className = 'rank-line' + (unlocked ? ' unlocked' : '');
      container.appendChild(line);
    }
  });
}

function renderCatStats(catStats) {
  const container = document.getElementById('cat-list');
  container.innerHTML = '';
  for (const [key, meta] of Object.entries(CAT_META)) {
    const s = catStats[key] || { correct: 0, answered: 0 };
    const pct = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
    const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : pct >= 40 ? '#f97316' : '#f87171';
    const div = document.createElement('div');
    div.className = 'cat-row';
    div.innerHTML = `
      <div class="cat-row-left">
        <span class="cat-row-icon">${meta.icon}</span>
        <span class="cat-row-name">${meta.label}</span>
      </div>
      <div class="cat-row-bar-wrap">
        <div class="cat-row-bar" style="width:${pct}%; background:${color};"></div>
      </div>
      <div class="cat-row-right">
        <span class="cat-pct" style="color:${color}">${pct}%</span>
        <span class="cat-detail">${s.correct}/${s.answered}</span>
      </div>
    `;
    container.appendChild(div);
  }
}

function renderHistory(history) {
  const container = document.getElementById('history-list');
  if (!history || history.length === 0) {
    container.innerHTML = '<p class="empty-msg">Még nem játszottál egyetlen meccset sem.</p>';
    return;
  }
  container.innerHTML = '';
  history.forEach(h => {
    const color = h.pct >= 80 ? '#4ade80' : h.pct >= 60 ? '#fbbf24' : '#f87171';
    const div = document.createElement('div');
    div.className = 'history-row';
    div.innerHTML = `
      <div class="h-date">${h.date}</div>
      <div class="h-diff">${h.diff}</div>
      <div class="h-score">${h.correct}/${h.total}</div>
      <div class="h-pct" style="color:${color}">${h.pct}%</div>
      <div class="h-xp">+${h.xp} XP</div>
    `;
    container.appendChild(div);
  });
}

window.addEventListener('DOMContentLoaded', renderAll);
