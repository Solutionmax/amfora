import localFont from "next/font/local";

// Self-hosted so that a build never needs Google Fonts (CI runners and customer builds alike).
// Latin subsets from Google Fonts; licences in ./fonts/LICENSES.md.

export const archivo = localFont({
  src: [
    { path: "./fonts/archivo/500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/archivo/600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/archivo/700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const jetbrains = localFont({
  src: [{ path: "./fonts/jetbrains-mono/200-800.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-jetbrains",
  display: "swap",
});

export const publicSans = localFont({
  src: [{ path: "./fonts/public-sans/100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-public-sans",
  display: "swap",
});

export const outfit = localFont({
  src: [
    { path: "./fonts/outfit/100.woff2", weight: "100", style: "normal" },
    { path: "./fonts/outfit/200.woff2", weight: "200", style: "normal" },
    { path: "./fonts/outfit/300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/outfit/400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/outfit/500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/outfit/600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/outfit/700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/outfit/800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/outfit/900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
});

export const inter = localFont({
  src: [{ path: "./fonts/inter/100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

export const roboto = localFont({
  src: [
    { path: "./fonts/roboto/100.woff2", weight: "100", style: "normal" },
    { path: "./fonts/roboto/300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/roboto/400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto/500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/roboto/700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/roboto/900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-roboto",
  display: "swap",
});

export const openSans = localFont({
  src: [{ path: "./fonts/open-sans/300-800.woff2", weight: "300 800", style: "normal" }],
  variable: "--font-open-sans",
  display: "swap",
});

export const poppins = localFont({
  src: [
    { path: "./fonts/poppins/100.woff2", weight: "100", style: "normal" },
    { path: "./fonts/poppins/200.woff2", weight: "200", style: "normal" },
    { path: "./fonts/poppins/300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/poppins/400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins/500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins/600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins/700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins/800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/poppins/900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const nunito = localFont({
  src: [{ path: "./fonts/nunito/200-800.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-nunito",
  display: "swap",
});

export const lato = localFont({
  src: [
    { path: "./fonts/lato/100.woff2", weight: "100", style: "normal" },
    { path: "./fonts/lato/300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/lato/400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/lato/700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/lato/900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-lato",
  display: "swap",
});

export const montserrat = localFont({
  src: [{ path: "./fonts/montserrat/100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-montserrat",
  display: "swap",
});

export const sourceSans = localFont({
  src: [{ path: "./fonts/source-sans-3/200-800.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-source-sans",
  display: "swap",
});

export const raleway = localFont({
  src: [{ path: "./fonts/raleway/100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-raleway",
  display: "swap",
});

export const workSans = localFont({
  src: [{ path: "./fonts/work-sans/100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-work-sans",
  display: "swap",
});
