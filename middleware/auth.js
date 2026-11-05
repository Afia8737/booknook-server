import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

// Verifies the JWT issued by Better Auth (jwt plugin) using the public JWKS of the Next.js app.
export async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please log in to continue." });
    }
    jwks ??= createRemoteJWKSet(new URL(`${process.env.AUTH_URL}/api/auth/jwks`));
    const { payload } = await jwtVerify(header.slice(7), jwks);
    if (!payload.email) {
      return res.status(401).json({ message: "Your session is not valid. Please log in again." });
    }
    req.user = { email: payload.email, name: payload.name || "Reader" };
    next();
  } catch {
    res.status(401).json({ message: "Your session expired. Please log in again." });
  }
}
