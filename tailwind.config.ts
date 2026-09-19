import type { Config } from "tailwindcss";

// Color tokens follow the structure recommended in DESIGN_SYSTEM.md section 4.
// Actual values live in src/app/globals.css as CSS variables so the whole
// app can be re-themed from one place once the final brand palette is set.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        accent: "var(--accent)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        border: "var(--border)",
        "text-muted": "var(--text-muted)",
      },
      borderRadius: {
        // Small controls: subtle rounding
        sm: "0.375rem",
        // Buttons: medium rounding
        md: "0.5rem",
        // Cards: medium-to-generous rounding
        lg: "0.875rem",
        // Modals: generous rounding
        xl: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
