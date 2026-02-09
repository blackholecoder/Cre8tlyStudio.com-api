// helpers/spellcheck.js
import nspell from "nspell";
import dictionaryEn from "dictionary-en";

let spell;

export async function getSpell() {
  if (spell) return spell;

  // dictionary-en (ESM) exports raw Hunspell data
  if (!dictionaryEn?.aff || !dictionaryEn?.dic) {
    throw new Error("Invalid dictionary-en export");
  }

  spell = nspell(dictionaryEn);
  return spell;
}

export function checkText(text, spell, ignoredWords = new Set()) {
  const regex = /\b[a-zA-Z']+\b/g;
  const issues = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const normalized = word.toLowerCase();

    // ✅ skip ignored / added-to-dictionary words
    if (ignoredWords.has(normalized)) continue;

    // ✅ skip correct words
    if (spell.correct(word)) continue;

    issues.push({
      word,
      index: match.index,
      suggestions: spell.suggest(word).slice(0, 5),
    });
  }

  return issues;
}
