/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom spacing additions (don't override defaults)
      spacing: {
        'custom-x': "40rem",
        'custom-xx': "50rem",
        'custom-z': "69.7rem",
        'custom-xxx': "75rem",
        'custom-it': "0.9rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        transparent: "transparent",
        current: "currentColor",
        white: "#ffffff",
        purple: "#3f3cbb",
        midnight: "#121063",
        metal: "#565584",
        tahiti: "#3ab7bf",
        silver: "#ecebff",
        "bubble-gum": "#ff77e9",
        bermuda: "#78dcca",
        hero: "#D9D9D9",
        kolchi: "#f0fdf4",
        ldrsm: "#167a3c",
        tn: "#94a3b8",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
        display: ["Oswald", "sans-serif"],
        body: ['"Open Sans"', "sans-serif"],
        ubuntu: ["Ubuntu", "sans-serif"],
      },
      // Custom border radius additions (don't override defaults)
      borderRadius: {
        'mdd': "0.7rem",
        'llg': "0.5rem",
        'lllg': "1rem",
        'large': "12px",
      },
    },
  },
  plugins: [],
};
