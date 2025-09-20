import { RequestHandler } from "express";
import { GetUserResponse, ErrorResponse } from "@shared/api";
import {
  findUserById,
  findUserByUsername,
  codeSnippets,
  users,
} from "../database";

/**
 * GET /api/users/:id
 * Get user profile by ID
 */
export const getUserById: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const user = findUserById(id);

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: "User not found",
        statusCode: 404,
      };
      return res.status(404).json(errorResponse);
    }

    // Get user's snippets
    const userSnippets = codeSnippets.filter(
      (snippet) => snippet.authorId === id,
    );

    const response: GetUserResponse = {
      user,
      snippets: userSnippets,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to fetch user profile",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/users/username/:username
 * Get user profile by username
 */
export const getUserByUsername: RequestHandler = (req, res) => {
  try {
    const { username } = req.params;
    const user = findUserByUsername(username);

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: "User not found",
        statusCode: 404,
      };
      return res.status(404).json(errorResponse);
    }

    // Get user's snippets
    const userSnippets = codeSnippets.filter(
      (snippet) => snippet.authorId === user.id,
    );

    const response: GetUserResponse = {
      user,
      snippets: userSnippets,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting user by username:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to fetch user profile",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/users
 * Get all users (for listing/discovery)
 */
export const getAllUsers: RequestHandler = (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let sortedUsers = [...users];

    // Apply sorting
    sortedUsers.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (sortBy === "createdAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

    const response = {
      users: paginatedUsers,
      total: users.length,
      page: Number(page),
      limit: Number(limit),
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting all users:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to fetch users",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/users/top-authors
 * Get top authors based on their snippet ratings and downloads
 */
export const getTopAuthors: RequestHandler = (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Calculate author scores based on their snippets
    const authorStats = users.map((user) => {
      const userSnippets = codeSnippets.filter(
        (snippet) => snippet.authorId === user.id,
      );

      if (userSnippets.length === 0) {
        return {
          ...user,
          totalDownloads: 0,
          averageRating: 0,
          authorScore: 0,
        };
      }

      const totalDownloads = userSnippets.reduce(
        (sum, snippet) => sum + snippet.downloads,
        0,
      );
      const averageRating =
        userSnippets.reduce((sum, snippet) => sum + snippet.rating, 0) /
        userSnippets.length;
      const authorScore =
        totalDownloads * 0.3 + averageRating * 20 + userSnippets.length * 5;

      return {
        ...user,
        totalDownloads,
        averageRating: Number(averageRating.toFixed(1)),
        authorScore,
      };
    });

    // Sort by author score and get top authors
    const topAuthors = authorStats
      .sort((a, b) => b.authorScore - a.authorScore)
      .slice(0, Number(limit))
      .map(({ authorScore, ...author }) => author);

    const response = {
      authors: topAuthors,
      total: topAuthors.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting top authors:", error);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
      message: "Failed to fetch top authors",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
};
