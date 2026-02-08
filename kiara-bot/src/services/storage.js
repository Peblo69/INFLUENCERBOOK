// Simple JSON File Storage - FREE, No Database Needed!
// Saves users and their generation history to local files

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

// Ensure data directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}

// ==================== LOAD DATA ====================
function loadUsers() {
  try {
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading users:', e.message);
  }
  return {};
}

function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      return JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading history:', e.message);
  }
  return {};
}

// ==================== SAVE DATA ====================
function saveUsers(users) {
  try {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error saving users:', e.message);
  }
}

function saveHistory(history) {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Error saving history:', e.message);
  }
}

// In-memory cache (synced to files)
let users = loadUsers();
let history = loadHistory();
let stats = {
  totalUsers: Object.keys(users).length,
  totalGenerations: Object.values(users).reduce((sum, u) => sum + (u.generations || 0), 0)
};

console.log(`📂 Loaded ${stats.totalUsers} users, ${stats.totalGenerations} total generations`);

// ==================== USER FUNCTIONS ====================
export function getUser(telegramId) {
  return users[telegramId] || null;
}

export function createUser(telegramId, username) {
  if (users[telegramId]) return users[telegramId];

  const user = {
    id: telegramId,
    username: username,
    generations: 0,
    joinedAt: new Date().toISOString(),
    settings: { size: '1024x1024' }
  };

  users[telegramId] = user;
  stats.totalUsers++;
  saveUsers(users);

  console.log(`👤 New user: @${username} [${telegramId}]`);
  return user;
}

export function getOrCreateUser(telegramId, username) {
  return getUser(telegramId) || createUser(telegramId, username);
}

export function updateUserSettings(telegramId, settings) {
  if (users[telegramId]) {
    users[telegramId].settings = { ...users[telegramId].settings, ...settings };
    saveUsers(users);
  }
}

export function incrementGenerations(telegramId, count = 1) {
  if (users[telegramId]) {
    users[telegramId].generations += count;
    stats.totalGenerations += count;
    saveUsers(users);
  }
}

// ==================== HISTORY FUNCTIONS ====================
export function addToHistory(telegramId, prompt, imageUrl) {
  if (!history[telegramId]) {
    history[telegramId] = [];
  }

  // Add to beginning (newest first)
  history[telegramId].unshift({
    prompt: prompt.substring(0, 500), // Limit prompt length
    url: imageUrl,
    createdAt: new Date().toISOString()
  });

  // Keep only last 50 images per user (to save space)
  if (history[telegramId].length > 50) {
    history[telegramId] = history[telegramId].slice(0, 50);
  }

  saveHistory(history);
}

export function getHistory(telegramId, limit = 10) {
  const userHistory = history[telegramId] || [];
  return userHistory.slice(0, limit);
}

export function clearHistory(telegramId) {
  history[telegramId] = [];
  saveHistory(history);
}

// ==================== STATS ====================
export function getStats() {
  return {
    totalUsers: stats.totalUsers,
    totalGenerations: stats.totalGenerations,
    activeToday: Object.values(users).filter(u => {
      const lastGen = history[u.id]?.[0]?.createdAt;
      if (!lastGen) return false;
      const today = new Date().toDateString();
      return new Date(lastGen).toDateString() === today;
    }).length
  };
}

// ==================== EXPORT ALL ====================
export default {
  getUser,
  createUser,
  getOrCreateUser,
  updateUserSettings,
  incrementGenerations,
  addToHistory,
  getHistory,
  clearHistory,
  getStats
};
