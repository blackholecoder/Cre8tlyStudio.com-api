export async function addWordToUserDictionary({ userId, word }) {
  const db = connect();

  try {
    const normalizedWord = word.trim().toLowerCase();

    if (!normalizedWord) {
      throw new Error("Invalid word");
    }

    await db.query(
      `
      INSERT IGNORE INTO user_dictionary (
        id,
        user_id,
        word
      ) VALUES (?, ?, ?)
      `,
      [uuidv4(), userId, normalizedWord],
    );

    return { success: true };
  } catch (err) {
    console.error("❌ addWordToUserDictionary failed:", err);
    throw err;
  }
}
