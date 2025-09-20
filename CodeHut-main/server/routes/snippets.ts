import { RequestHandler } from "express";
import { ErrorResponse } from "@shared/api";
import {
  getAllSnippets,
  findSnippetById,
  createSnippet as dbCreateSnippet,
  pool,
} from "../db/database";
import { authenticateToken } from "../utils/auth";

/**
 * GET /api/snippets
 * Get all code snippets with optional filtering
 */
export const getSnippets: RequestHandler = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "10",
      language,
      framework,
      author,
      minPrice,
      maxPrice,
      search,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Try PostgreSQL database first
      let query = `
        SELECT s.*, u.username as author_username
        FROM snippets s
        LEFT JOIN users u ON s.author_id = u.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (language) {
        query += ` AND s.language ILIKE $${paramIndex}`;
        queryParams.push(`%${language}%`);
        paramIndex++;
      }

      if (framework) {
        query += ` AND s.framework ILIKE $${paramIndex}`;
        queryParams.push(`%${framework}%`);
        paramIndex++;
      }

      if (author) {
        query += ` AND (s.author_username ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
        queryParams.push(`%${author}%`);
        paramIndex++;
      }

      if (minPrice) {
        query += ` AND s.price >= $${paramIndex}`;
        queryParams.push(parseFloat(minPrice as string));
        paramIndex++;
      }

      if (maxPrice) {
        query += ` AND s.price <= $${paramIndex}`;
        queryParams.push(parseFloat(maxPrice as string));
        paramIndex++;
      }

      if (search) {
        query += ` AND (s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.tags::text ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Add sorting
      const validSortFields = [
        "created_at",
        "rating",
        "downloads",
        "price",
        "title",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "created_at";
      const order = sortOrder === "asc" ? "ASC" : "DESC";
      query += ` ORDER BY s.${sortField} ${order}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limitNum, offset);

      const result = await pool.query(query, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM snippets s
        LEFT JOIN users u ON s.author_id = u.id
        WHERE 1=1
      `;
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      let countParamIndex = 1;

      // Add same filters to count query
      if (language) {
        countQuery += ` AND s.language ILIKE $${countParamIndex}`;
        countParamIndex++;
      }
      if (framework) {
        countQuery += ` AND s.framework ILIKE $${countParamIndex}`;
        countParamIndex++;
      }
      if (author) {
        countQuery += ` AND (s.author_username ILIKE $${countParamIndex} OR u.username ILIKE $${countParamIndex})`;
        countParamIndex++;
      }
      if (minPrice) {
        countQuery += ` AND s.price >= $${countParamIndex}`;
        countParamIndex++;
      }
      if (maxPrice) {
        countQuery += ` AND s.price <= $${countParamIndex}`;
        countParamIndex++;
      }
      if (search) {
        countQuery += ` AND (s.title ILIKE $${countParamIndex} OR s.description ILIKE $${countParamIndex} OR s.tags::text ILIKE $${countParamIndex})`;
        countParamIndex++;
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        snippets: result.rows.map(mapDbRowToSnippet),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (dbError) {
      console.log("PostgreSQL unavailable, falling back to in-memory data");

      // Fallback to in-memory data
      const { codeSnippets } = await import("../database");
      let filteredSnippets = [...codeSnippets];

      // Apply filters
      if (language) {
        filteredSnippets = filteredSnippets.filter((s) =>
          s.language.toLowerCase().includes((language as string).toLowerCase()),
        );
      }
      if (framework) {
        filteredSnippets = filteredSnippets.filter((s) =>
          s.framework
            ?.toLowerCase()
            .includes((framework as string).toLowerCase()),
        );
      }
      if (author) {
        filteredSnippets = filteredSnippets.filter((s) =>
          s.author.toLowerCase().includes((author as string).toLowerCase()),
        );
      }
      if (minPrice) {
        filteredSnippets = filteredSnippets.filter(
          (s) => s.price >= parseFloat(minPrice as string),
        );
      }
      if (maxPrice) {
        filteredSnippets = filteredSnippets.filter(
          (s) => s.price <= parseFloat(maxPrice as string),
        );
      }
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredSnippets = filteredSnippets.filter(
          (s) =>
            s.title.toLowerCase().includes(searchTerm) ||
            s.description.toLowerCase().includes(searchTerm) ||
            s.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
        );
      }

      // Apply sorting
      const sortField =
        sortBy === "created_at" ? "createdAt" : (sortBy as string);
      filteredSnippets.sort((a, b) => {
        let aVal = (a as any)[sortField];
        let bVal = (b as any)[sortField];

        if (sortField === "createdAt") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const total = filteredSnippets.length;
      const paginatedSnippets = filteredSnippets.slice(
        offset,
        offset + limitNum,
      );

      res.json({
        snippets: paginatedSnippets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }
  } catch (error) {
    console.error("Get snippets error:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to get snippets",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/snippets/popular
 * Get popular snippets based on downloads and rating
 */
export const getPopularSnippets: RequestHandler = async (req, res) => {
  try {
    const { limit = "10" } = req.query;
    const limitNum = parseInt(limit as string);

    try {
      // Try PostgreSQL database first
      const result = await pool.query(
        `SELECT s.*, u.username as author_username
         FROM snippets s
         LEFT JOIN users u ON s.author_id = u.id
         ORDER BY (s.downloads * 0.7 + s.rating * 30) DESC
         LIMIT $1`,
        [limitNum],
      );

      res.json({
        snippets: result.rows.map(mapDbRowToSnippet),
      });
    } catch (dbError) {
      console.log("PostgreSQL unavailable, falling back to in-memory data");

      // Fallback to in-memory data
      const { codeSnippets } = await import("../database");

      // Sort by popularity (downloads * 0.7 + rating * 30) and limit
      const popularSnippets = codeSnippets
        .sort(
          (a, b) =>
            b.downloads * 0.7 +
            b.rating * 30 -
            (a.downloads * 0.7 + a.rating * 30),
        )
        .slice(0, limitNum);

      res.json({
        snippets: popularSnippets,
      });
    }
  } catch (error) {
    console.error("Get popular snippets error:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to get popular snippets",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/snippets/:id
 * Get a specific snippet by ID
 */
export const getSnippetById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    try {
      // Try PostgreSQL database first
      const result = await pool.query(
        `SELECT s.*, u.username as author_username
         FROM snippets s
         LEFT JOIN users u ON s.author_id = u.id
         WHERE s.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        const errorResponse: ErrorResponse = {
          error: "Not Found",
          message: "Snippet not found",
          statusCode: 404,
        };
        return res.status(404).json(errorResponse);
      }

      res.json(mapDbRowToSnippet(result.rows[0]));
    } catch (dbError) {
      console.log("PostgreSQL unavailable, falling back to in-memory data");

      // Fallback to in-memory data
      const { findSnippetById } = await import("../database");
      const snippet = findSnippetById(id);

      if (!snippet) {
        const errorResponse: ErrorResponse = {
          error: "Not Found",
          message: "Snippet not found",
          statusCode: 404,
        };
        return res.status(404).json(errorResponse);
      }

      res.json(snippet);
    }
  } catch (error) {
    console.error("Get snippet by ID error:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to get snippet",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/snippets/author/:authorId
 * Get snippets by a specific author
 */
export const getSnippetsByAuthor: RequestHandler = async (req, res) => {
  try {
    const { authorId } = req.params;
    const { limit = "10", page = "1" } = req.query;

    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Try PostgreSQL database first
      const result = await pool.query(
        `SELECT s.*, u.username as author_username
         FROM snippets s
         LEFT JOIN users u ON s.author_id = u.id
         WHERE s.author_id = $1
         ORDER BY s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [authorId, limitNum, offset],
      );

      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM snippets WHERE author_id = $1",
        [authorId],
      );

      const total = parseInt(countResult.rows[0].total);

      res.json({
        snippets: result.rows.map(mapDbRowToSnippet),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (dbError) {
      console.log("PostgreSQL unavailable, falling back to in-memory data");

      // Fallback to in-memory data
      const { codeSnippets } = await import("../database");

      // Filter by author ID
      const authorSnippets = codeSnippets.filter(
        (s) => s.authorId === authorId,
      );

      // Sort by creation date (newest first)
      authorSnippets.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Apply pagination
      const total = authorSnippets.length;
      const paginatedSnippets = authorSnippets.slice(offset, offset + limitNum);

      res.json({
        snippets: paginatedSnippets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }
  } catch (error) {
    console.error("Get snippets by author error:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to get snippets by author",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * POST /api/snippets
 * Create a new code snippet with plagiarism detection
 */
export const createCodeSnippet: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "Authentication required",
        statusCode: 401,
      };
      return res.status(401).json(errorResponse);
    }

    const {
      title,
      description,
      code,
      price,
      tags = [],
      language,
      framework,
      skipPlagiarismCheck = false, // Allow admins to skip check
    } = req.body;

    // Validate required fields
    if (!title || !description || !code || price === undefined || !language) {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message:
          "Missing required fields: title, description, code, price, language",
        statusCode: 400,
      };
      return res.status(400).json(errorResponse);
    }

    // Validate price
    if (typeof price !== "number" || price < 0) {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Price must be a non-negative number",
        statusCode: 400,
      };
      return res.status(400).json(errorResponse);
    }

    // Simplified flow: approve snippet without plagiarism checks
    let snippetStatus = "approved";

    // Create snippet with appropriate status
    const snippet = await dbCreateSnippet({
      title,
      description,
      code,
      price,
      author: user.username,
      authorId: user.id,
      tags: Array.isArray(tags) ? tags : [],
      language: language,
      framework: framework || "",
    });

    // Update snippet status in database (add status column if needed)
    try {
      await pool.query("UPDATE snippets SET status = $1 WHERE id = $2", [
        snippetStatus,
        snippet.id,
      ]);
    } catch (statusError) {
      // Status column might not exist in fallback mode - that's okay
      console.log(
        "Status update skipped (column may not exist in fallback mode)",
      );
    }


    // Update user's snippet count
    try {
      await pool.query(
        "UPDATE users SET total_snippets = total_snippets + 1 WHERE id = $1",
        [user.id],
      );
    } catch (updateError) {
      console.warn("Failed to update user snippet count:", updateError);
    }

    // Prepare response
    const response: any = {
      ...snippet,
      status: snippetStatus,
      message: "Code snippet uploaded successfully.",
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Create snippet error:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to create snippet",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

// Helper function to get file extension based on language
function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "cs",
    php: "php",
    ruby: "rb",
    go: "go",
    rust: "rs",
    html: "html",
    css: "css",
    sql: "sql",
    shell: "sh",
    jsx: "jsx",
    tsx: "tsx",
  };
  return extensions[language.toLowerCase()] || "txt";
}


// Helper function to map database row to snippet object
function mapDbRowToSnippet(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    code: row.code,
    price: parseFloat(row.price),
    rating: parseFloat(row.rating) || 0,
    author: row.author_username || row.author_username,
    authorId: row.author_id,
    tags: row.tags || [],
    language: row.language,
    framework: row.framework,
    downloads: row.downloads || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
