import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  },
}));

// Sayfa yüklendiğinde localStorage'dan tema oku
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved === "light") {
    document.documentElement.classList.add("light");
    useThemeStore.setState({ theme: "light" });
  }
}
