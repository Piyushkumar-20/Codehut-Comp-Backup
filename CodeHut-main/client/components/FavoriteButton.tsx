import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import useRequireAuth from "@/hooks/useRequireAuth";

interface FavoriteButtonProps {
  snippetId: string;
  userId?: string;
  initialIsFavorited?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  variant?: "default" | "ghost" | "outline";
}

export default function FavoriteButton({
  snippetId,
  userId,
  initialIsFavorited = false,
  className,
  size = "md",
  showCount = false,
  variant = "ghost",
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, showInfo } = useNotifications();

  useEffect(() => {
    // Load initial favorite status and count
    loadFavoriteStatus();
  }, [snippetId, userId]);

  const loadFavoriteStatus = async () => {
    try {
      // In a real app, fetch from API
      // const response = await fetch(`/api/favorites/status/${snippetId}?userId=${userId}`);
      // const data = await response.json();

      // Demo data
      const demoFavorites = JSON.parse(
        localStorage.getItem("userFavorites") || "[]",
      );
      const isCurrentlyFavorited = demoFavorites.includes(snippetId);
      setIsFavorited(isCurrentlyFavorited);

      // Demo favorite count (random for demo)
      setFavoriteCount(Math.floor(Math.random() * 20) + 5);
    } catch (error) {
      console.error("Failed to load favorite status:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!userId) {
      // Redirect to login immediately
      const requireAuth = useRequireAuth();
      requireAuth();
      return;
    }

    setLoading(true);

    try {
      // Optimistic update
      const newIsFavorited = !isFavorited;
      setIsFavorited(newIsFavorited);
      setFavoriteCount((prev) => (newIsFavorited ? prev + 1 : prev - 1));

      // Update localStorage for demo
      const demoFavorites = JSON.parse(
        localStorage.getItem("userFavorites") || "[]",
      );
      if (newIsFavorited) {
        demoFavorites.push(snippetId);
      } else {
        const index = demoFavorites.indexOf(snippetId);
        if (index > -1) demoFavorites.splice(index, 1);
      }
      localStorage.setItem("userFavorites", JSON.stringify(demoFavorites));

      // In a real app, call API
      // const response = await fetch('/api/favorites', {
      //   method: newIsFavorited ? 'POST' : 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ snippetId, userId }),
      // });

      // Show success notification
      if (newIsFavorited) {
        showSuccess({
          title: "Added to Favorites",
          description: "Snippet saved to your favorites list.",
          duration: 3000,
          action: {
            label: "View Favorites",
            onClick: () => (window.location.href = "/favorites"),
          },
        });
      } else {
        showSuccess({
          title: "Removed from Favorites",
          description: "Snippet removed from your favorites list.",
          duration: 3000,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFavorited(!isFavorited);
      setFavoriteCount((prev) => (isFavorited ? prev + 1 : prev - 1));

      showError({
        title: "Failed to Update Favorites",
        description:
          "There was an error updating your favorites. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8";
      case "lg":
        return "h-12 w-12";
      default:
        return "h-10 w-10";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "lg":
        return "w-6 h-6";
      default:
        return "w-5 h-5";
    }
  };

  const buttonContent = (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleFavorite}
      disabled={loading}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200",
        isFavorited && "text-red-500 hover:text-red-600",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn(getIconSize(), "animate-spin")} />
      ) : (
        <Heart
          className={cn(
            getIconSize(),
            "transition-all duration-200",
            isFavorited && "fill-current scale-110",
          )}
        />
      )}
    </Button>
  );

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>
          <p>
            {loading
              ? "Updating..."
              : isFavorited
                ? "Remove from favorites"
                : "Add to favorites"}
          </p>
        </TooltipContent>
      </Tooltip>

      {showCount && favoriteCount > 0 && (
        <span className="text-sm text-muted-foreground">{favoriteCount}</span>
      )}
    </div>
  );
}
