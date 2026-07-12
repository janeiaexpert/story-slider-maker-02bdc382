// Biblioteca de elementos decorativos SVG (transparentes, tint por currentColor).
// Organizados por nicho: Negócios, IA, Geométricos, Mockups.

export type ElementDef = {
  id: string;
  name: string;
  category: "negocios" | "ia" | "geometricos" | "mockups";
  svg: string; // usa currentColor para tint
};

export const ELEMENT_CATEGORIES: { key: ElementDef["category"]; label: string }[] = [
  { key: "negocios", label: "Negócios" },
  { key: "ia", label: "IA" },
  { key: "geometricos", label: "Geométricos" },
  { key: "mockups", label: "Mockups" },
];

// Todos os SVGs usam viewBox 0 0 100 100 e currentColor
export const ELEMENTS: ElementDef[] = [
  // ============ NEGÓCIOS ============
  {
    id: "biz-chart-up",
    name: "Gráfico crescente",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 80 L35 55 L55 68 L90 20"/><path d="M75 20 L90 20 L90 35"/></svg>`,
  },
  {
    id: "biz-bars",
    name: "Barras",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><rect x="15" y="55" width="14" height="35" rx="2"/><rect x="35" y="40" width="14" height="50" rx="2"/><rect x="55" y="25" width="14" height="65" rx="2"/><rect x="75" y="10" width="14" height="80" rx="2"/></svg>`,
  },
  {
    id: "biz-target",
    name: "Alvo",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>`,
  },
  {
    id: "biz-arrow-up",
    name: "Seta up",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 8 L88 46 L68 46 L68 92 L32 92 L32 46 L12 46 Z"/></svg>`,
  },
  {
    id: "biz-coin",
    name: "Moeda",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><circle cx="50" cy="50" r="40"/><text x="50" y="65" text-anchor="middle" font-size="42" font-weight="700" font-family="serif" fill="currentColor" stroke="none">$</text></svg>`,
  },
  {
    id: "biz-briefcase",
    name: "Maleta",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="12" y="30" width="76" height="55" rx="4"/><path d="M38 30 V22 a4 4 0 0 1 4 -4 h16 a4 4 0 0 1 4 4 V30"/><path d="M12 52 H88"/></svg>`,
  },
  {
    id: "biz-handshake",
    name: "Aperto de mão",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 55 L30 40 L50 55 L70 40 L90 55"/><path d="M30 40 L45 60 L55 60 L70 40"/><path d="M10 55 L20 70 M90 55 L80 70"/></svg>`,
  },
  {
    id: "biz-rocket",
    name: "Foguete",
    category: "negocios",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><path d="M50 8 C65 25 70 45 65 65 L35 65 C30 45 35 25 50 8 Z"/><circle cx="50" cy="38" r="6"/><path d="M35 65 L25 82 L40 75 M65 65 L75 82 L60 75"/></svg>`,
  },

  // ============ IA ============
  {
    id: "ai-chip",
    name: "Chip",
    category: "ia",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="25" y="25" width="50" height="50" rx="4"/><rect x="38" y="38" width="24" height="24" rx="2"/><path d="M40 25 V15 M50 25 V15 M60 25 V15 M40 85 V75 M50 85 V75 M60 85 V75 M25 40 H15 M25 50 H15 M25 60 H15 M85 40 H75 M85 50 H75 M85 60 H75"/></svg>`,
  },
  {
    id: "ai-network",
    name: "Rede neural",
    category: "ia",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" stroke-width="2"><line x1="20" y1="25" x2="50" y2="50" stroke="currentColor"/><line x1="20" y1="50" x2="50" y2="50" stroke="currentColor"/><line x1="20" y1="75" x2="50" y2="50" stroke="currentColor"/><line x1="50" y1="50" x2="80" y2="25" stroke="currentColor"/><line x1="50" y1="50" x2="80" y2="50" stroke="currentColor"/><line x1="50" y1="50" x2="80" y2="75" stroke="currentColor"/><circle cx="20" cy="25" r="6"/><circle cx="20" cy="50" r="6"/><circle cx="20" cy="75" r="6"/><circle cx="50" cy="50" r="8"/><circle cx="80" cy="25" r="6"/><circle cx="80" cy="50" r="6"/><circle cx="80" cy="75" r="6"/></svg>`,
  },
  {
    id: "ai-brain",
    name: "Cérebro",
    category: "ia",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><path d="M50 15 C35 15 25 25 25 40 C15 45 15 60 25 65 C25 78 35 88 50 88 C65 88 75 78 75 65 C85 60 85 45 75 40 C75 25 65 15 50 15 Z"/><path d="M50 15 V88 M35 30 Q45 35 50 30 M50 55 Q60 60 65 55 M35 65 Q45 70 50 65"/></svg>`,
  },
  {
    id: "ai-spark",
    name: "Faísca IA",
    category: "ia",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z"/></svg>`,
  },
  {
    id: "ai-prompt",
    name: "Prompt",
    category: "ia",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 25 L30 40 L15 55"/><path d="M40 60 L80 60"/></svg>`,
  },

  // ============ GEOMÉTRICOS ============
  {
    id: "geo-circle",
    name: "Círculo",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="currentColor"/></svg>`,
  },
  {
    id: "geo-ring",
    name: "Anel",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><circle cx="50" cy="50" r="42"/></svg>`,
  },
  {
    id: "geo-square",
    name: "Quadrado",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="currentColor"/></svg>`,
  },
  {
    id: "geo-triangle",
    name: "Triângulo",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 90,85 10,85" fill="currentColor"/></svg>`,
  },
  {
    id: "geo-half-circle",
    name: "Semi-círculo",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100"><path d="M10 50 A40 40 0 0 1 90 50 Z" fill="currentColor"/></svg>`,
  },
  {
    id: "geo-blob",
    name: "Blob",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100"><path d="M50 8 C72 8 92 28 92 50 C92 72 78 92 55 92 C32 92 8 78 8 55 C8 32 28 8 50 8 Z" fill="currentColor"/></svg>`,
  },
  {
    id: "geo-dots-grid",
    name: "Grade de pontos",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100" fill="currentColor"><g><circle cx="20" cy="20" r="3"/><circle cx="40" cy="20" r="3"/><circle cx="60" cy="20" r="3"/><circle cx="80" cy="20" r="3"/><circle cx="20" cy="40" r="3"/><circle cx="40" cy="40" r="3"/><circle cx="60" cy="40" r="3"/><circle cx="80" cy="40" r="3"/><circle cx="20" cy="60" r="3"/><circle cx="40" cy="60" r="3"/><circle cx="60" cy="60" r="3"/><circle cx="80" cy="60" r="3"/><circle cx="20" cy="80" r="3"/><circle cx="40" cy="80" r="3"/><circle cx="60" cy="80" r="3"/><circle cx="80" cy="80" r="3"/></g></svg>`,
  },
  {
    id: "geo-arc",
    name: "Arco fino",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M10 80 A50 50 0 0 1 90 80"/></svg>`,
  },
  {
    id: "geo-line",
    name: "Linha",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100" stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="10" y1="50" x2="90" y2="50"/></svg>`,
  },
  {
    id: "geo-cross",
    name: "Cruz fina",
    category: "geometricos",
    svg: `<svg viewBox="0 0 100 100" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="50" y1="10" x2="50" y2="90"/><line x1="10" y1="50" x2="90" y2="50"/></svg>`,
  },

  // ============ MOCKUPS ============
  {
    id: "mock-phone",
    name: "Celular",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="30" y="8" width="40" height="84" rx="8"/><rect x="35" y="18" width="30" height="60" rx="1" fill="currentColor" fill-opacity="0.15"/><circle cx="50" cy="85" r="2.5" fill="currentColor"/><line x1="45" y1="13" x2="55" y2="13" stroke-width="2"/></svg>`,
  },
  {
    id: "mock-laptop",
    name: "Notebook",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="18" y="22" width="64" height="42" rx="3"/><rect x="24" y="28" width="52" height="30" rx="1" fill="currentColor" fill-opacity="0.12"/><path d="M8 70 H92 L88 78 H12 Z"/></svg>`,
  },
  {
    id: "mock-mug",
    name: "Caneca",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M25 25 H70 V70 a10 10 0 0 1 -10 10 H35 a10 10 0 0 1 -10 -10 Z"/><path d="M70 35 H80 a8 8 0 0 1 8 8 v8 a8 8 0 0 1 -8 8 H70"/><path d="M40 15 Q42 20 40 25 M50 15 Q52 20 50 25"/></svg>`,
  },
  {
    id: "mock-cup",
    name: "Xícara",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M20 35 H72 L68 72 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 Z"/><path d="M72 42 H80 a6 6 0 0 1 6 6 v6 a6 6 0 0 1 -6 6 H70"/><path d="M15 85 H80"/></svg>`,
  },
  {
    id: "mock-notepad",
    name: "Bloco de notas",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="22" y="14" width="52" height="72" rx="3"/><line x1="30" y1="30" x2="66" y2="30"/><line x1="30" y1="42" x2="66" y2="42"/><line x1="30" y1="54" x2="60" y2="54"/><line x1="30" y1="66" x2="50" y2="66"/><path d="M30 8 V20 M42 8 V20 M54 8 V20 M66 8 V20"/></svg>`,
  },
  {
    id: "mock-pen",
    name: "Caneta",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M18 82 L28 72 L70 30 L80 40 L38 82 L28 82 Z"/><path d="M65 35 L75 45"/><path d="M18 82 L26 78"/></svg>`,
  },
  {
    id: "mock-paper",
    name: "Papel",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M22 12 H68 L82 26 V88 H22 Z"/><path d="M68 12 V26 H82"/><line x1="30" y1="42" x2="72" y2="42"/><line x1="30" y1="54" x2="72" y2="54"/><line x1="30" y1="66" x2="60" y2="66"/></svg>`,
  },
  {
    id: "mock-desk",
    name: "Mesa (top view)",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="10" y="20" width="45" height="35" rx="2"/><circle cx="75" cy="30" r="10"/><rect x="15" y="65" width="30" height="20" rx="2"/><path d="M55 68 L80 68 L82 82 L57 82 Z"/><line x1="60" y1="72" x2="78" y2="72"/></svg>`,
  },
  {
    id: "mock-lightbulb",
    name: "Lâmpada",
    category: "mockups",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M50 12 C34 12 25 24 25 38 C25 48 30 55 38 62 V72 H62 V62 C70 55 75 48 75 38 C75 24 66 12 50 12 Z"/><line x1="40" y1="78" x2="60" y2="78"/><line x1="42" y1="84" x2="58" y2="84"/></svg>`,
  },
];

export function elementsByCategory(cat: ElementDef["category"]): ElementDef[] {
  return ELEMENTS.filter((e) => e.category === cat);
}

export function findElement(id: string): ElementDef | undefined {
  return ELEMENTS.find((e) => e.id === id);
}
