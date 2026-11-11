import type { Config } from "tailwindcss";

// Фирменный синий взят из логотипа Master Print (#0546EC на тёмно-синем фоне).
// Палитрой `blue` переопределяем стандартный синий, чтобы все кнопки
// и акценты по всей системе совпали с логотипом без правки каждой страницы.
const brand = {
  50: "#eef3ff",
  100: "#dce6ff",
  200: "#b9ccff",
  300: "#8aa8ff",
  400: "#567cff",
  500: "#2d5bff",
  600: "#0a45f0",
  700: "#0637c4",
  800: "#082d99",
  900: "#0b286f",
  950: "#070b1f",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // классы статусов и этапов лежат в src/lib/utils.ts — без этой строки часть цветов не попадала в CSS
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand,
        blue: brand,
        ink: "#070b1f", // тёмно-синий фон логотипа
        cmyk: {
          c: "#00aeef",
          m: "#ec008c",
          y: "#ffe600",
          k: "#1d1d1b",
        },
      },
      fontFamily: {
        sans: [
          "Manrope",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
