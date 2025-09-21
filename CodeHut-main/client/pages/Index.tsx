import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { CodeSnippet, GetCodeSnippetsResponse } from "@shared/api";

import SnippetCard from "@/components/SnippetCard";
import Logo from "@/components/Logo";
import BackgroundGl from "@/components/BackgroundGl";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeToggle from "@/components/ThemeToggle";

export default function Index() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPopularSnippets();
  }, []);

  const fetchPopularSnippets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/snippets/popular?limit=6");

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        console.error(
          "Failed to fetch popular snippets:",
          response.status,
          response.statusText,
        );
        setSnippets([]);
        return;
      }

      const data = await response.json();

      // Handle both success and error responses
      if (data.snippets && Array.isArray(data.snippets)) {
        setSnippets(data.snippets);
      } else {
        console.error("Invalid response format:", data);
        setSnippets([]);
      }
    } catch (error) {
      console.error("Error fetching snippets:", error);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirect to explore page with search query
      window.location.href = `/explore?query=${encodeURIComponent(searchQuery)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading popular snippets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a href="https://w2sp61d0-8081.inc1.devtunnels.ms/" className="inline-flex items-center">
                <Logo size="md" />
              </a>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationCenter />
              <Button variant="ghost" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/login?mode=signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <p className="text-xl text-gray-600 mb-8 mt-4">
            Buy and Sell Quality Code Snippets Instantly
          </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              asChild
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium bg-gradient-hover gradient-border-hover"
            >
              <Link to="/upload">Upload Your Code</Link>
            </Button>
            <Button
              asChild
              variant="outline"
        className="border-border text-foreground/80 hover:bg-muted px-6 py-3 rounded-lg font-medium hover:bg-gradient-to-r"
            >
              <Link to="/explore">Explore Code</Link>
            </Button>
          </div>

    {/* Background GL */}
    <BackgroundGl />

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code snippets, tools, components..."
                className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </form>
          </div>
        </div>

        {/* Popular Code Snippets */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Popular Code Snippets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {snippets && snippets.length > 0 ? (
              snippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onPurchaseComplete={fetchPopularSnippets}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600">
                  {loading
                    ? "Loading..."
                    : "No popular snippets available at the moment."}
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/explore">Browse All Snippets</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            © 2025 CodeHut. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
