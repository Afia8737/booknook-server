# BookNook API (server)

Express + MongoDB server for **BookNook**, a small online library.
Live API: https://YOUR-SERVER-URL.vercel.app

## Routes
| Method | Route | Access |
|---|---|---|
| GET | /books | public (`?search=&category=&email=&limit=`) |
| GET | /books/:id | JWT |
| POST | /books | JWT |
| PATCH | /books/:id | JWT, owner only |
| DELETE | /books/:id | JWT, owner only |
| POST | /borrows | JWT |
| GET | /borrows | JWT (own borrows) |
| DELETE | /borrows/:id | JWT (return a book) |

## Features
- JWT validation: tokens issued by Better Auth are verified against the client's JWKS endpoint
- Available copies tracked with `$inc` (borrow = -1, return = +1), never below zero
- Double borrow blocked by a check plus a unique index on `bookId + userEmail`
- Ownership checks on edit and delete

## Run locally
```bash
cp .env.example .env   # fill in values
npm install
npm run dev
```
