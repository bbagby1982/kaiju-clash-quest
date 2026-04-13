import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        atomic: {
          DEFAULT: "hsl(var(--atomic-green))",
          glow: "hsl(var(--atomic-green-glow))",
        },
        electric: {
          DEFAULT: "hsl(var(--electric-blue))",
          glow: "hsl(var(--electric-blue-glow))",
        },
        lightning: {
          DEFAULT: "hsl(var(--lightning-yellow))",
          glow: "hsl(var(--lightning-yellow-glow))",
        },
        monster: {
          red: "hsl(var(--monster-red))",
          orange: "hsl(var(--monster-orange))",
          purple: "hsl(var(--deep-purple))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "energy-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(120 100% 45% / 0.4)" },
          "50%": { boxShadow: "0 0 40px hsl(120 100% 45% / 0.8)" },
        },
        "bubble-rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.6" },
          "100%": { transform: "translateY(-100px) scale(1.3)", opacity: "0" },
        },
        "rain-fall": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "snow-fall": {
          "0%": { transform: "translateY(-10%) translateX(0)" },
          "100%": { transform: "translateY(100vh) translateX(20px)" },
        },
        "ash-fall": {
          "0%": { transform: "translateY(-10%) translateX(0)" },
          "100%": { transform: "translateY(100vh) translateX(-30px)" },
        },
        "whirlpool-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "lightning-flash": {
          "0%, 90%, 100%": { opacity: "0" },
          "92%, 94%": { opacity: "0.8" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "pulse-scale": "pulse-scale 2s ease-in-out infinite",
        "energy-pulse": "energy-pulse 2s ease-in-out infinite",
        "bubble-rise": "bubble-rise 4s ease-out infinite",
        "rain-fall": "rain-fall 0.4s linear infinite",
        "snow-fall": "snow-fall 3s ease-in-out infinite",
        "ash-fall": "ash-fall 5s ease-in-out infinite",
        "whirlpool-spin": "whirlpool-spin 2s linear infinite",
        "lightning-flash": "lightning-flash 4s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
