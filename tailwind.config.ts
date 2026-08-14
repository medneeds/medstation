import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem", lg: "2rem" },
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ink: "hsl(var(--ink))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        examinus: {
          DEFAULT: "hsl(var(--examinus))",
          foreground: "hsl(var(--examinus-foreground))",
        },
        "accent-warm": {
          DEFAULT: "hsl(var(--accent-warm))",
          foreground: "hsl(var(--accent-warm-foreground))",
        },
        hairline: "hsl(var(--hairline))",
        "surface-elevated": "hsl(var(--surface-elevated))",
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        mono: '0.12em',
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-clinical": "var(--gradient-clinical)",
        "gradient-hero": "var(--gradient-hero)",
      },
      boxShadow: {
        medical: "var(--shadow-medical)",
        elevated: "var(--shadow-elevated)",
        critical: "var(--shadow-critical)",
        hairline: "0 0 0 1px hsl(var(--hairline))",
      },
      transitionTimingFunction: {
        precise: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionProperty: {
        smooth: "var(--transition-smooth)",
        fast: "var(--transition-fast)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      keyframes: {
        wiggle: {
          "0%, 88%, 100%": { transform: "rotate(0deg)" },
          "91%": { transform: "rotate(-9deg)" },
          "94%": { transform: "rotate(7deg)" },
          "97%": { transform: "rotate(-4deg)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(4px)" },
        },
        "thinking-logo": {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)" },
          "50%": { transform: "scale(1.08) rotate(2deg)" },
        },
        "thinking-halo": {
          "0%, 100%": { opacity: "0.25", transform: "scale(0.85)" },
          "50%": { opacity: "0.7", transform: "scale(1.15)" },
        },
        "thinking-dot": {
          "0%, 80%, 100%": { opacity: "0.2", transform: "translateY(0)" },
          "40%": { opacity: "1", transform: "translateY(-2px)" },
        },
        "stream-cursor": {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "1" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "orb-breathe": {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.025)", filter: "brightness(1.06)" },
        },
        "orb-spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "orb-ring": {
          "0%": { transform: "scale(0.92)", opacity: "0.28" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        "orb-shimmer": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" },
        },
        "glyph-sheen": {
          "0%": { backgroundPosition: "150% 0" },
          "60%, 100%": { backgroundPosition: "-150% 0" },
        },

      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-up": "slide-up 360ms cubic-bezier(0.32, 0.72, 0, 1)",
        shimmer: "shimmer 3s linear infinite",
        "bounce-x": "bounce-x 1.6s ease-in-out infinite",
        "thinking-logo": "thinking-logo 1.6s ease-in-out infinite",
        "thinking-halo": "thinking-halo 1.8s ease-in-out infinite",
        "thinking-dot": "thinking-dot 1.2s ease-in-out infinite",
        "stream-cursor": "stream-cursor 0.9s ease-in-out infinite",
        "orb-float": "orb-float 6s ease-in-out infinite",
        "orb-breathe": "orb-breathe 5s ease-in-out infinite",
        "orb-spin-slow": "orb-spin-slow 28s linear infinite",
        "orb-ring": "orb-ring 4.5s ease-out infinite",
        "orb-shimmer": "orb-shimmer 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
