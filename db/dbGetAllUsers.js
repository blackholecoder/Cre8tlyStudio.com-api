import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function getAllUsers() {
  const db = await connect();
  const page = 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const [rows] = await db.query(
    `
  SELECT id, name, email, role, created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?;
`,
    [limit, offset]
  );
  console.log("row", rows);
  return rows;
}
