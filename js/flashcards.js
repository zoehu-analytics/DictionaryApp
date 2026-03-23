// === Flashcard Storage & Logic ===

const Flashcards = (() => {
  const STORAGE_KEY = 'dictionary_flashcards';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveAll(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    updateBadge();
  }

  function add(entry) {
    const cards = getAll();
    if (cards.find(c => c.word === entry.word)) return false;

    // Flatten meanings from Free Dictionary API format
    const definitions = [];
    (entry.meanings || []).forEach(m => {
      (m.definitions || []).forEach(d => {
        definitions.push({
          definition: d.definition,
          partOfSpeech: m.partOfSpeech || '',
          synonyms: d.synonyms || m.synonyms || [],
          antonyms: d.antonyms || m.antonyms || [],
          examples: d.example ? [d.example] : [],
        });
      });
    });

    const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text))?.text || '';
    const audioUrl = entry.phonetics && entry.phonetics.find(p => p.audio && p.audio.length > 0)?.audio || '';

    cards.push({
      word: entry.word,
      phonetic,
      audioUrl,
      definitions,
      addedAt: new Date().toISOString(),
      timesStudied: 0,
      lastStudied: null,
    });

    saveAll(cards);
    return true;
  }

  function remove(word) {
    const cards = getAll().filter(c => c.word !== word);
    saveAll(cards);
  }

  function has(word) {
    return getAll().some(c => c.word === word);
  }

  function count() {
    return getAll().length;
  }

  function markStudied(word) {
    const cards = getAll();
    const card = cards.find(c => c.word === word);
    if (card) {
      card.timesStudied++;
      card.lastStudied = new Date().toISOString();
      saveAll(cards);
    }
  }

  function updateBadge() {
    const badge = document.getElementById('flashcardBadge');
    if (!badge) return;
    const n = count();
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
  }

  return { getAll, add, remove, has, count, markStudied, updateBadge };
})();

// === Flashcard UI ===

const FlashcardUI = (() => {
  let studyDeck = [];
  let studyIndex = 0;

  function init() {
    Flashcards.updateBadge();

    document.getElementById('fcBackBtn').addEventListener('click', showSearchView);
    document.getElementById('fcStudyBtn').addEventListener('click', startStudy);
    document.getElementById('fcExitStudy').addEventListener('click', exitStudy);
    document.getElementById('fcCard').addEventListener('click', flipCard);
    document.getElementById('fcAgainBtn').addEventListener('click', studyAgain);
    document.getElementById('fcGotItBtn').addEventListener('click', gotIt);
  }

  function showBrowse() {
    document.getElementById('searchView').classList.remove('active');
    document.getElementById('flashcardsView').classList.add('active');
    document.getElementById('flashcardsBrowse').classList.remove('hidden');
    document.getElementById('flashcardsStudy').classList.add('hidden');
    renderList();
  }

  function showSearchView() {
    document.getElementById('flashcardsView').classList.remove('active');
    document.getElementById('searchView').classList.add('active');
  }

  function renderList() {
    const cards = Flashcards.getAll();
    const list = document.getElementById('fcList');
    const empty = document.getElementById('fcEmpty');
    const btn = document.getElementById('fcStudyBtn');

    document.getElementById('fcCount').textContent = `(${cards.length})`;
    btn.disabled = cards.length === 0;

    if (cards.length === 0) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');

    list.innerHTML = cards.map(card => {
      const def = card.definitions[0];
      const preview = def
        ? `${def.partOfSpeech ? def.partOfSpeech.slice(0, 4) + ' \u00B7 ' : ''}${def.definition}`
        : '';
      const audioBtn = card.audioUrl
        ? `<button class="fc-list-audio" data-audio="${card.audioUrl}" aria-label="Pronounce">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </button>`
        : '';
      return `
        <div class="fc-list-item" data-word="${card.word}">
          <div class="fc-list-item-content">
            <div class="fc-list-word">${card.word}</div>
            <div class="fc-list-def">${preview}</div>
          </div>
          ${audioBtn}
          <button class="fc-list-delete" data-word="${card.word}" aria-label="Delete">&times;</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.fc-list-item-content').forEach(el => {
      el.addEventListener('click', () => {
        const word = el.parentElement.dataset.word;
        showSearchView();
        if (typeof App !== 'undefined') App.searchWord(word);
      });
    });

    list.querySelectorAll('.fc-list-audio').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        new Audio(el.dataset.audio).play();
      });
    });

    list.querySelectorAll('.fc-list-delete').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        Flashcards.remove(el.dataset.word);
        renderList();
        showToast('Removed from flashcards');
      });
    });
  }

  // Study mode
  function startStudy() {
    const cards = Flashcards.getAll();
    if (cards.length === 0) return;

    studyDeck = shuffle([...cards]);
    studyIndex = 0;

    document.getElementById('flashcardsBrowse').classList.add('hidden');
    document.getElementById('flashcardsStudy').classList.remove('hidden');
    showStudyCard();
  }

  function exitStudy() {
    document.getElementById('flashcardsStudy').classList.add('hidden');
    document.getElementById('flashcardsBrowse').classList.remove('hidden');
    renderList();
  }

  function showStudyCard() {
    if (studyIndex >= studyDeck.length) {
      showToast('Study session complete!');
      exitStudy();
      return;
    }

    const card = studyDeck[studyIndex];
    const fcCard = document.getElementById('fcCard');
    fcCard.classList.remove('flipped');

    document.getElementById('fcWordFront').textContent = card.word;

    // Audio button on front
    const frontAudioEl = document.getElementById('fcAudioFront');
    if (card.audioUrl) {
      frontAudioEl.classList.remove('hidden');
      frontAudioEl.onclick = (e) => {
        e.stopPropagation();
        new Audio(card.audioUrl).play();
      };
    } else {
      frontAudioEl.classList.add('hidden');
    }

    document.getElementById('fcProgress').textContent = `${studyIndex + 1} / ${studyDeck.length}`;

    const fill = ((studyIndex + 1) / studyDeck.length) * 100;
    document.getElementById('fcProgressFill').style.width = fill + '%';

    // Build back content
    const content = document.getElementById('fcCardContent');
    let html = `<div class="word-title">${card.word}</div>`;
    if (card.phonetic || card.audioUrl) {
      html += `<div class="word-phonetics">`;
      if (card.phonetic) html += `<span>${card.phonetic}</span>`;
      if (card.audioUrl) {
        html += ` <button class="audio-btn fc-back-audio" data-audio="${card.audioUrl}" aria-label="Pronounce">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>`;
      }
      html += `</div>`;
    }

    (card.definitions || []).slice(0, 3).forEach(def => {
      html += `<div class="pos-group">`;
      if (def.partOfSpeech) html += `<span class="pos-badge">${def.partOfSpeech}</span>`;
      html += `<div class="definition-text">${def.definition}</div>`;
      if (def.examples && def.examples[0]) {
        html += `<div class="definition-example">"${def.examples[0]}"</div>`;
      }
      if (def.synonyms && def.synonyms.length) {
        html += `<div class="definition-synonyms">Synonyms: <span>${def.synonyms.slice(0, 4).join(', ')}</span></div>`;
      }
      html += `</div>`;
    });

    content.innerHTML = html;

    const backAudioBtn = content.querySelector('.fc-back-audio');
    if (backAudioBtn) {
      backAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        new Audio(backAudioBtn.dataset.audio).play();
      });
    }
  }

  function flipCard() {
    document.getElementById('fcCard').classList.toggle('flipped');
  }

  function studyAgain() {
    // Re-insert near front (2 cards ahead)
    const card = studyDeck[studyIndex];
    const insertAt = Math.min(studyIndex + 2, studyDeck.length);
    studyDeck.splice(insertAt, 0, { ...card });
    studyIndex++;
    showStudyCard();
  }

  function gotIt() {
    Flashcards.markStudied(studyDeck[studyIndex].word);
    studyIndex++;
    showStudyCard();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { init, showBrowse, renderList };
})();

// Toast helper
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
