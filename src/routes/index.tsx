import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  Settings2,
  Plus,
  Download,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Circle,
  Palette,
  FileDown,
  Type,
  Shapes,
  Layout,
  X,
} from "lucide-react";
import { generateCarousel, generateCaption } from "@/lib/carousel.functions";
import {
  type Brand,
  BRAND_PALETTES,
  DESIGN_STYLES,
  type DesignStyle,
  FONT_PAIRS,
  type FontPair,
  defaultBrand,
  loadBrand,
  saveBrand,
} from "@/lib/brand-storage";
import {
  type SavedCarousel,
  deleteCarousel,
  loadLibrary,
  newId,
  upsertCarousel,
  saveBrandToCloud,
  loadBrandFromCloud,
} from "@/lib/carousel-library";
import { supabase } from "@/integrations/supabase/client";
import { Save, FolderOpen, Trash2, Minimize2, Maximize2, MessageSquareText, Share2 } from "lucide-react";
import {
  ELEMENTS,
  ELEMENT_CATEGORIES,
  type ElementDef,
  elementsByCategory,
  findElement,
} from "@/lib/elements-library";
import { getSpaceId, shareUrl } from "@/lib/space-id";

export const Route = createFileRoute("/")({
  component: Index,
});

export type SlideElement = {
  id: string; // instance id
  svgId: string; // ref to ELEMENTS
  x: number; // 0-100 (% do card)
  y: number; // 0-100
  scale: number; // 0.2 - 2
  rotation: number; // -180..180
  opacity: number; // 0..1
  color: string;
};

type Slide = {
  kicker: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonCaption: string;
  handle: string;
  author: string;
  image: string | null;
  align: "top" | "center" | "bottom";
  gradient: "top" | "bottom" | "left" | "right";
  gradientIntensity: number;
  buttonPosition: "inline" | "bottom";
  imagePos: "top" | "center" | "bottom";
  titleColor?: string;
  subtitleColor?: string;
  kickerColor?: string;
  highlightColor?: string;
  titleScale?: number; // 0.7 - 1.6
  subtitleScale?: number;
  layout?: "overlay" | "image-left" | "image-right";
  elements?: SlideElement[];
};

function migrateSlide(d: Partial<Slide>): Slide {
  return {
    kicker: d.kicker ?? "",
    title: d.title ?? "",
    subtitle: d.subtitle ?? "",
    buttonText: d.buttonText ?? "",
    buttonCaption: d.buttonCaption ?? "",
    handle: d.handle ?? "",
    author: d.author ?? "",
    image: d.image ?? null,
    align: d.align ?? "bottom",
    gradient: d.gradient ?? "bottom",
    gradientIntensity: d.gradientIntensity ?? 70,
    buttonPosition: d.buttonPosition ?? "inline",
    imagePos: d.imagePos ?? "center",
    titleColor: d.titleColor,
    subtitleColor: d.subtitleColor,
    kickerColor: d.kickerColor,
    highlightColor: d.highlightColor,
    titleScale: d.titleScale ?? 1,
    subtitleScale: d.subtitleScale ?? 1,
    layout: d.layout ?? "overlay",
    elements: d.elements ?? [],
  };
}

// Renderiza texto com **palavra** destacada em cor de marcador.
function renderRich(text: string, highlight: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <span key={i} style={{ color: highlight, fontWeight: 700 }}>
          {m[1]}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

const STORAGE_KEY = "carousel-creator-v1";

const DIR_MAP: Record<Slide["gradient"], string> = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
};

function gradientFor(dir: Slide["gradient"], intensity: number) {
  const a = Math.max(0, Math.min(1, intensity / 100));
  // Gradiente unidirecional: transparente do lado oposto, preto forte na direção escolhida.
  return `linear-gradient(${DIR_MAP[dir]}, rgba(0,0,0,0) 0%, rgba(0,0,0,${(a * 0.45).toFixed(2)}) 55%, rgba(0,0,0,${a.toFixed(2)}) 100%)`;
}

function sanitizeTitle(t: string) {
  return t
    .replace(/\\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function blankSlides(brand: Brand): Slide[] {
  return Array.from({ length: 8 }, () =>
    migrateSlide({
      handle: brand.handle,
      author: brand.author,
    }),
  );
}

function Index() {
  const [brand, setBrand] = useState<Brand>(defaultBrand);
  const [brandReady, setBrandReady] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [alignFlash, setAlignFlash] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [view, setView] = useState<"insight" | "editor">("insight");
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [slides, setSlides] = useState<Slide[]>(blankSlides(defaultBrand));
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string>("");
  const [library, setLibrary] = useState<SavedCarousel[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const [compact, setCompact] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const generateFn = useServerFn(generateCarousel);

  // Boot
  useEffect(() => {
    const b = loadBrand();
    if (b) {
      setBrand(b);
      setBrandReady(true);
    }
    loadBrandFromCloud().then((cloud) => {
      if (cloud) {
        const merged = { ...(b ?? defaultBrand), ...(cloud as Partial<Brand>) };
        setBrand(merged);
        saveBrand(merged);
        setBrandReady(true);
      } else if (!b) {
        setShowBrand(true);
      }
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length === 8) {
          setSlides(data.map((d: Partial<Slide>) => migrateSlide(d)));
          setView("editor");
        }
      } catch {}
    }
    setCompact(localStorage.getItem("carousel-compact-v1") === "1");
    loadLibrary().then(setLibrary);
  }, []);

  useEffect(() => {
    localStorage.setItem("carousel-compact-v1", compact ? "1" : "0");
  }, [compact]);

  useEffect(() => {
    if (brandReady) {
      saveBrand(brand);
      saveBrandToCloud(brand);
    }
  }, [brand, brandReady]);

  useEffect(() => {
    const space = getSpaceId();
    const channel = supabase
      .channel(`space:${space}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carousels", filter: `space_id=eq.${space}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setLibrary(await loadLibrary());
            return;
          }
          const row = payload.new as { id: string; slides: unknown[] };
          if (row.id === "__brand__") {
            const cloud = Array.isArray(row.slides) ? row.slides[0] : null;
            if (cloud) {
              setBrand((prev) => ({ ...prev, ...(cloud as Partial<Brand>) }));
              saveBrand({ ...loadBrand()!, ...(cloud as Partial<Brand>) });
            }
          } else {
            setLibrary(await loadLibrary());
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const refreshLibrary = async () => setLibrary(await loadLibrary());

  const handleSaveCarousel = async () => {
    const name =
      currentName.trim() ||
      slides[0]?.title?.split("\n")[0]?.slice(0, 60) ||
      "Carrossel sem nome";
    const id = currentId ?? newId();
    const now = Date.now();
    const item: SavedCarousel = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      slides,
    };
    const next = await upsertCarousel(item);
    setLibrary(next);
    setCurrentId(id);
    setCurrentName(name);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleLoadCarousel = (item: SavedCarousel) => {
    const data = (item.slides as Partial<Slide>[]).map((d) => migrateSlide(d));
    setSlides(data);
    setCurrentId(item.id);
    setCurrentName(item.name);
    setActive(0);
    setView("editor");
    setShowLibrary(false);
  };

  const handleDeleteCarousel = async (id: string) => {
    const next = await deleteCarousel(id);
    setLibrary(next);
    if (currentId === id) {
      setCurrentId(null);
      setCurrentName("");
    }
  };

  useEffect(() => {
    if (view === "editor") localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
  }, [slides, view]);

  const update = (patch: Partial<Slide>) => {
    setSlides((s) => s.map((sl, i) => (i === active ? { ...sl, ...patch } : sl)));
  };

  const onImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update({ image: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (insight.trim().length < 10) {
      setError("Cole um insight com pelo menos 10 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateFn({
        data: {
          insight: insight.trim(),
          brand: {
            niche: brand.niche,
            audience: brand.audience,
            tone: brand.tone,
            goal: brand.goal,
            handle: brand.handle,
            author: brand.author,
          },
        },
      });
      const next: Slide[] = result.slides.map((s, i) =>
        migrateSlide({
          kicker: s.kicker,
          title: sanitizeTitle(s.title),
          subtitle: s.subtitle,
          buttonText: s.buttonText,
          buttonCaption: s.buttonCaption,
          handle: brand.handle,
          author: brand.author,
          align: s.align,
          buttonPosition: i === 7 ? "bottom" : "inline",
        }),
      );
      setSlides(next);
      setActive(0);
      setCurrentId(null);
      setCurrentName("");
      setView("editor");
    } catch (e: any) {
      console.error("CAROUSEL ERROR:", e);
      const msg = String(e?.message || e);
      if (msg.includes("429")) setError("Limite de uso atingido. Tente novamente em alguns segundos.");
      else if (msg.includes("402")) setError("Créditos esgotados. Adicione créditos no workspace.");
      else setError(`Falha ao gerar carrossel: ${msg.slice(0, 200)}`);
    } finally {
      setLoading(false);
    }
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const savePng = async (dataUrl: string, filename: string) => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("savePng", e);
    }
  };

  const waitForRender = async (el: HTMLElement) => {
    await document.fonts.ready;
    const imgs = el.querySelectorAll("img");
    await Promise.all(
      [...imgs].map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }),
    );
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  };

  const capturePng = async (el: HTMLElement): Promise<string> => {
    await waitForRender(el);
    try {
      return await toPng(el, { pixelRatio: 2, cacheBust: true });
    } catch {
      // Safari fallback: use toSvg then convert
      const { toSvg } = await import("html-to-image");
      const svg = await toSvg(el, { pixelRatio: 2, cacheBust: true });
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d")!.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = svg;
      });
    }
  };

  const exportSlide = async (idx?: number) => {
    const i = idx ?? active;
    if (i !== active) setActive(i);
    await new Promise((r) => setTimeout(r, 300));
    if (!slideRef.current) return;
    const dataUrl = await capturePng(slideRef.current);
    await savePng(dataUrl, `slide-${i + 1}.png`);
    setSaved(i);
    setTimeout(() => setSaved(null), 1500);
  };

  const downloadPng = async (dataUrl: string, filename: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const prevActive = active;
      for (let i = 0; i < slides.length; i++) {
        setActive(i);
        await new Promise((r) => setTimeout(r, 300));
        if (!slideRef.current) continue;
        const dataUrl = await capturePng(slideRef.current);
        await downloadPng(dataUrl, `slide-${i + 1}.png`);
        await new Promise((r) => setTimeout(r, 350));
      }
      setActive(prevActive);
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      // PDF page in mm matching 1080x1350 (4:5)
      const pageW = 108;
      const pageH = 135;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, pageH] });
      const prevActive = active;
      for (let i = 0; i < slides.length; i++) {
        setActive(i);
        // Wait two frames + a tick for layout/images to settle
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 250));
        if (!slideRef.current) continue;
        const dataUrl = await capturePng(slideRef.current);
        if (i > 0) pdf.addPage([pageW, pageH], "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      setActive(prevActive);
      const fname = (currentName.trim() || "carrossel").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
      pdf.save(`${fname || "carrossel"}.pdf`);
    } catch (e) {
      console.error(e);
      setError("Falha ao gerar PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const newCarousel = () => {
    setInsight("");
    setError(null);
    setCurrentId(null);
    setCurrentName("");
    setView("insight");
  };

  const s = slides[active];
  const GOLD = brand.primaryColor;
  const BG = brand.bgColor;
  const alignClass =
    s.align === "top"
      ? "justify-start pt-16"
      : s.align === "center"
      ? "justify-center"
      : "justify-end pb-12";

  return (
    <div className={`min-h-screen text-white ${compact ? "text-[13px]" : ""}`} style={{ background: "#111" }}>
      <div className={`mx-auto max-w-7xl px-3 ${compact ? "py-3" : "px-4 py-6 lg:py-10"}`}>
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-[0.25em] uppercase" style={{ color: GOLD }}>
              Fábrica de Carrosséis
            </div>
            <h1 className="text-xl font-semibold">
              {view === "insight" ? "Cole um insight → IA gera o carrossel" : `${brand.handle} · 8 slides`}
            </h1>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
            <button
              onClick={() => setCompact((c) => !c)}
              title={compact ? "Modo normal" : "Modo compacto"}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"
            >
              {compact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            {view === "editor" && (
              <button
                onClick={() => setShowCaption(true)}
                title="Gerar legenda para Instagram"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Legenda</span>
              </button>
            )}
            <button
              onClick={() => {
                refreshLibrary();
                setShowLibrary(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Biblioteca</span>
              {library.length > 0 && (
                <span className="ml-0.5 rounded-full bg-white/10 px-1.5 text-[10px]">
                  {library.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowStyles(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Estilos</span>
            </button>
            <button
              onClick={() => setShowBrand(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marca</span>
            </button>
            {view === "editor" && (
              <>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Criar um novo carrossel? O atual continua na Biblioteca se você já clicou em Salvar.",
                      )
                    ) {
                      newCarousel();
                    }
                  }}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Novo</span>
                </button>
                <button
                  onClick={handleSaveCarousel}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {savedFlash ? "Salvo!" : currentId ? "Atualizar" : "Salvar"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const url = shareUrl(getSpaceId());
                    navigator.clipboard.writeText(url).then(() => {
                      setShareFlash(true);
                      setTimeout(() => setShareFlash(false), 2000);
                    });
                  }}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                  title="Copiar link para sincronizar com outro dispositivo"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{shareFlash ? "Copiado!" : "Sincronizar"}</span>
                </button>
                <button
                  onClick={exportAll}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PNGs</span>
                </button>
                <button
                  onClick={exportPdf}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-60 sm:px-4 sm:text-sm"
                  style={{ background: GOLD, color: "#111" }}
                >
                  <FileDown className="h-4 w-4" />
                  {exporting ? "Gerando…" : "PDF"}
                </button>
              </>
            )}
          </div>
        </header>

        {view === "editor" && (
          <div className="mb-4 flex items-center gap-2 text-xs text-white/60">
            <span className="uppercase tracking-wider">Nome:</span>
            <input
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="Dê um nome ao carrossel (ex: lançamento agosto)"
              className="flex-1 max-w-md rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
            />
            {currentId && <span className="text-white/40">· salvo</span>}
          </div>
        )}

        {view === "insight" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <label className="mb-2 block text-xs tracking-wider uppercase text-white/50">
                Seu insight bruto
              </label>
              <textarea
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder="Cole aqui um insight, ideia solta, anotação, trecho de artigo, tweet ou raciocínio. A IA extrai o ângulo e monta o carrossel."
                rows={10}
                className="w-full resize-y rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-white outline-none focus:border-[color:var(--g)]"
                style={{ ["--g" as any]: GOLD } as React.CSSProperties}
              />
              {!brandReady && (
                <p className="mt-3 text-xs text-amber-400">
                  Configure sua marca primeiro para a IA aplicar tom e contexto certos.
                </p>
              )}
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="mt-4 w-full rounded-lg py-3 text-sm font-bold disabled:opacity-50"
                style={{ background: GOLD, color: "#111" }}
              >
                {loading ? (
                  "Gerando carrossel…"
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" /> Gerar carrossel
                  </span>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-white/40">
                A IA estrutura gancho, narrativa, virada e CTA aplicando seu branding.
              </p>
            </div>
          </div>
        )}

        {view === "editor" && (
          <div className="grid gap-4 md:grid-cols-[72px_1fr_280px] lg:grid-cols-[96px_1fr_360px]">
            {/* Rail de slides (PowerPoint) */}
            <div className="hidden md:block md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
              <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/10">
                {slides.map((sl, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`relative flex items-center gap-2 rounded-md border-2 p-1 text-left transition ${
                      i === active ? "border-[color:var(--g)]" : "border-white/10 hover:border-white/30"
                    }`}
                    style={{ ["--g" as any]: GOLD } as React.CSSProperties}
                  >
                    <span className="text-[10px] font-bold text-white/50 w-4 text-center">{i + 1}</span>
                    <span
                      className="flex-1 aspect-[1080/1350] rounded-sm overflow-hidden text-[7px] leading-tight px-1 py-1"
                      style={{ background: BG, color: "white" }}
                    >
                      <span className="line-clamp-3 opacity-80">{sl.title || sl.kicker}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div
              className={`flex flex-col items-center md:sticky md:top-4 md:self-start md:pb-0 ${
                editorOpen ? "min-h-[46vh] pb-0 md:min-h-0" : "pb-24"
              }`}
            >
              <div
                className={`w-full max-w-[420px] ${
                  editorOpen
                    ? "max-md:fixed max-md:top-1 max-md:left-1/2 max-md:z-30 max-md:w-[200px] max-md:-translate-x-1/2"
                    : ""
                }`}
              >
                <div
                  className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
                  style={{ aspectRatio: "1080 / 1350" }}
                >
                  <div
                    ref={slideRef}
                    className={`absolute inset-0 flex flex-col ${editorOpen ? "card-preview-compact-mobile" : ""}`}
                    style={{ background: BG, color: "white" }}
                  >
                    {(() => {
                      const layout = s.layout ?? "overlay";
                      const hasImg = !!s.image;
                      const split = hasImg && layout !== "overlay";
                      const imageSide = layout === "image-left" ? "left" : "right";
                      const objPos = `center ${s.imagePos === "top" ? "0%" : s.imagePos === "bottom" ? "100%" : "50%"}`;
                      const titleScale = s.titleScale ?? 1;
                      const subScale = s.subtitleScale ?? 1;
                      const bodyFont = brand.fontBody ?? "Inter, system-ui, sans-serif";
                      return (
                        <>
                          {/* Camada de imagem */}
                           {hasImg && !split && (
                             <img
                               src={s.image!}
                               alt=""
                               className="absolute inset-0 h-full w-full object-cover"
                              style={{ objectPosition: objPos }}
                            />
                          )}
                          {hasImg && !split && (
                            <div
                              className="absolute inset-0"
                              style={{ background: gradientFor(s.gradient, s.gradientIntensity) }}
                            />
                          )}
                          {hasImg && split && (
                            <div
                              className={`absolute inset-y-0 w-1/2 ${imageSide === "left" ? "left-0" : "right-0"}`}
                            >
                               <img
                                 src={s.image!}
                                 alt=""
                                 className="h-full w-full object-cover"
                                style={{ objectPosition: objPos }}
                              />
                            </div>
                          )}

                          {/* Elementos decorativos */}
                          {(s.elements ?? []).map((el) => {
                            const def = findElement(el.svgId);
                            if (!def) return null;
                            return (
                              <div
                                key={el.id}
                                className="pointer-events-none absolute"
                                style={{
                                  left: `${el.x}%`,
                                  top: `${el.y}%`,
                                  width: `${18 * el.scale}%`,
                                  aspectRatio: "1 / 1",
                                  transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                                  opacity: el.opacity,
                                  color: el.color,
                                }}
                                dangerouslySetInnerHTML={{ __html: def.svg }}
                              />
                            );
                          })}

                          {/* Container do texto */}
                          <div
                            className={`relative z-10 flex h-full flex-col ${
                              split
                                ? `w-1/2 px-6 ${imageSide === "left" ? "ml-auto" : "mr-auto"}`
                                : "w-full px-7"
                            } ${s.buttonText && s.buttonPosition === "bottom" ? "pb-44" : "pb-20"} ${alignClass}`}
                          >
                            <div>
                              <div
                                className="font-bold tracking-[0.28em]"
                                style={{
                                  color: s.kickerColor ?? GOLD,
                                  fontSize: 11 * titleScale,
                                  fontFamily: bodyFont,
                                }}
                              >
                                {s.kicker}
                              </div>
                              <h2
                                className="mt-3 whitespace-pre-line font-bold"
                                style={{
                                  fontFamily: brand.fontFamily,
                                  color: s.titleColor ?? "#ffffff",
                                  letterSpacing: "-0.01em",
                                  wordSpacing: "normal",
                                  fontSize: 28 * titleScale,
                                  lineHeight: 1.1,
                                }}
                              >
                                {renderRich(s.title, s.highlightColor ?? GOLD)}
                              </h2>
                              {s.subtitle && (
                                <p
                                  className="mt-3 leading-snug"
                                  style={{
                                    color: s.subtitleColor ?? "rgba(255,255,255,0.8)",
                                    fontSize: 13 * subScale,
                                    fontFamily: bodyFont,
                                  }}
                                >
                                  {renderRich(s.subtitle, s.highlightColor ?? GOLD)}
                                </p>
                              )}
                              {s.buttonText && s.buttonPosition === "inline" && (
                                <div className="mt-5">
                                  <div
                                    className="w-full rounded-md py-3 text-center text-[13px] font-bold"
                                    style={{ background: GOLD, color: "#111", fontFamily: bodyFont }}
                                  >
                                    {s.buttonText}
                                  </div>
                                  {s.buttonCaption && (
                                    <div
                                      className="mt-2 text-center text-[11px] text-white/60"
                                      style={{ fontFamily: bodyFont }}
                                    >
                                      {s.buttonCaption}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {s.buttonText && s.buttonPosition === "bottom" && (
                            <div
                              className={`absolute bottom-16 z-10 ${
                                split
                                  ? `w-1/2 px-6 ${imageSide === "left" ? "right-0" : "left-0"}`
                                  : "right-0 left-0 px-7"
                              }`}
                            >
                              <div
                                className="w-full rounded-md py-3 text-center text-[13px] font-bold"
                                style={{ background: GOLD, color: "#111", fontFamily: bodyFont }}
                              >
                                {s.buttonText}
                              </div>
                              {s.buttonCaption && (
                                <div
                                  className="mt-2 text-center text-[11px] text-white/60"
                                  style={{ fontFamily: bodyFont }}
                                >
                                  {s.buttonCaption}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer fixo */}
                          <div className="absolute right-0 bottom-0 left-0 z-10 px-7 pb-5">
                            <div
                              className="flex items-center justify-between text-[11px] text-white/70"
                              style={{ fontFamily: bodyFont }}
                            >
                              <span>
                                {s.handle} · {s.author}
                              </span>
                              <span>{active + 1}/8</span>
                            </div>
                            <div
                              className="mt-2 h-[3px] w-full rounded-full"
                              style={{
                                background: `linear-gradient(to right, ${GOLD} ${
                                  ((active + 1) / 8) * 100
                                }%, rgba(255,255,255,0.15) ${((active + 1) / 8) * 100}%)`,
                              }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className={`mt-6 w-full grid-cols-8 gap-2 md:hidden ${editorOpen ? "hidden" : "grid"}`}>

                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`aspect-[1080/1350] rounded-md border-2 text-xs font-bold transition ${
                      i === active ? "border-[color:var(--g)]" : "border-white/10 hover:border-white/30"
                    }`}
                    style={
                      {
                        background: BG,
                        color: i === active ? GOLD : "rgba(255,255,255,0.5)",
                        ["--g" as any]: GOLD,
                      } as React.CSSProperties
                    }
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className={`mt-4 w-full max-w-[420px] gap-2 ${editorOpen ? "hidden md:flex" : "flex"}`}>
                <button
                  onClick={() => setActive((a) => Math.max(0, a - 1))}
                  disabled={active === 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/5 py-3 text-sm font-semibold disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <button
                  onClick={() => setActive((a) => Math.min(7, a + 1))}
                  disabled={active === 7}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/5 py-3 text-sm font-semibold disabled:opacity-30"
                >
                  Próximo <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => exportSlide()}
                className={`mt-2 w-full max-w-[420px] items-center justify-center gap-2 rounded-md py-3 text-sm font-bold ${
                  editorOpen ? "hidden md:inline-flex" : "inline-flex"
                }`}
                style={{ background: GOLD, color: "#111" }}
              >
                <Download className="h-4 w-4" /> Salvar slide {active + 1}
              </button>
              {saved === active && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60">
                  <Check className="h-3.5 w-3.5" /> Slide {active + 1} salvo!
                </div>
              )}
            </div>

            {/* Editor */}
            <aside
              className={`bg-[#161616] ring-1 ring-white/10 md:rounded-xl md:bg-white/[0.03] md:p-5 md:static md:max-h-none md:overflow-visible md:z-auto fixed left-0 right-0 bottom-0 z-40 rounded-t-2xl p-4 shadow-2xl transition-[max-height] duration-300 ${
                editorOpen ? "max-h-[54vh] overflow-y-auto" : "max-h-[52px] overflow-hidden"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">
                  Editar slide {active + 1}
                </h2>
                <button
                  onClick={() => setEditorOpen((o) => !o)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 md:hidden"
                  aria-label={editorOpen ? "Encolher edição" : "Expandir edição"}
                >
                  {editorOpen ? <><Minimize2 className="h-3.5 w-3.5" /> Encolher</> : <><Maximize2 className="h-3.5 w-3.5" /> Expandir</>}
                </button>
              </div>
              <div className={editorOpen ? "" : "hidden md:block"}>

              <Field label="Kicker">
                <input
                  value={s.kicker}
                  onChange={(e) => update({ kicker: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Título (Enter quebra linha)">
                <textarea
                  value={s.title}
                  onChange={(e) => update({ title: e.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </Field>

              <Field label="Subtítulo">
                <textarea
                  value={s.subtitle}
                  onChange={(e) => update({ subtitle: e.target.value })}
                  rows={2}
                  className={inputCls}
                />
              </Field>

              <Field label="Cores do texto · marque palavras com **palavra**">
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { k: "kickerColor", l: "Kicker", d: GOLD },
                    { k: "titleColor", l: "Título", d: "#ffffff" },
                    { k: "subtitleColor", l: "Subtítulo", d: "#cccccc" },
                    { k: "highlightColor", l: "Marcador", d: GOLD },
                  ] as const).map((c) => (
                    <label key={c.k} className="flex flex-col items-center gap-1">
                      <input
                        type="color"
                        value={(s[c.k] as string | undefined) ?? c.d}
                        onChange={(e) => update({ [c.k]: e.target.value } as Partial<Slide>)}
                        className="h-8 w-full cursor-pointer rounded bg-transparent"
                      />
                      <span className="text-[10px] text-white/60">{c.l}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Texto do botão (vazio = sem botão)">
                <input
                  value={s.buttonText}
                  onChange={(e) => update({ buttonText: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Legenda do botão">
                <input
                  value={s.buttonCaption}
                  onChange={(e) => update({ buttonCaption: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="@handle">
                  <input
                    value={s.handle}
                    onChange={(e) => update({ handle: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Autor">
                  <input
                    value={s.author}
                    onChange={(e) => update({ author: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Alinhamento">
                <div className="flex gap-2">
                  {(["top", "center", "bottom"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => update({ align: a })}
                      className={`flex-1 rounded-md py-2 text-xs font-semibold capitalize ${
                        s.align === a ? "bg-white text-black" : "bg-white/5 text-white/70"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSlides((prev) => prev.map((sl) => ({ ...sl, align: s.align })));
                      setAlignFlash(true);
                      setTimeout(() => setAlignFlash(false), 800);
                    }}
                    className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-200 ${
                      alignFlash ? "bg-green-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {alignFlash ? "✓ Pronto!" : "Alinhar todos"}
                  </button>
                </div>
              </Field>

              <Field label="Posição do botão">
                <div className="flex gap-2">
                  {(
                    [
                      { v: "inline", l: "Junto ao texto" },
                      { v: "bottom", l: "Rodapé do card" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => update({ buttonPosition: opt.v })}
                      className={`flex-1 rounded-md py-2 text-xs font-semibold ${
                        s.buttonPosition === opt.v ? "bg-white text-black" : "bg-white/5 text-white/70"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Gradiente (direção)">
                <div className="grid grid-cols-4 gap-2">
                  {(["top", "bottom", "left", "right"] as const).map((g) => {
                    const Icon =
                      g === "top" ? ArrowUp : g === "bottom" ? ArrowDown : g === "left" ? ArrowLeft : ArrowRight;
                    return (
                      <button
                        key={g}
                        onClick={() => update({ gradient: g })}
                        className={`inline-flex items-center justify-center gap-1 rounded-md py-2 text-xs font-semibold capitalize ${
                          s.gradient === g ? "bg-white text-black" : "bg-white/5 text-white/70"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {g}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={`Intensidade do gradiente · ${s.gradientIntensity}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={s.gradientIntensity}
                  onChange={(e) => update({ gradientIntensity: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </Field>

              <Field label="Foto de fundo">
                <label className="block cursor-pointer rounded-md bg-white/5 px-3 py-2 text-center text-xs text-white/70 hover:bg-white/10">
                  {s.image ? "Trocar foto" : "Enviar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])}
                  />
                </label>
                {s.image && (
                  <button
                    onClick={() => update({ image: null })}
                    className="mt-2 w-full text-xs text-white/50 hover:text-white"
                  >
                    remover foto
                  </button>
                )}
                {s.image && (
                  <div className="mt-3">
                    <div className="mb-1 text-[11px] tracking-wider uppercase text-white/50">
                      Enquadramento vertical
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["top", "center", "bottom"] as const).map((p) => {
                        const Icon = p === "top" ? ArrowUp : p === "bottom" ? ArrowDown : Circle;
                        const label = p === "top" ? "topo" : p === "bottom" ? "base" : "centro";
                        return (
                          <button
                            key={p}
                            onClick={() => update({ imagePos: p })}
                            className={`inline-flex items-center justify-center gap-1 rounded-md py-2 text-xs font-semibold ${
                              s.imagePos === p ? "bg-white text-black" : "bg-white/5 text-white/70"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Field>

              <Field label={`Tamanho do título · ${Math.round((s.titleScale ?? 1) * 100)}%`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => update({ titleScale: Math.max(0.7, (s.titleScale ?? 1) - 0.1) })}
                    className="rounded bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                    aria-label="Diminuir título"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0.7}
                    max={1.6}
                    step={0.05}
                    value={s.titleScale ?? 1}
                    onChange={(e) => update({ titleScale: Number(e.target.value) })}
                    className="flex-1 accent-white"
                  />
                  <button
                    onClick={() => update({ titleScale: Math.min(1.6, (s.titleScale ?? 1) + 0.1) })}
                    className="rounded bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                    aria-label="Aumentar título"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Field>

              <Field label={`Tamanho do subtítulo · ${Math.round((s.subtitleScale ?? 1) * 100)}%`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => update({ subtitleScale: Math.max(0.7, (s.subtitleScale ?? 1) - 0.1) })}
                    className="rounded bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                    aria-label="Diminuir subtítulo"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0.7}
                    max={1.6}
                    step={0.05}
                    value={s.subtitleScale ?? 1}
                    onChange={(e) => update({ subtitleScale: Number(e.target.value) })}
                    className="flex-1 accent-white"
                  />
                  <button
                    onClick={() => update({ subtitleScale: Math.min(1.6, (s.subtitleScale ?? 1) + 0.1) })}
                    className="rounded bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
                    aria-label="Aumentar subtítulo"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Field>

              <Field label="Layout do card">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: "overlay", l: "Sobreposto" },
                      { v: "image-left", l: "Foto esq." },
                      { v: "image-right", l: "Foto dir." },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => update({ layout: opt.v })}
                      className={`rounded-md py-2 text-xs font-semibold ${
                        (s.layout ?? "overlay") === opt.v
                          ? "bg-white text-black"
                          : "bg-white/5 text-white/70"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
                {!s.image && (s.layout ?? "overlay") !== "overlay" && (
                  <p className="mt-1 text-[10px] text-white/40">Envie uma foto para o layout dividido aparecer.</p>
                )}
              </Field>

              <Field label={`Elementos decorativos${s.elements?.length ? ` · ${s.elements.length}` : ""}`}>
                <button
                  onClick={() => setShowElements(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  <Shapes className="h-3.5 w-3.5" /> Abrir biblioteca
                </button>
                </Field>
              </div>
            </aside>
          </div>
        )}
      </div>

      {showBrand && (
        <BrandDialog
          initial={brand}
          onClose={() => brandReady && setShowBrand(false)}
          onSave={(b) => {
            saveBrand(b);
            setBrand(b);
            setBrandReady(true);
            setShowBrand(false);
          }}
        />
      )}
      {showLibrary && (
        <LibraryDialog
          items={library}
          currentId={currentId}
          onLoad={handleLoadCarousel}
          onDelete={handleDeleteCarousel}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {showStyles && (
        <StylesDialog
          current={brand}
          onClose={() => setShowStyles(false)}
          onPick={(style) => {
            const next: Brand = {
              ...brand,
              fontFamily: style.fontFamily,
              primaryColor: style.primaryColor,
              bgColor: style.bgColor,
            };
            saveBrand(next);
            setBrand(next);
            setShowStyles(false);
          }}
        />
      )}
      {showCaption && (
        <CaptionDialog
          slides={slides}
          brand={brand}
          onClose={() => setShowCaption(false)}
        />
      )}
      {showElements && (
        <ElementsDialog
          slide={s}
          onChange={(patch: Partial<Slide>) => update(patch)}
          onClose={() => setShowElements(false)}
        />
      )}
    </div>
  );
}

function BrandDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: Brand;
  onSave: (b: Brand) => void;
  onClose: () => void;
}) {
  const [b, setB] = useState<Brand>(initial);
  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => setB((s) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-[#161616] p-6 ring-1 ring-white/10 sm:p-8">
        <h2 className="mb-1 text-lg font-bold">Sua marca</h2>
        <p className="mb-5 text-xs text-white/50">
          A IA usa essas informações para escrever no seu tom e aplicar seu visual.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Nicho">
            <input
              value={b.niche}
              onChange={(e) => set("niche", e.target.value)}
              placeholder="ex: IA para empresas"
              className={inputCls}
            />
          </Field>
          <Field label="Público-alvo">
            <input
              value={b.audience}
              onChange={(e) => set("audience", e.target.value)}
              placeholder="ex: donos de PMEs"
              className={inputCls}
            />
          </Field>
          <Field label="@handle">
            <input value={b.handle} onChange={(e) => set("handle", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Autor">
            <input value={b.author} onChange={(e) => set("author", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tom de voz">
            <select
              value={b.tone}
              onChange={(e) => set("tone", e.target.value as Brand["tone"])}
              className={inputCls}
            >
              <option value="autoridade">Autoridade</option>
              <option value="proximo">Próximo</option>
              <option value="provocador">Provocador</option>
              <option value="didatico">Didático</option>
            </select>
          </Field>
          <Field label="Objetivo">
            <select
              value={b.goal}
              onChange={(e) => set("goal", e.target.value as Brand["goal"])}
              className={inputCls}
            >
              <option value="autoridade">Autoridade</option>
              <option value="conversao">Conversão</option>
              <option value="educacao">Educação</option>
              <option value="viralizacao">Viralização</option>
            </select>
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <div className="mb-1 text-[11px] tracking-wider uppercase text-white/50">
              Paleta sugerida
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BRAND_PALETTES.map((p) => {
                const active = b.primaryColor === p.primary && b.bgColor === p.bg;
                return (
                  <button
                    key={p.name}
                    onClick={() => setB((s) => ({ ...s, primaryColor: p.primary, bgColor: p.bg }))}
                    className={`flex flex-col items-stretch overflow-hidden rounded-md border text-[10px] font-semibold transition ${
                      active ? "border-white" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex h-8">
                      <div className="flex-1" style={{ background: p.bg }} />
                      <div className="flex-1" style={{ background: p.primary }} />
                    </div>
                    <div className="px-1 py-1 text-white/70">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Cor primária">
            <input
              type="color"
              value={b.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/40"
            />
          </Field>
          <Field label="Cor de fundo">
            <input
              type="color"
              value={b.bgColor}
              onChange={(e) => set("bgColor", e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/40"
            />
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <div className="mb-1 text-[11px] tracking-wider uppercase text-white/50">
              Tipografia
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FONT_PAIRS.map((fp) => {
                const active = b.fontFamily === fp.heading && b.fontBody === fp.body;
                return (
                  <button
                    key={fp.name}
                    onClick={() => setB((s) => ({ ...s, fontFamily: fp.heading, fontBody: fp.body }))}
                    className={`rounded-md border p-2 text-left text-[11px] transition ${
                      active ? "border-white bg-white/5" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="truncate font-bold text-white" style={{ fontFamily: fp.heading }}>
                      {fp.name}
                    </div>
                    <div className="truncate text-[10px] text-white/50" style={{ fontFamily: fp.body }}>
                      {fp.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(b)}
            className="rounded-md px-4 py-2 text-sm font-bold"
            style={{ background: b.primaryColor, color: "#111" }}
          >
            Salvar marca
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#c2a25b]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-[11px] tracking-wider uppercase text-white/50">{label}</div>
      {children}
    </label>
  );
}

function LibraryDialog({
  items,
  currentId,
  onLoad,
  onDelete,
  onClose,
}: {
  items: SavedCarousel[];
  currentId: string | null;
  onLoad: (item: SavedCarousel) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161616] p-6 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Biblioteca de carrosséis</h2>
            <p className="text-xs text-white/50">
              Seus carrosséis salvos ficam aqui — abra a qualquer hora para exportar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            Nenhum carrossel salvo ainda. Gere um e clique em "Salvar".
          </div>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {items.map((item) => {
              const first = (item.slides[0] as Slide | undefined)?.title ?? "";
              const date = new Date(item.updatedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const isCurrent = item.id === currentId;
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    isCurrent ? "border-white/40 bg-white/[0.04]" : "border-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.name}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-white/60">
                          aberto
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-white/40">
                      {first || "—"} · atualizado em {date}
                    </div>
                  </div>
                  <button
                    onClick={() => onLoad(item)}
                    className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${item.name}"?`)) onDelete(item.id);
                    }}
                    className="rounded-md bg-white/5 p-2 text-white/60 hover:bg-red-500/20 hover:text-red-300"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StylesDialog({
  current,
  onPick,
  onClose,
}: {
  current: Brand;
  onPick: (s: DesignStyle) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161616] p-6 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Estilos de design</h2>
            <p className="text-xs text-white/50">
              Aplica tipografia, cor primária e fundo em todo o carrossel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DESIGN_STYLES.map((s) => {
            const active =
              current.fontFamily === s.fontFamily &&
              current.primaryColor === s.primaryColor &&
              current.bgColor === s.bgColor;
            return (
              <button
                key={s.name}
                onClick={() => onPick(s)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  active ? "border-white" : "border-white/10 hover:border-white/30"
                }`}
              >
                <div
                  className="flex h-32 items-end p-4"
                  style={{ background: s.bgColor }}
                >
                  <div>
                    <div
                      className="text-[10px] font-bold tracking-[0.28em] uppercase"
                      style={{ color: s.primaryColor }}
                    >
                      kicker
                    </div>
                    <div
                      className="mt-1 text-lg leading-tight font-bold"
                      style={{
                        fontFamily: s.fontFamily,
                        color: s.bgColor.toLowerCase() === "#f5f1ea" ? "#111" : "#fff",
                      }}
                    >
                      Título do slide
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-black/40 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-[11px] text-white/50">{s.description}</div>
                  </div>
                  {active && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CaptionDialog({
  slides,
  brand,
  onClose,
}: {
  slides: Slide[];
  brand: Brand;
  onClose: () => void;
}) {
  const captionFn = useServerFn(generateCaption);
  const [framework, setFramework] = useState<"AIDA" | "PAS">("AIDA");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const full = caption + (tags.length ? `\n\n${tags.join(" ")}` : "");

  const run = async (fw: "AIDA" | "PAS") => {
    setLoading(true);
    setErr(null);
    setCaption("");
    setTags([]);
    try {
      const data = await captionFn({
        data: {
          framework: fw,
          brand: {
            niche: brand.niche,
            audience: brand.audience,
            tone: brand.tone,
            goal: brand.goal,
            handle: brand.handle,
            author: brand.author,
          },
          slides: slides
            .filter((s) => (s.title || s.subtitle || s.kicker || "").trim().length > 0)
            .map((s) => ({
              kicker: s.kicker || "",
              title: (s.title || "").replace(/\*\*/g, ""),
              subtitle: (s.subtitle || "").replace(/\*\*/g, ""),
            })),
        },
      });
      setCaption(data.caption);
      setTags(data.hashtags);
    } catch (e: any) {
      console.error("CAPTION ERROR:", e);
      setErr(`Erro: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#161616] p-6 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Legenda para Instagram</h2>
          <button
            onClick={onClose}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <p className="mb-3 text-xs text-white/60">
          Gera a legenda usando só o que está nos slides — sem inventar dados.
          Inclui 5 hashtags relevantes ao tema.
        </p>

        <div className="mb-4 flex gap-2">
          {(["AIDA", "PAS"] as const).map((fw) => (
            <button
              key={fw}
              onClick={() => {
                setFramework(fw);
                run(fw);
              }}
              disabled={loading}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                framework === fw
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {fw}
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-md bg-white/5 p-4 text-xs text-white/70">Gerando…</div>
        )}
        {err && <div className="rounded-md bg-red-500/10 p-3 text-xs text-red-300">{err}</div>}

        {!loading && caption && (
          <>
            <textarea
              readOnly
              value={full}
              rows={14}
              onFocus={(e) => e.currentTarget.select()}
              className="mb-3 w-full resize-y rounded-md border border-white/10 bg-black/40 p-3 text-sm text-white outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-white/40">
                {full.length} caracteres · {tags.length} hashtags
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => run(framework)}
                  className="rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                >
                  Gerar de novo
                </button>
                <button
                  onClick={copy}
                  className="rounded-md bg-white px-3 py-2 text-xs font-bold text-black"
                >
                  {copied ? "Copiado!" : "Copiar tudo"}
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && !caption && !err && (
          <button
            onClick={() => run(framework)}
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-bold text-black"
          >
            Gerar legenda ({framework})
          </button>
        )}
      </div>
    </div>
  );
}

function ElementsDialog({
  slide,
  onChange,
  onClose,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<ElementDef["category"]>("negocios");
  const elements = slide.elements ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id ?? null);
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const addElement = (def: ElementDef) => {
    const el: SlideElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      svgId: def.id,
      x: 80,
      y: 20,
      scale: 1,
      rotation: 0,
      opacity: 0.9,
      color: "#c2a25b",
    };
    const next = [...elements, el];
    onChange({ elements: next });
    setSelectedId(el.id);
  };

  const updateEl = (patch: Partial<SlideElement>) => {
    if (!selected) return;
    onChange({
      elements: elements.map((e) => (e.id === selected.id ? { ...e, ...patch } : e)),
    });
  };

  const removeEl = (id: string) => {
    onChange({ elements: elements.filter((e) => e.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl bg-[#232323] p-5 ring-1 ring-white/15">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Elementos decorativos</h2>
          <button
            onClick={onClose}
            className="rounded-md bg-white/5 p-1.5 text-white/60 hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {ELEMENT_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                cat === c.key ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-lg bg-[#1a1a1a] p-2 sm:grid-cols-6">
          {elementsByCategory(cat).map((def) => (
            <div
              key={def.id}
              role="button"
              tabIndex={0}
              onClick={() => addElement(def)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") addElement(def); }}
              title={def.name}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-[#2a2a2a] p-3 hover:border-amber-400/60 hover:bg-[#333]"
            >
              <div style={{ color: "white", width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: def.svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[11px] tracking-wider uppercase text-white/50">
            Neste slide · {elements.length}
          </div>
          {elements.length === 0 && (
            <p className="text-xs text-white/40">Nenhum elemento. Clique acima para adicionar.</p>
          )}
          {elements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {elements.map((el) => {
                const def = findElement(el.svgId);
                if (!def) return null;
                const isSel = el.id === selectedId;
                return (
                  <div
                    key={el.id}
                    className={`relative flex flex-col items-center rounded-md border p-1 ${
                      isSel ? "border-white bg-white/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedId(el.id)}
                      className="flex h-10 w-10 items-center justify-center"
                      style={{ color: el.color }}
                      dangerouslySetInnerHTML={{ __html: def.svg }}
                    />
                    <button
                      onClick={() => removeEl(el.id)}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-4 space-y-3 rounded-lg bg-black/30 p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">
                  X · {Math.round(selected.x)}%
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selected.x}
                  onChange={(e) => updateEl({ x: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">
                  Y · {Math.round(selected.y)}%
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selected.y}
                  onChange={(e) => updateEl({ y: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">
                  Tamanho · {Math.round(selected.scale * 100)}%
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  value={selected.scale}
                  onChange={(e) => updateEl({ scale: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">
                  Rotação · {Math.round(selected.rotation)}°
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  onChange={(e) => updateEl({ rotation: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">
                  Opacidade · {Math.round(selected.opacity * 100)}%
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selected.opacity}
                  onChange={(e) => updateEl({ opacity: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[10px] tracking-wider uppercase text-white/50">Cor</div>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateEl({ color: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded bg-transparent"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
