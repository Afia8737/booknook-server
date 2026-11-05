// import { Router } from "express";
// import { getDb } from "../db.js";
// import { verifyToken } from "../middleware/auth.js";
// import { asyncHandler, toObjectId } from "../utils.js";

const router = Router();
const DAY = 24 * 60 * 60 * 1000;
const DOUBLE = "You have already borrowed this book. Return it before borrowing again.";

// POST /borrows — borrow a book (decrements copies with $inc, blocks double borrow)
router.post("/", verifyToken, asyncHandler(async (req, res) => {
  const bookId = toObjectId(req.body.bookId);
  if (!bookId) return res.status(400).json({ message: "That book link is not valid." });
  const days = Math.min(Math.max(parseInt(req.body.days, 10) || 7, 1), 30);

  const db = await getDb();
  const books = db.collection("books");
  const borrows = db.collection("borrows");
  const book = await books.findOne({ _id: bookId });
  if (!book) return res.status(404).json({ message: "We could not find this book." });

  const already = await borrows.findOne({ bookId: String(bookId), userEmail: req.user.email });
  if (already) return res.status(409).json({ message: DOUBLE });

  // Atomic: only decrement when at least one copy is left
  const dec = await books.updateOne({ _id: bookId, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } });
  if (!dec.modifiedCount) return res.status(400).json({ message: "No copies of this book are available right now." });

  const now = new Date();
  const borrow = {
    bookId: String(bookId),
    bookTitle: book.title,
    bookImage: book.image,
    userName: req.user.name,
    userEmail: req.user.email,
    borrowDate: now,
    returnDate: new Date(now.getTime() + days * DAY),
  };
  try {
    const result = await borrows.insertOne(borrow);
    res.status(201).json({ ...borrow, _id: result.insertedId });
  } catch (err) {
    await books.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } }); // roll back the copy
    if (err.code === 11000) return res.status(409).json({ message: DOUBLE });
    throw err;
  }
}));

// GET /borrows — borrows of the logged in user
router.get("/", verifyToken, asyncHandler(async (req, res) => {
  const list = await (await getDb()).collection("borrows").find({ userEmail: req.user.email }).sort({ borrowDate: -1 }).toArray();
  res.json(list);
}));

// DELETE /borrows/:id — return a book (increments copies with $inc)
router.delete("/:id", verifyToken, asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That borrow record is not valid." });
  const db = await getDb();
  const borrow = await db.collection("borrows").findOne({ _id });
  if (!borrow) return res.status(404).json({ message: "We could not find this borrow." });
  if (borrow.userEmail !== req.user.email) return res.status(403).json({ message: "This borrow belongs to someone else." });
  await db.collection("borrows").deleteOne({ _id });
  await db.collection("books").updateOne({ _id: toObjectId(borrow.bookId) }, { $inc: { availableCopies: 1 } });
  res.json({ returned: true });
}));

export default router;
