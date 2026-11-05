import { MongoClient } from "mongodb";

let client;
let cached;

export async function getDb() {
  if (cached) return cached;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || "booknook");
  // One active borrow per user per book (protects against double borrow, even under race conditions)
  await db.collection("borrows").createIndex({ bookId: 1, userEmail: 1 }, { unique: true });
  await db.collection("books").createIndex({ createdAt: -1 });
  cached = db;
  return db;
}
