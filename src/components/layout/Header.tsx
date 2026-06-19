import { useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/scanner": "Scanner",
  "/duplicates": "Duplicates",
  "/cleaner": "Cache Cleaner",
  "/move": "Smart Move",
  "/health": "Health Score",
  "/settings": "Settings",
};

export function Header() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const title = pageTitles[location.pathname] ?? "PetaByte";

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
