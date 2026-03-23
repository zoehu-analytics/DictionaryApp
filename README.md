# Dictionary App

A mobile-first dictionary web app with flashcard study features. Works as a PWA — install it on your iPhone home screen for a native app experience.

**Live:** [https://zoehu-analytics.github.io/DictionaryApp/](https://zoehu-analytics.github.io/DictionaryApp/)

## Features

- **Word Lookup** — Search any English word for definitions, phonetics, synonyms, antonyms, and examples
- **Audio Pronunciation** — Tap the play button to hear how a word is pronounced
- **Flashcards** — Save words to your flashcard deck for later review
- **Study Mode** — Flip-card study sessions with "Study Again" / "Got It" buttons
- **Search History** — Quick-access chips for recently searched words
- **Offline Support** — Works without internet after first load (PWA with service worker)
- **No API Key Required** — Uses the free [Free Dictionary API](https://dictionaryapi.dev/)

## Install on iPhone

1. Open the live URL in **Safari**
2. Tap **Share** (square with arrow)
3. Tap **Add to Home Screen**
4. Open from your home screen — it runs full-screen like a native app

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks)
- [Free Dictionary API](https://dictionaryapi.dev/)
- PWA (manifest + service worker)
- LocalStorage for flashcards and history
