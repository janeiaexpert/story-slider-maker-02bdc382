export type Brand = {
  niche: string;
  audience: string;
  tone: "autoridade" | "proximo" | "provocador" | "didatico";
  goal: "autoridade" | "conversao" | "educacao" | "viralizacao";
  handle: string;
  author: string;
  primaryColor: string;
  bgColor: string;
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
};

export const BRAND_PALETTES: { name: string; primary: string; bg: string }[] = [
  { name: "Marrom & Preto", primary: "#8b5a2b", bg: "#0a0a0a" },
  { name: "Marrom & Branco", primary: "#6b3a1d", bg: "#f5f1ea" },
  { name: "Bege & Preto", primary: "#c9a27a", bg: "#111111" },
  { name: "Preto & Branco", primary: "#ffffff", bg: "#0a0a0a" },
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
