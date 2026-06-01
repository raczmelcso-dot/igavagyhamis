// ===================== PROFILES.JS – Közös profil-kezelő modul =====================

const RANKS = [
  { name: "Kezdő",    icon: "🌱", minXP: 0    },
  { name: "Tanuló",   icon: "📖", minXP: 100  },
  { name: "Kíváncsi", icon: "🔍", minXP: 250  },
  { name: "Okos",     icon: "💡", minXP: 500  },
  { name: "Tudós",    icon: "🔬", minXP: 900  },
  { name: "Zseni",    icon: "🧠", minXP: 1500 },
  { name: "Mester",   icon: "🏆", minXP: 2500 },
  { name: "Legenda",  icon: "⭐", minXP: 4000 },
];

const AVATARS = [
  "🦊","🐯","🦁","🐻","🐼","🐨","🦄","🐲",
  "🦅","🦋","🐬","🦈","🐙","🦉","🐺","🦝",
  "🐸","🐵","🌟","⚡","🔥","💎","🎯","🚀"
];

const CAT_META = {
  science: { label: "Tudomány",     icon: "🔬" },
  history: { label: "Történelem",   icon: "📜" },
  nature:  { label: "Természet",    icon: "🌿" },
  fun:     { label: "Érdekességek", icon: "😄" },
};

const XP_PER_CORRECT = { easy: 5, medium: 10, hard: 20, all: 8 };
const XP_BONUS_PERFECT = 30;

// ===== STORE KEZELÉS =====

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem('hvi_profiles') || 'null') || { activeId: null, profiles: {} };
  } catch { return { activeId: null, profiles: {} }; }
}

function saveStore(store) {
  localStorage.setItem('hvi_profiles', JSON.stringify(store));
}

// ===== PROFIL MŰVELETEK =====

function getActiveProfile() {
  const store = loadStore();
  if (!store.activeId || !store.profiles[store.activeId]) return null;
  return ensureProfileDefaults(store.profiles[store.activeId]);
}

function setActiveProfile(id) {
  const store = loadStore();
  store.activeId = id;
  saveStore(store);
}

function saveActiveProfile(p) {
  const store = loadStore();
  store.profiles[p.id] = p;
  saveStore(store);
}

function getAllProfiles() {
  const store = loadStore();
  return Object.values(store.profiles).map(ensureProfileDefaults);
}

function createProfile(name, avatar) {
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const p = ensureProfileDefaults({
    id, name, avatar,
    createdAt: new Date().toLocaleDateString('hu-HU'),
  });
  const store = loadStore();
  store.profiles[id] = p;
  store.activeId = id;
  saveStore(store);
  return p;
}

function deleteProfile(id) {
  const store = loadStore();
  delete store.profiles[id];
  if (store.activeId === id) {
    const remaining = Object.keys(store.profiles);
    store.activeId = remaining.length > 0 ? remaining[0] : null;
  }
  saveStore(store);
}

function ensureProfileDefaults(p) {
  const def = {
    totalXP: 0, gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0,
    catStats: {
      science: { correct: 0, answered: 0 },
      history: { correct: 0, answered: 0 },
      nature:  { correct: 0, answered: 0 },
      fun:     { correct: 0, answered: 0 }
    },
    history: []
  };
  const merged = Object.assign({}, def, p);
  for (const k of ['science', 'history', 'nature', 'fun']) {
    if (!merged.catStats[k]) merged.catStats[k] = { correct: 0, answered: 0 };
  }
  if (!Array.isArray(merged.history)) merged.history = [];
  return merged;
}

// ===== RANG SEGÉDFÜGGVÉNYEK =====

function getRank(xp) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.minXP) r = rank; }
  return r;
}

function getNextRank(xp) {
  for (const rank of RANKS) { if (xp < rank.minXP) return rank; }
  return null;
}
