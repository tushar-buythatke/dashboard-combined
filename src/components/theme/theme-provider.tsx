"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ThemeName = "default" | "emerald" | "amber" | "teal" | "violet" | "rose" | "indigo"
type ThemeMode = "light" | "dark"

type ThemeContextValue = {
  theme: ThemeName
  mode: ThemeMode
  themes: ThemeName[]
  setTheme: (theme: ThemeName) => void
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEYS = {
  theme: "pa-dasher-theme",
  mode: "pa-dasher-mode",
} as const

const AVAILABLE_THEMES: ThemeName[] = [
  "default",
  "emerald",
  "amber",
  "teal",
  "violet",
  "rose",
  "indigo",
]

function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (theme === "default") {
    root.removeAttribute("data-theme")
  } else {
    root.setAttribute("data-theme", theme)
  }
}

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (mode === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

function readStoredTheme(): ThemeName | undefined {
  if (typeof window === "undefined") return undefined
  const stored = window.localStorage.getItem(STORAGE_KEYS.theme) as ThemeName | null
  if (stored && AVAILABLE_THEMES.includes(stored)) {
    return stored
  }
  return undefined
}

function readStoredMode(): ThemeMode | undefined {
  if (typeof window === "undefined") return undefined
  const stored = window.localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode | null
  if (stored === "light" || stored === "dark") {
    return stored
  }
  return undefined
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => readStoredTheme() ?? "default")
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode() ?? "light")

  useEffect(() => {
    applyTheme(theme)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme)
    }
  }, [theme])

  useEffect(() => {
    applyMode(mode)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.mode, mode)
    }
  }, [mode])

  useEffect(() => {
    // ensure DOM reflects initial state on mount
    applyTheme(theme)
    applyMode(mode)
  }, [])

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next)
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === "dark" ? "light" : "dark"))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setTheme, setMode, toggleMode, themes: AVAILABLE_THEMES }),
    [theme, mode, setTheme, setMode, toggleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
