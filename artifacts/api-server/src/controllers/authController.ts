import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool";
import { signToken } from "../utils/jwt";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Username, email, and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, bio, avatar_url, pronouns, created_at",
      [username, email, passwordHash],
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        pronouns: user.pronouns || "",
        avatarUrl: user.avatar_url || "",
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(500).json({ error: message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await query(
      "SELECT id, username, email, password_hash, bio, avatar_url, pronouns, created_at FROM users WHERE email = $1",
      [email],
    );

    if (!result.rowCount || result.rowCount === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        pronouns: user.pronouns || "",
        avatarUrl: user.avatar_url || "",
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(500).json({ error: message });
  }
}
