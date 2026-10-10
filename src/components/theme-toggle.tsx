"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Les deux icônes sont dans le HTML ; le CSS (classe .dark posée avant
// l'hydratation par le script du layout) choisit laquelle s'affiche.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("sf:theme", dark ? "dark" : "light");
    } catch {
      // ignoré
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className={className}
      aria-label="Changer de thème"
      title="Changer de thème"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
