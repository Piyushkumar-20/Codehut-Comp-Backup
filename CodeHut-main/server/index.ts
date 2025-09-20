import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

// Import database functions
import {
  testConnection as testOldConnection,
  initializeTables,
} from "./config/db";
import { testConnection, pool } from "./db/database";

// Import all route handlers
import {
  getSnippets,
  getSnippetById,
  createCodeSnippet,
  getPopularSnippets,
  getSnippetsByAuthor,
} from "./routes/snippets";

import {
  getUserById,
  getUserByUsername,
  getAllUsers,
  getTopAuthors,
} from "./routes/users";

import {
  purchaseSnippet,
  getUserPurchases,
  getSnippetPurchaseStats,
  checkPurchaseStatus,
} from "./routes/purchases";

import {
  globalSearch,
  getSearchSuggestions,
  getSearchFilters,
} from "./routes/search";

import { getMarketplaceStats, getTrendingData } from "./routes/stats";

import {
  signup,
  login,
  logout,
  getCurrentUser,
  demoLogin,
  refreshToken,
  changePassword,
  getActiveSessions,
  authenticateToken,
} from "./routes/auth";
import { requireAdmin, requireModerator } from "./utils/auth";

// Import payment routes
import paymentRoutes from "./routes/payments";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Code Snippets API
  app.get("/api/snippets", getSnippets);
  app.get("/api/snippets/popular", getPopularSnippets);
  app.get("/api/snippets/author/:authorId", getSnippetsByAuthor);
  app.get("/api/snippets/:id", getSnippetById);
  app.post("/api/snippets", authenticateToken, createCodeSnippet);

  // Users API
  app.get("/api/users", getAllUsers);
  app.get("/api/users/top-authors", getTopAuthors);
  app.get("/api/users/:id", getUserById);
  app.get("/api/users/username/:username", getUserByUsername);

  // Purchases API
  app.post("/api/purchases", purchaseSnippet);
  app.get("/api/purchases/user/:userId", getUserPurchases);
  app.get("/api/purchases/snippet/:snippetId", getSnippetPurchaseStats);
  app.get("/api/purchases/check/:userId/:snippetId", checkPurchaseStatus);

  // Search API
  app.get("/api/search", globalSearch);
  app.get("/api/search/suggestions", getSearchSuggestions);
  app.get("/api/search/filters", getSearchFilters);

  // Stats API
  app.get("/api/stats", getMarketplaceStats);
  app.get("/api/stats/trending", getTrendingData);

  // Authentication API
  app.post("/api/auth/signup", signup);
  app.post("/api/auth/login", login);
  app.post("/api/auth/refresh", refreshToken);
  app.post("/api/auth/logout", authenticateToken, logout);
  app.get("/api/auth/me", authenticateToken, getCurrentUser);
  app.put("/api/auth/change-password", authenticateToken, changePassword);
  app.get(
    "/api/auth/sessions",
    authenticateToken,
    requireAdmin,
    getActiveSessions,
  );
  app.post("/api/auth/demo/:username", demoLogin);

  // Payment API (Razorpay integration)
  app.use("/api/payments", paymentRoutes);


  // Initialize database connection and tables
  initializeDatabase();

  return app;
}

// Database initialization function
async function initializeDatabase() {
  try {
    await testConnection(); // Test Neon database connection
    console.log("🚀 Neon database initialized successfully");


    // Initialize old PostgreSQL tables if needed
    try {
      await testOldConnection();
      await initializeTables();
      console.log("🚀 Legacy database tables initialized");
    } catch (legacyError) {
      console.log("ℹ️ Legacy database not available, using Neon only");
    }
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    // Don't exit the process, but log the error
  }
}

// Initialize plagiarism detection database schema
async function initializePlagiarismSchema() {
  const fs = await import("fs");
  const path = await import("path");

  if (!pool) {
    console.log("ℹ️ Skipping plagiarism schema initialization (database not configured)");
    return;
  }

  try {
    // Read and execute the plagiarism schema SQL
    const schemaPath = path.join(__dirname, "db", "plagiarism-schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    // Split by statements and execute each one
    const statements = schemaSQL
      .split(";")
      .filter((stmt) => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    console.log("✅ Plagiarism detection database schema created successfully");
  } catch (error) {
    console.error("❌ Error initializing plagiarism schema:", error);
    throw error;
  }
}

// Initialize AI logic analysis database schema
async function initializeAILogicSchema() {
  if (!pool) {
    console.log("ℹ️ Skipping AI logic schema initialization (database not configured)");
    return;
  }

  try {
    // Read and execute the AI logic schema SQL
    const fs = await import("fs");
    const path = await import("path");
    const schemaPath = path.join(__dirname, "db", "ai-logic-schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    // Split by statements and execute each one
    const statements = schemaSQL
      .split(";")
      .filter((stmt) => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    console.log("✅ AI logic analysis database schema created successfully");
  } catch (error) {
    console.error("❌ Error initializing AI logic schema:", error);
    throw error;
  }
}
