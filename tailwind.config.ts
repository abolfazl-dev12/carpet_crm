import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ["var(--font-vazirmatn)", "Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        carpet: {
          crimson: {
            DEFAULT: "#0284c7", // Yashar Sky Blue Primary
            light: "#38bdf8",
            dark: "#0369a1",
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            600: "#0284c7",
            800: "#075985",
            900: "#0c4a6e",
          },
          navy: {
            DEFAULT: "#173b64", // Yashar Deep Corporate Blue
            light: "#1e4776",
            dark: "#0e243e",
            50: "#f8fafc",
            100: "#f1f5f9",
            800: "#1e293b",
            900: "#0f172a",
            950: "#0b1329",
          },
          gold: {
            DEFAULT: "#0ea5e9", // Sky Accent
            light: "#38bdf8",
            dark: "#0284c7",
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
          },
          cream: {
            DEFAULT: "#f8fafc",
            dark: "#f0f9ff",
            border: "#e2e8f0",
          },
          emerald: {
            DEFAULT: "#059669",
            light: "#10B981",
            dark: "#047857",
            50: "#ECFDF5",
            100: "#D1FAE5",
          },
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(2, 132, 199, 0.08), 0 4px 10px -4px rgba(15, 23, 42, 0.04)",
        cardHover: "0 20px 35px -10px rgba(2, 132, 199, 0.15), 0 8px 16px -6px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
