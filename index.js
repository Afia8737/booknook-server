import "dotenv/config";
import express from "express";
import cors from "cors";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";

const app = express();
const origins = (process.env.CLIENT_URL || "http://localhost:3000").split(",").map((o) => o.trim());

app.use(cors({ origin: origins }));
app.use(express.json());

app.get("/", (req, res) => res.json({ name: "BookNook API", status: "running" }));
app.use("/books", booksRouter);
app.use("/borrows", borrowsRouter);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`BookNook API listening on ${port}`));
}

export default app;
