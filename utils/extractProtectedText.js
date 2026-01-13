export function extractProtectedText(input) {
  const protectedMap = {};
  let index = 1;

  // match "quoted text" or [bracketed text]
  const regex = /"([^"]+)"|\[([^\]]+)\]/g;

  const processedText = input.replace(regex, (match, quoted, bracketed) => {
    const value = quoted || bracketed;
    const token = `{{PROTECTED_${index++}}}`;
    protectedMap[token] = value;
    return token;
  });

  return {
    processedText,
    protectedMap,
  };
}
export function restoreProtectedText(text, protectedMap) {
  let restored = text;

  for (const token in protectedMap) {
    const original = protectedMap[token];
    restored = restored.split(token).join(original);
  }

  return restored;
}
