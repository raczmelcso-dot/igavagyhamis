// ===================== GAME.JS – Játéklogika (profiles.js-t igényel) =====================

// ===================== PROFIL MEGJELENÍTÉS =====================

function renderProfile() {
  const p = getActiveProfile();
  if (!p) return;
  const rank = getRank(p.totalXP);
  const next = getNextRank(p.totalXP);

  document.getElementById('active-avatar').textContent = p.avatar || rank.icon;
  document.getElementById('active-name').textContent   = p.name || 'Névtelen';
  document.getElementById('active-rank').textContent   = rank.icon + ' ' + rank.name;

  document.getElementById('profile-avatar').textContent = p.avatar || rank.icon;
  document.getElementById('profile-rank').textContent   = rank.name;

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

// ===================== PICKER (PROFIL VÁLASZTÓ) =====================

function showPicker() {
  renderPickerProfiles();
  showScreen('picker-screen');
}

function renderPickerProfiles() {
  const store = loadStore();
  const activeId = store.activeId;
  const profiles = getAllProfiles();
  const list = document.getElementById('profiles-list');
  list.innerHTML = '';

  if (profiles.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,.4);padding:20px 0;">Még nincs profil. Hozz létre egyet!</p>';
    return;
  }

  profiles.forEach(p => {
    const rank = getRank(p.totalXP);
    const isActive = p.id === activeId;
    const hasPin = !!p.pinHash;
    const card = document.createElement('div');
    card.className = 'profile-pick-card' + (isActive ? ' active-profile' : '');
    card.innerHTML = `
      <div class="pick-avatar">${p.avatar || rank.icon}</div>
      <div class="pick-info">
        <div class="pick-name">${escapeHtml(p.name || 'Névtelen')} ${hasPin ? '<span class="pin-lock">🔒</span>' : ''}</div>
        <div class="pick-rank">${rank.icon} ${rank.name}</div>
        <div class="pick-xp">${p.totalXP} XP · ${p.gamesPlayed} meccs</div>
      </div>
      <div class="pick-actions">
        <button class="pick-select-btn" onclick="selectProfile('${p.id}')">Kiválaszt</button>
        <button class="pick-delete-btn" onclick="handleDeleteProfile(event,'${p.id}','${escapeHtml(p.name || 'Névtelen')}')">🗑</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// PIN ellenőrzés állapot
let pinCheckId = null;
let pinAttempts = 0;
let pinLockUntil = 0;

function selectProfile(id) {
  const store = loadStore();
  const raw = store.profiles[id];
  if (!raw) return;

  if (!raw.pinHash) {
    // Nincs PIN – egyből belép
    _doSelectProfile(id);
    return;
  }

  // Van PIN – megnyitjuk a PIN modal-t
  pinCheckId = id;
  pinAttempts = 0;
  openPinModal(raw.name || 'Névtelen', false);
}

function openPinModal(name, isLocked) {
  document.getElementById('pin-modal-title').textContent = '🔒 ' + escapeHtml(name);
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-error').style.display = 'none';
  const lockMsg = document.getElementById('pin-lock-msg');

  if (isLocked) {
    const secs = Math.ceil((pinLockUntil - Date.now()) / 1000);
    lockMsg.textContent = `Túl sok hibás próbálkozás. Várj ${secs} másodpercet.`;
    lockMsg.style.display = 'block';
    document.getElementById('pin-submit-btn').disabled = true;
    setTimeout(() => {
      lockMsg.style.display = 'none';
      document.getElementById('pin-submit-btn').disabled = false;
    }, pinLockUntil - Date.now());
  } else {
    lockMsg.style.display = 'none';
    document.getElementById('pin-submit-btn').disabled = false;
  }

  document.getElementById('pin-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('pin-input').focus(), 50);
}

function closePinModal() {
  document.getElementById('pin-modal').style.display = 'none';
  pinCheckId = null;
}

async function submitPin() {
  if (Date.now() < pinLockUntil) return;

  const pin = document.getElementById('pin-input').value;
  const errEl = document.getElementById('pin-error');

  if (!/^\d{4}$/.test(pin)) {
    errEl.textContent = 'Adj meg egy 4 jegyű PIN-t!';
    errEl.style.display = 'block';
    return;
  }

  const store = loadStore();
  const raw = store.profiles[pinCheckId];
  if (!raw) { closePinModal(); return; }

  const entered = await hashPin(pin);
  if (entered === raw.pinHash) {
    closePinModal();
    _doSelectProfile(pinCheckId);
  } else {
    pinAttempts++;
    if (pinAttempts >= 3) {
      pinLockUntil = Date.now() + 30000;
      pinAttempts = 0;
      openPinModal(raw.name || 'Névtelen', true);
    } else {
      errEl.textContent = `Hibás PIN! Még ${3 - pinAttempts} próbálkozás maradt.`;
      errEl.style.display = 'block';
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-input').focus();
    }
  }
}

function _doSelectProfile(id) {
  setActiveProfile(id);
  showScreen('start-screen');
  renderProfile();
  updatePreview();
}

function handleDeleteProfile(event, id, name) {
  event.stopPropagation();
  if (!confirm(`Biztosan törlöd "${name}" profilját? Ez nem visszavonható!`)) return;
  deleteProfile(id);
  renderPickerProfiles();
  if (!getActiveProfile()) showScreen('picker-screen');
}

// ===================== ÚJ PROFIL MODAL =====================

let selectedAvatar = AVATARS[0];

function openNewProfileModal() {
  selectedAvatar = AVATARS[0];
  document.getElementById('new-profile-name').value = '';
  document.getElementById('new-profile-pin').value = '';
  document.getElementById('new-profile-pin2').value = '';
  document.getElementById('pin-match-error').style.display = 'none';
  renderAvatarGrid();
  document.getElementById('new-profile-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('new-profile-name').focus(), 50);
}

function closeNewProfileModal() {
  document.getElementById('new-profile-modal').style.display = 'none';
}

function modalOverlayClick(event) {
  if (event.target === document.getElementById('new-profile-modal')) closeNewProfileModal();
}

function renderAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = '';
  AVATARS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'avatar-btn' + (emoji === selectedAvatar ? ' selected' : '');
    btn.textContent = emoji;
    btn.type = 'button';
    btn.onclick = () => {
      selectedAvatar = emoji;
      grid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    grid.appendChild(btn);
  });
}

async function submitNewProfile() {
  const nameInput = document.getElementById('new-profile-name');
  const pin1 = document.getElementById('new-profile-pin').value;
  const pin2 = document.getElementById('new-profile-pin2').value;
  const errEl = document.getElementById('pin-match-error');
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#f87171';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
    return;
  }

  // PIN validáció
  if (pin1 || pin2) {
    if (!/^\d{4}$/.test(pin1)) {
      errEl.textContent = 'A PIN pontosan 4 számjegy legyen!';
      errEl.style.display = 'block';
      document.getElementById('new-profile-pin').focus();
      return;
    }
    if (pin1 !== pin2) {
      errEl.textContent = 'A két PIN nem egyezik!';
      errEl.style.display = 'block';
      document.getElementById('new-profile-pin2').focus();
      return;
    }
  }
  errEl.style.display = 'none';

  const submitBtn = document.getElementById('modal-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Létrehozás...';

  await createProfile(name, selectedAvatar, pin1 || null);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Létrehozás ✔';
  closeNewProfileModal();
  showScreen('start-screen');
  renderProfile();
  updatePreview();
}

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
  if (cat  !== 'all') filtered = filtered.filter(q => q.category  === cat);
  if (diff !== 'all') filtered = filtered.filter(q => q.difficulty === diff);
  document.getElementById('q-count-preview').textContent = filtered.length;
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
let sessionCatCorrect  = {};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  const cat = getSelected('category-grid');
  selectedDifficulty = getSelected('difficulty-grid');

  let filtered = questions;
  if (cat !== 'all') filtered = filtered.filter(q => q.category === cat);
  if (selectedDifficulty !== 'all') filtered = filtered.filter(q => q.difficulty === selectedDifficulty);

  if (filtered.length === 0) { alert('Nincs kérdés ezzel a szűréssel!'); return; }

  gameQuestions     = shuffle(filtered);
  currentIndex      = 0;
  correctCount      = 0;
  wrongCount        = 0;
  currentStreak     = 0;
  sessionXP         = 0;
  sessionCatCorrect = {};
  answered          = false;

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

  document.getElementById('question-num').textContent   = currentIndex + 1;
  document.getElementById('question-text').textContent  = q.text;
  document.getElementById('category-badge').textContent = q.categoryLabel;

  document.getElementById('question-card').className = 'question-card';

  const expBox = document.getElementById('explanation-box');
  expBox.textContent = '';
  expBox.className = 'explanation-box';

  const tb = document.getElementById('btn-true');
  const fb = document.getElementById('btn-false');
  tb.disabled = false; fb.disabled = false;
  tb.className = 'btn btn-true';
  fb.className = 'btn btn-false';
  document.getElementById('btn-next').style.display = 'none';

  document.getElementById('progress-bar').style.width = (currentIndex / gameQuestions.length * 100) + '%';
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
    sessionCatCorrect[q.category] = (sessionCatCorrect[q.category] || 0) + 1;
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

  if (q.answer === true) tb.classList.add('highlight-correct');
  else                   fb.classList.add('highlight-correct');

  updateScoreBoard();

  if (currentIndex + 1 < gameQuestions.length) {
    document.getElementById('btn-next').style.display = 'inline-block';
  } else {
    setTimeout(showResults, 1400);
  }
}

function nextQuestion() { currentIndex++; loadQuestion(); }

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

  const p = getActiveProfile();
  if (!p) { showScreen('picker-screen'); return; }

  const oldRank = getRank(p.totalXP);
  p.gamesPlayed++;
  p.totalCorrect  += correctCount;
  p.totalAnswered += total;
  p.totalXP       += sessionXP;
  if (currentStreak > p.bestStreak) p.bestStreak = currentStreak;

  gameQuestions.forEach(q => {
    if (!p.catStats[q.category]) p.catStats[q.category] = { correct: 0, answered: 0 };
    p.catStats[q.category].answered++;
  });
  for (const cat in sessionCatCorrect) {
    if (!p.catStats[cat]) p.catStats[cat] = { correct: 0, answered: 0 };
    p.catStats[cat].correct += sessionCatCorrect[cat];
  }

  const diffLabels2 = { all: 'Vegyes', easy: 'Könnyű', medium: 'Közepes', hard: 'Nehéz' };
  p.history.unshift({
    date: new Date().toLocaleDateString('hu-HU'),
    correct: correctCount, total, pct,
    xp: sessionXP,
    diff: diffLabels2[selectedDifficulty] || 'Vegyes'
  });
  if (p.history.length > 20) p.history = p.history.slice(0, 20);

  saveActiveProfile(p);
  const newRank = getRank(p.totalXP);

  document.getElementById('final-correct').textContent = correctCount;
  document.getElementById('final-wrong').textContent   = wrongCount;
  document.getElementById('final-percent').textContent = pct + '%';
  document.getElementById('final-xp').textContent      = '+' + sessionXP;

  let icon, title, message;
  if (pct === 100)    { icon='🏆'; title='Tökéletes!';    message='Minden kérdésre helyesen válaszoltál!'; }
  else if (pct >= 80) { icon='🥇'; title='Kiváló!';       message='Nagyon jól teljesítettél!'; }
  else if (pct >= 60) { icon='🥈'; title='Jó munka!';     message='Szép eredmény, még van hova fejlődni.'; }
  else if (pct >= 40) { icon='🥉'; title='Nem rossz!';    message='Közepes eredmény. Próbáld meg újra!'; }
  else                { icon='😅'; title='Próbáld újra!'; message='Ezúttal nem ment a legjobban. Ne add fel!'; }

  document.getElementById('result-icon').textContent    = icon;
  document.getElementById('result-title').textContent   = title;
  document.getElementById('result-message').textContent = message;

  const xpBox = document.getElementById('result-xp-box');
  if (newRank.name !== oldRank.name) {
    xpBox.innerHTML = `<span class="rankup">🎉 Új rang: ${newRank.icon} <strong>${newRank.name}</strong>!</span>`;
  } else {
    xpBox.innerHTML = `<span class="xp-earned">+${sessionXP} XP szerzve${isPerfect ? ' (tökéletes bónusz!)' : ''}</span>`;
  }

  document.getElementById('progress-bar').style.width = '100%';
  showScreen('result-screen');
  renderProfile();
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updatePinDots() {
  const val = document.getElementById('pin-input').value;
  document.querySelectorAll('#pin-dots .pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < val.length);
  });
  // Auto-submit ha 4 szám
  if (val.length === 4) setTimeout(submitPin, 200);
}

function buildNumpad() {
  const pad = document.getElementById('pin-numpad');
  if (!pad) return;
  pad.innerHTML = '';
  [1,2,3,4,5,6,7,8,9,'',0,'⌫'].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn' + (k === '' ? ' numpad-empty' : '');
    btn.textContent = k;
    btn.type = 'button';
    if (k !== '') {
      btn.onclick = () => {
        const inp = document.getElementById('pin-input');
        if (k === '⌫') {
          inp.value = inp.value.slice(0, -1);
        } else if (inp.value.length < 4) {
          inp.value += k;
        }
        updatePinDots();
      };
    }
    pad.appendChild(btn);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  buildNumpad();
  const active = getActiveProfile();
  if (!active) {
    renderPickerProfiles();
    showScreen('picker-screen');
  } else {
    showScreen('start-screen');
    renderProfile();
    updatePreview();
  }
});
