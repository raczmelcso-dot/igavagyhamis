// ===================== PROFIL / XP RENDSZER =====================

const RANKS = [
  { name: "Kezdő",       icon: "🌱", minXP: 0    },
  { name: "Tanuló",      icon: "📖", minXP: 100  },
  { name: "Kíváncsi",    icon: "🔍", minXP: 250  },
  { name: "Okos",        icon: "💡", minXP: 500  },
  { name: "Tudós",       icon: "🔬", minXP: 900  },
  { name: "Zseni",       icon: "🧠", minXP: 1500 },
  { name: "Mester",      icon: "🏆", minXP: 2500 },
  { name: "Legenda",     icon: "⭐", minXP: 4000 },
];

const XP_PER_CORRECT = { easy: 5, medium: 10, hard: 20, all: 8 };
const XP_BONUS_PERFECT = 30;

function loadProfile() {
  const def = { totalXP: 0, gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0 };
  try { return Object.assign(def, JSON.parse(localStorage.getItem('hvi_profile') || '{}')); }
  catch { return def; }
}

function saveProfile(p) {
  localStorage.setItem('hvi_profile', JSON.stringify(p));
}

function getRank(xp) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (xp >= r.minXP) rank = r; }
  return rank;
}

function getNextRank(xp) {
  for (const r of RANKS) { if (xp < r.minXP) return r; }
  return null;
}

function renderProfile() {
  const p = loadProfile();
  const rank = getRank(p.totalXP);
  const next = getNextRank(p.totalXP);

  document.getElementById('profile-avatar').textContent = rank.icon;
  document.getElementById('profile-rank').textContent = rank.name;

  const xpInLevel = p.totalXP - rank.minXP;
  const xpNeeded  = next ? next.minXP - rank.minXP : 1;
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
  document.getElementById('profile-xp-bar').style.width = pct + '%';
  document.getElementById('profile-xp-label').textContent = next
    ? `${p.totalXP} / ${next.minXP} XP  (${rank.name} → ${next.name})`
    : `${p.totalXP} XP – Maximális rang!`;

  document.getElementById('ps-games').textContent    = p.gamesPlayed;
  document.getElementById('ps-correct').textContent  = p.totalCorrect;
  const acc = p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;
  document.getElementById('ps-accuracy').textContent = acc + '%';
  document.getElementById('ps-streak').textContent   = p.bestStreak;
  document.getElementById('ps-xp').textContent       = p.totalXP;
}

// ===================== JÁTÉK ÁLLAPOT =====================

let gameQuestions = [];
let currentIndex  = 0;
let correctCount  = 0;
let wrongCount    = 0;
let answered      = false;
let currentStreak = 0;
let sessionXP     = 0;
let selectedDifficulty = 'all';

// ===================== FŐMENÜ =====================

function selectOption(gridId, btn) {
  document.querySelectorAll('#' + gridId + ' .option-card').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  updatePreview();
}

function getSelected(gridId) {
  const sel = document.querySelector('#' + gridId + ' .option-card.selected');
  return sel ? sel.dataset.value : 'all';
}

function updatePreview() {
  const cat  = getSelected('category-grid');
  const diff = getSelected('difficulty-grid');
  let filtered = questions;
  if (cat  !== 'all') filtered = filtered.filter(q => q.category   === cat);
  if (diff !== 'all') filtered = filtered.filter(q => q.difficulty  === diff);
  document.getElementById('q-count-preview').textContent = filtered.length;
}

// ===================== JÁTÉK INDÍTÁSA =====================

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  const cat  = getSelected('category-grid');
  selectedDifficulty = getSelected('difficulty-grid');

  let filtered = questions;
  if (cat  !== 'all') filtered = filtered.filter(q => q.category  === cat);
  if (selectedDifficulty !== 'all') filtered = filtered.filter(q => q.difficulty === selectedDifficulty);

  if (filtered.length === 0) {
    alert('Nincs kérdés ezzel a szűréssel!');
    return;
  }

  gameQuestions  = shuffle(filtered);
  currentIndex   = 0;
  correctCount   = 0;
  wrongCount     = 0;
  currentStreak  = 0;
  sessionXP      = 0;
  answered       = false;

  const diffLabels = { all: '🌍 Vegyes', easy: '😊 Könnyű', medium: '🤔 Közepes', hard: '🔥 Nehéz' };
  document.getElementById('diff-badge').textContent = diffLabels[selectedDifficulty];
  document.getElementById('total-questions').textContent = gameQuestions.length;
  updateScoreBoard();
  showScreen('game-screen');
  loadQuestion();
}

// ===================== KÉRDÉS =====================

function loadQuestion() {
  answered = false;
  const q = gameQuestions[currentIndex];

  document.getElementById('question-num').textContent  = currentIndex + 1;
  document.getElementById('question-text').textContent = q.text;
  document.getElementById('category-badge').textContent = q.categoryLabel;

  const card = document.getElementById('question-card');
  card.className = 'question-card';

  const expBox = document.getElementById('explanation-box');
  expBox.textContent = '';
  expBox.className = 'explanation-box';

  const tb = document.getElementById('btn-true');
  const fb = document.getElementById('btn-false');
  tb.disabled = false; fb.disabled = false;
  tb.className = 'btn btn-true';
  fb.className = 'btn btn-false';
  document.getElementById('btn-next').style.display = 'none';

  const pct = (currentIndex / gameQuestions.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ===================== VÁLASZ =====================

function answer(userAnswer) {
  if (answered) return;
  answered = true;

  const q = gameQuestions[currentIndex];
  const isCorrect = userAnswer === q.answer;

  const card   = document.getElementById('question-card');
  const expBox = document.getElementById('explanation-box');
  const tb     = document.getElementById('btn-true');
  const fb     = document.getElementById('btn-false');

  tb.disabled = true;
  fb.disabled = true;

  if (isCorrect) {
    correctCount++;
    currentStreak++;
    const xp = XP_PER_CORRECT[q.difficulty] || XP_PER_CORRECT.all;
    sessionXP += xp;
    card.classList.add('correct');
    expBox.className = 'explanation-box correct';
    expBox.innerHTML = 'A válaszod <strong>helyes!</strong> <span class="xp-pop">+' + xp + ' XP</span>';
  } else {
    wrongCount++;
    currentStreak = 0;
    card.classList.add('wrong');
    expBox.className = 'explanation-box wrong';
    expBox.innerHTML = 'A válaszod <strong>helytelen!</strong>';
  }

  if (q.answer === true) { tb.classList.add('highlight-correct'); }
  else                   { fb.classList.add('highlight-correct'); }

  updateScoreBoard();

  if (currentIndex + 1 < gameQuestions.length) {
    document.getElementById('btn-next').style.display = 'inline-block';
  } else {
    setTimeout(showResults, 1400);
  }
}

function nextQuestion() {
  currentIndex++;
  loadQuestion();
}

function updateScoreBoard() {
  document.getElementById('correct-count').textContent = correctCount;
  document.getElementById('wrong-count').textContent   = wrongCount;
}

// ===================== EREDMÉNY =====================

function showResults() {
  const total = gameQuestions.length;
  const pct   = Math.round((correctCount / total) * 100);
  const isPerfect = correctCount === total;
  if (isPerfect) sessionXP += XP_BONUS_PERFECT;

  // Profil frissítése
  const p = loadProfile();
  const oldRank = getRank(p.totalXP);
  p.gamesPlayed++;
  p.totalCorrect  += correctCount;
  p.totalAnswered += total;
  p.totalXP       += sessionXP;
  if (currentStreak > p.bestStreak) p.bestStreak = currentStreak;
  saveProfile(p);
  const newRank = getRank(p.totalXP);

  // UI
  document.getElementById('final-correct').textContent = correctCount;
  document.getElementById('final-wrong').textContent   = wrongCount;
  document.getElementById('final-percent').textContent = pct + '%';
  document.getElementById('final-xp').textContent      = '+' + sessionXP;

  let icon, title, message;
  if (pct === 100) { icon = '🏆'; title = 'Tökéletes!';    message = 'Minden kérdésre helyesen válaszoltál!'; }
  else if (pct >= 80) { icon = '🥇'; title = 'Kiváló!';   message = 'Nagyon jól teljesítettél!'; }
  else if (pct >= 60) { icon = '🥈'; title = 'Jó munka!'; message = 'Szép eredmény, még van hova fejlődni.'; }
  else if (pct >= 40) { icon = '🥉'; title = 'Nem rossz!';message = 'Közepes eredmény. Próbáld meg újra!'; }
  else                { icon = '😅'; title = 'Próbáld újra!'; message = 'Ezúttal nem ment a legjobban. Ne add fel!'; }

  document.getElementById('result-icon').textContent    = icon;
  document.getElementById('result-title').textContent   = title;
  document.getElementById('result-message').textContent = message;

  // Rang-up üzenet
  const xpBox = document.getElementById('result-xp-box');
  if (newRank.name !== oldRank.name) {
    xpBox.innerHTML = `<span class="rankup">🎉 Új rang: ${newRank.icon} <strong>${newRank.name}</strong>!</span>`;
  } else {
    xpBox.innerHTML = `<span class="xp-earned">+${sessionXP} XP szerzve${isPerfect ? ' (tökéletes bónusz!)' : ''}</span>`;
  }

  document.getElementById('progress-bar').style.width = '100%';
  showScreen('result-screen');
}

function restartGame() { startGame(); }

function goHome() {
  showScreen('start-screen');
  renderProfile();
  updatePreview();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  updatePreview();
});
