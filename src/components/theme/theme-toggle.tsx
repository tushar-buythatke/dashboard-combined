"use client"

import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { useTheme, type ThemeName } from "./theme-provider"

const THEME_DETAILS: Record<ThemeName, { label: string; swatch: string; description?: string }> = {
  default: { label: "Aurora", swatch: "#6c63ff", description: "Cool blue & violet" },
  emerald: { label: "Emerald", swatch: "#3aa981", description: "Fresh green" },
  amber: { label: "Amber", swatch: "#f59e0b", description: "Warm amber" },
  teal: { label: "Teal", swatch: "#0ea5e9", description: "Oceanic teal" },
  violet: { label: "Violet", swatch: "#a855f7", description: "Vibrant violet" },
  rose: { label: "Rose", swatch: "#f87171", description: "Soft rose" },
  indigo: { label: "Indigo", swatch: "#4f46e5", description: "Deep indigo" },
}

export function ThemeToggle() {
  const { theme, themes, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2 whitespace-nowrap">
          <div
            className="h-3 w-3 rounded-full border border-border"
            style={{ backgroundColor: THEME_DETAILS[theme].swatch }}
          />
          <span className="text-sm font-medium">{THEME_DETAILS[theme].label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <Palette className="h-3 w-3" />
          Color Themes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {themes.map((option) => {
            const meta = THEME_DETAILS[option]
            return (
              <DropdownMenuItem
                key={option}
                onClick={() => setTheme(option)}
                className={cn("flex cursor-pointer items-start gap-3 py-2", option === theme && "bg-muted")}
              >
                <div
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-border/60"
                  style={{ backgroundColor: meta.swatch }}
                />
                <div className="flex flex-col text-xs">
                  <span className="font-medium text-foreground">{meta.label}</span>
                  {meta.description ? (
                    <span className="text-muted-foreground text-[11px]">{meta.description}</span>
                  ) : null}
                </div>
              </DropdownMenuItem>
            )
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-[11px] font-normal">
          Themes follow Tailwind tokens defined in <code>src/index.css</code>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
