// === Dictionary App (Free Dictionary API) ===

const App = (() => {
  const HISTORY_KEY = 'dictionary_history';
  const MAX_HISTORY = 20;
  const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  let currentWordData = null;

  // DOM refs
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsEl = document.getElementById('results');
  const welcomeEl = document.getElementById('welcomeMessage');
  const historyEl = document.getElementById('historyChips');
  const flashcardsTab = document.getElementById('flashcardsTab');

  function init() {
    searchBtn.addEventListener('click', () => searchWord(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchWord(searchInput.value);
    });

    flashcardsTab.addEventListener('click', () => FlashcardUI.showBrowse());

    FlashcardUI.init();
    renderHistory();
  }

  // Search
  async function searchWord(word) {
    word = word.trim().toLowerCase();
    if (!word) return;

    searchInput.value = word;
    welcomeEl.classList.add('hidden');
    resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);

      if (res.status === 404) {
        resultsEl.innerHTML = '<div class="error-msg">Word not found. Check the spelling and try again.</div>';
        return;
      }
      if (!res.ok) {
        resultsEl.innerHTML = `<div class="error-msg">Something went wrong (${res.status}). Try again.</div>`;
        return;
      }

      const data = await res.json();
      // API returns an array; use the first entry
      const entry = data[0];
      currentWordData = entry;
      addToHistory(word);
      renderWord(entry);
    } catch {
      resultsEl.innerHTML = '<div class="error-msg">No internet connection. Check your network and try again.</div>';
    }
  }

  function renderWord(entry) {
    let html = '';

    // Word header
    html += '<div class="word-header">';
    html += `<div class="word-title">${entry.word}</div>`;

    // Phonetics
    const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text))?.text || '';
    const audioUrl = entry.phonetics && entry.phonetics.find(p => p.audio && p.audio.length > 0)?.audio || '';

    const parts = [];
    if (phonetic) parts.push(phonetic);

    if (parts.length || audioUrl) {
      html += '<div class="word-phonetics">';
      if (phonetic) html += `<span>${phonetic}</span>`;
      if (audioUrl) {
        html += ` <button class="audio-btn" data-audio="${audioUrl}" aria-label="Play pronunciation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>`;
      }
      html += '</div>';
    }
    html += '</div>';

    // Save button
    const isSaved = Flashcards.has(entry.word);
    html += `<button class="save-flashcard-btn ${isSaved ? 'saved' : ''}" id="saveBtn">
      ${isSaved ? '&#10003; Saved' : '+ Save to Flashcards'}
    </button>`;

    // Meanings (grouped by part of speech)
    if (entry.meanings && entry.meanings.length) {
      entry.meanings.forEach(meaning => {
        html += '<div class="pos-group">';
        html += `<span class="pos-badge">${meaning.partOfSpeech}</span>`;

        meaning.definitions.forEach((def, i) => {
          html += '<div class="definition-item">';
          html += `<div class="definition-text">${i + 1}. ${def.definition}</div>`;

          if (def.example) {
            html += `<div class="definition-example">"${def.example}"</div>`;
          }
          if (def.synonyms && def.synonyms.length) {
            html += `<div class="definition-synonyms">Synonyms: <span>${def.synonyms.slice(0, 5).join(', ')}</span></div>`;
          }
          if (def.antonyms && def.antonyms.length) {
            html += `<div class="definition-antonyms">Antonyms: <span>${def.antonyms.slice(0, 5).join(', ')}</span></div>`;
          }
          html += '</div>';
        });

        // Meaning-level synonyms/antonyms
        if (meaning.synonyms && meaning.synonyms.length) {
          html += `<div class="definition-synonyms" style="margin-top:8px">Synonyms: <span>${meaning.synonyms.slice(0, 6).join(', ')}</span></div>`;
        }
        if (meaning.antonyms && meaning.antonyms.length) {
          html += `<div class="definition-antonyms" style="margin-top:4px">Antonyms: <span>${meaning.antonyms.slice(0, 6).join(', ')}</span></div>`;
        }

        html += '</div>';
      });
    } else {
      html += '<div class="error-msg">No definitions available for this word.</div>';
    }

    resultsEl.innerHTML = html;

    // Audio button handler
    const audioBtn = resultsEl.querySelector('.audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        new Audio(audioBtn.dataset.audio).play();
      });
    }

    // Save button handler
    document.getElementById('saveBtn').addEventListener('click', toggleSave);
  }

  function toggleSave() {
    if (!currentWordData) return;
    const btn = document.getElementById('saveBtn');

    if (Flashcards.has(currentWordData.word)) {
      Flashcards.remove(currentWordData.word);
      btn.classList.remove('saved');
      btn.innerHTML = '+ Save to Flashcards';
      showToast('Removed from flashcards');
    } else {
      Flashcards.add(currentWordData);
      btn.classList.add('saved');
      btn.innerHTML = '&#10003; Saved';
      showToast('Added to flashcards');
    }
  }

  // History
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function addToHistory(word) {
    let history = getHistory().filter(w => w !== word);
    history.unshift(word);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
      historyEl.classList.add('hidden');
      return;
    }
    historyEl.classList.remove('hidden');
    historyEl.innerHTML = history.slice(0, 10).map(w =>
      `<button class="history-chip">${w}</button>`
    ).join('');

    historyEl.querySelectorAll('.history-chip').forEach(chip => {
      chip.addEventListener('click', () => searchWord(chip.textContent));
    });
  }

  return { init, searchWord };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
