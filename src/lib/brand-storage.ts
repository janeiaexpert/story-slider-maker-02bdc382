export type Brand = {
  niche: string;
  audience: string;
  tone: "autoridade" | "proximo" | "provocador" | "didatico";
  goal: "autoridade" | "conversao" | "educacao" | "viralizacao";
  handle: string;
  author: string;
  primaryColor: string;
  bgColor: string;
  fontFamily: string;
  fontBody?: string;
};

export const defaultBrand: Brand = {
  niche: "",
  audience: "",
  tone: "autoridade",
  goal: "autoridade",
  handle: "@seuhandle",
  author: "Seu Nome",
  primaryColor: "#8b5a2b",
  bgColor: "#0a0a0a",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontBody: 'Inter, system-ui, sans-serif',
};

export const BRAND_PALETTES: { name: string; primary: string; bg: string }[] = [
  { name: "Marrom & Preto", primary: "#8b5a2b", bg: "#0a0a0a" },
  { name: "Marrom & Branco", primary: "#6b3a1d", bg: "#f5f1ea" },
  { name: "Bege & Preto", primary: "#c9a27a", bg: "#111111" },
  { name: "Preto & Branco", primary: "#ffffff", bg: "#0a0a0a" },
];

export type DesignStyle = {
  name: string;
  description: string;
  fontFamily: string;
  primaryColor: string;
  bgColor: string;
};

export const DESIGN_STYLES: DesignStyle[] = [
  {
    name: "Editorial Serif",
    description: "Tipografia clássica, ar de revista",
    fontFamily: 'Georgia, "Times New Roman", serif',
    primaryColor: "#8b5a2b",
    bgColor: "#0a0a0a",
  },
  {
    name: "Minimal Sans",
    description: "Limpo, moderno, alta legibilidade",
    fontFamily: '"Helvetica Neue", Inter, system-ui, sans-serif',
    primaryColor: "#ffffff",
    bgColor: "#0a0a0a",
  },
  {
    name: "Premium Mono",
    description: "Mono técnico, ar de boutique",
    fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',
    primaryColor: "#c9a27a",
    bgColor: "#111111",
  },
  {
    name: "Light Editorial",
    description: "Fundo claro, leitura premium",
    fontFamily: 'Georgia, "Times New Roman", serif',
    primaryColor: "#6b3a1d",
    bgColor: "#f5f1ea",
  },
];

export type FontPair = {
  name: string;
  description: string;
  heading: string;
  body: string;
};

// Fontes servidas pelo <link> Google Fonts em src/routes/__root.tsx
export const FONT_PAIRS: FontPair[] = [
  {
    name: "Playfair × Inter",
    description: "Editorial clássico, autoridade",
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", system-ui, sans-serif',
  },
  {
    name: "Instrument × Work Sans",
    description: "Revista moderna, elegante",
    heading: '"Instrument Serif", Georgia, serif',
    body: '"Work Sans", system-ui, sans-serif',
  },
  {
    name: "Fraunces × IBM Plex",
    description: "Serif com peso, tech premium",
    heading: '"Fraunces", Georgia, serif',
    body: '"IBM Plex Sans", system-ui, sans-serif',
  },
  {
    name: "Space Grotesk × DM Sans",
    description: "Moderno tech, startup",
    heading: '"Space Grotesk", system-ui, sans-serif',
    body: '"DM Sans", system-ui, sans-serif',
  },
  {
    name: "Syne × Plus Jakarta",
    description: "Criativo, ar de boutique",
    heading: '"Syne", system-ui, sans-serif',
    body: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  {
    name: "Bebas × Barlow",
    description: "Impacto, esporte, evento",
    heading: '"Bebas Neue", Impact, sans-serif',
    body: '"Barlow", system-ui, sans-serif',
  },
  {
    name: "Archivo Black × Hind",
    description: "Manchete forte, notícia",
    heading: '"Archivo Black", system-ui, sans-serif',
    body: '"Hind", system-ui, sans-serif',
  },
  {
    name: "JetBrains × Inter",
    description: "Mono técnico, IA / dev",
    heading: '"JetBrains Mono", monospace',
    body: '"Inter", system-ui, sans-serif',
  },
];

export type TypographyPreset = {
  name: string;
  fontFamily: string;
  headingWeight: string;
  bodyWeight: string;
  headingSpacing: string;
  bodySpacing: string;
  headingTransform: string;
  headingLineHeight: string;
};

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  { name: "Clássica", fontFamily: 'Georgia, "Times New Roman", serif', headingWeight: "700", bodyWeight: "400", headingSpacing: "0", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.15" },
  { name: "Moderna", fontFamily: '"Inter", system-ui, sans-serif', headingWeight: "700", bodyWeight: "400", headingSpacing: "-0.02em", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.1" },
  { name: "Editorial", fontFamily: '"Instrument Serif", Georgia, serif', headingWeight: "400", bodyWeight: "400", headingSpacing: "0.02em", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.2" },
  { name: "Handwritten", fontFamily: '"Caveat", cursive', headingWeight: "700", bodyWeight: "400", headingSpacing: "0", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.3" },
  { name: "Bold", fontFamily: '"Bebas Neue", Impact, sans-serif', headingWeight: "400", bodyWeight: "500", headingSpacing: "0.05em", bodySpacing: "0", headingTransform: "uppercase", headingLineHeight: "1.05" },
  { name: "Fina", fontFamily: '"Inter", system-ui, sans-serif', headingWeight: "300", bodyWeight: "300", headingSpacing: "0.05em", bodySpacing: "0.01em", headingTransform: "none", headingLineHeight: "1.2" },
  { name: "Tech", fontFamily: '"JetBrains Mono", monospace', headingWeight: "700", bodyWeight: "400", headingSpacing: "0", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.2" },
  { name: "Compacta", fontFamily: '"Space Grotesk", system-ui, sans-serif', headingWeight: "700", bodyWeight: "500", headingSpacing: "-0.02em", bodySpacing: "0", headingTransform: "none", headingLineHeight: "1.05" },
  { name: "Aberta", fontFamily: '"DM Sans", system-ui, sans-serif', headingWeight: "500", bodyWeight: "400", headingSpacing: "0.03em", bodySpacing: "0.02em", headingTransform: "none", headingLineHeight: "1.3" },
  { name: "Contraste", fontFamily: '"Fraunces", Georgia, serif', headingWeight: "900", bodyWeight: "300", headingSpacing: "-0.01em", bodySpacing: "0.01em", headingTransform: "none", headingLineHeight: "1.15" },
];

export type ColorTheme = {
  name: string;
  color: string;
};

export const COLOR_THEMES: ColorTheme[] = [
  { name: "Marron", color: "#8b5a2b" },
  { name: "Preto", color: "#ffffff" },
  { name: "Bege", color: "#c9a27a" },
  { name: "Azul", color: "#3b82f6" },
  { name: "Roxo", color: "#8b5cf6" },
  { name: "Verde", color: "#22c55e" },
  { name: "Vermelho", color: "#ef4444" },
  { name: "Laranja", color: "#f97316" },
  { name: "Cinza", color: "#9ca3af" },
  { name: "Verde Água", color: "#14b8a6" },
  { name: "Rosa", color: "#ec4899" },
  { name: "Azul Claro", color: "#38bdf8" },
];

const KEY = "carousel-brand-v1";

export function loadBrand(): Brand | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...defaultBrand, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function saveBrand(b: Brand) {
  localStorage.setItem(KEY, JSON.stringify(b));
}
