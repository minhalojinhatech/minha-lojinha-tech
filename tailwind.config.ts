import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        graphite: "#2b3036",
        line: "#e5e7eb",
        mist: "#f3f6f8",
        teal: "#00a884",
        lime: "#b9f24a",
        sky: "#8fc7ff",
        brand: {
          blue: "#0f6bff",
          green: "#15803d"
        }
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 14px 40px rgba(17, 24, 39, 0.08)",
        lift: "0 22px 60px rgba(17, 24, 39, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
