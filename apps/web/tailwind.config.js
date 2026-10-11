/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        agri: {
          bg: "#EBF0E9",
          card: "#FFFFFF",
          surface: "#F4F7F3",
          primary: "#5A8561",
          primaryHover: "#4B7351",
          dark: "#263028",
          darkHeader: "#2D372F",
          accent: "#A7C4A0",
          text: "#1D261F",
          muted: "#66786A",
          border: "#DDE4DC",
          warning: "#D97706",
          danger: "#DC2626",
          badge: "#E1EBE0",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "'Noto Sans Bengali'",
          "'Noto Sans Devanagari'",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
    },
  },
  plugins: [],
};
