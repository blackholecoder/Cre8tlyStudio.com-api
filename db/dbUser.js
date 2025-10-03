import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createUser({ name, email, password }) {
  const db = await connect();
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash) 
     VALUES (?, ?, ?, ?)`,
    [id, name, email, hashedPassword]
  );

  await db.end();
  return { id, email, name, role: "customer" };
}

export async function getUserByEmail(email) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM users WHERE email=? LIMIT 1", [email]);
  await db.end();
  return rows[0] || null;
}

export async function saveRefreshToken(userId, refreshToken) {
  const db = await connect();
  await db.query("UPDATE users SET refresh_token=? WHERE id=?", [refreshToken, userId]);
  await db.end();
}

export async function getUserByRefreshToken(refreshToken) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM users WHERE refresh_token=? LIMIT 1", [refreshToken]);
  await db.end();
  return rows[0] || null;
}

export async function updateUserRole(userId, role) {
  const db = await connect();
  await db.query("UPDATE users SET role=? WHERE id=?", [role, userId]);
  await db.end();
}

export async function getUserById(id) {
  const db = await connect();
  const [rows] = await db.query(
    "SELECT id, name, email, role FROM users WHERE id=?",
    [id]
  );
  await db.end();
  return rows[0] || null;
}

