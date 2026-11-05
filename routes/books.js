// import { Router } from "express";
// import { getDb } from "../db.js";
// import { verifyToken } from "../middleware/auth.js";
// import { asyncHandler, toObjectId } from "../utils.js";

const router = Router();
const CATEGORIES = ["Fiction", "Science", "History", "Kids", "Others"];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /books — public. Supports ?search= ?category= ?email= ?limit=  (newest first)
router.get("/", asyncHandler(async (req, res) => {
  const { search, category, email, limit } = req.query;
  const query = {};
  if (category && category !== "All") query.category = category;
  if (email) query["addedBy.email"] = email;
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    query.$or = [{ title: rx }, { author: rx }];
  }
  let cursor = (await getDb()).collection("books").find(query).sort({ createdAt: -1 });
  const n = parseInt(limit, 10);
  if (n > 0) cursor = cursor.limit(Math.min(n, 100));
  res.json(await cursor.toArray());
}));

// GET /books/:id — protected
router.get("/:id", verifyToken, asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book link is not valid." });
  const book = await (await getDb()).collection("books").findOne({ _id });
  if (!book) return res.status(404).json({ message: "We could not find this book." });
  res.json(book);
}));

// POST /books — protected
router.post("/", verifyToken, asyncHandler(async (req, res) => {
  const { title, author, category, image, description, totalCopies } = req.body;
  const copies = Number(totalCopies);
  if (!title?.trim() || !author?.trim() || !image || !description?.trim()) {
    return res.status(400).json({ message: "Please fill in every field." });
  }
  if (!CATEGORIES.includes(category)) return res.status(400).json({ message: "Pick a valid category." });
  if (!Number.isInteger(copies) || copies < 1) {
    return res.status(400).json({ message: "Total copies must be a whole number of 1 or more." });
  }
  const book = {
    title: title.trim(),
    author: author.trim(),
    category,
    image,
    description: description.trim(),
    totalCopies: copies,
    availableCopies: copies,
    addedBy: { name: req.user.name, email: req.user.email },
    createdAt: new Date(),
  };
  const result = await (await getDb()).collection("books").insertOne(book);
  res.status(201).json({ ...book, _id: result.insertedId });
}));

// PATCH /books/:id — protected, owner only
router.patch("/:id", verifyToken, asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book link is not valid." });
  const books = (await getDb()).collection("books");
  const book = await books.findOne({ _id });
  if (!book) return res.status(404).json({ message: "We could not find this book." });
  if (book.addedBy.email !== req.user.email) {
    return res.status(403).json({ message: "You can only edit books you added." });
  }

  const update = {};
  for (const key of ["title", "author", "description", "image"]) {
    if (typeof req.body[key] === "string" && req.body[key].trim()) update[key] = req.body[key].trim();
  }
  if (req.body.category) {
    if (!CATEGORIES.includes(req.body.category)) return res.status(400).json({ message: "Pick a valid category." });
    update.category = req.body.category;
  }
  if (req.body.totalCopies !== undefined) {
    const copies = Number(req.body.totalCopies);
    const lent = book.totalCopies - book.availableCopies;
    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).json({ message: "Total copies must be a whole number of 1 or more." });
    }
    if (copies < lent) {
      return res.status(400).json({ message: `${lent} copies are currently borrowed, so total copies cannot be lower than ${lent}.` });
    }
    update.totalCopies = copies;
    update.availableCopies = copies - lent;
  }
  await books.updateOne({ _id }, { $set: update });
  res.json({ ...book, ...update });
}));

// DELETE /books/:id — protected, owner only
router.delete("/:id", verifyToken, asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book link is not valid." });
  const db = await getDb();
  const book = await db.collection("books").findOne({ _id });
  if (!book) return res.status(404).json({ message: "We could not find this book." });
  if (book.addedBy.email !== req.user.email) {
    return res.status(403).json({ message: "You can only delete books you added." });
  }
  await db.collection("books").deleteOne({ _id });
  await db.collection("borrows").deleteMany({ bookId: String(_id) });
  res.json({ deleted: true });
}));

export default router;
