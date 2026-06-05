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
} from "lucide-react";
import { generateCarousel } from "@/lib/carousel.functions";
import {
  type Brand,
  BRAND_PALETTES,
  DESIGN_STYLES,
  type DesignStyle,
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
} from "@/lib/carousel-library";
import { Save, FolderOpen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

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
};

const STORAGE_KEY = "carousel-creator-v1";

const DIR_MAP: Record<Slide["gradient"], string> = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
};

function gradientFor(dir: Slide["gradient"], intensity: number) {
  const a = Math.max(0, Math.min(1, intensity / 100));
  return `linear-gradient(${DIR_MAP[dir]}, rgba(0,0,0,${(a * 0.3).toFixed(
    2,
  )}) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,${a.toFixed(2)}) 100%)`;
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
  return Array.from({ length: 8 }, () => ({
    kicker: "",
    title: "",
    subtitle: "",
    buttonText: "",
    buttonCaption: "",
    handle: brand.handle,
    author: brand.author,
    image: null,
    align: "bottom",
    gradient: "bottom",
    gradientIntensity: 70,
    buttonPosition: "inline",
    imagePos: "center",
  }));
}

function Index() {
  const [brand, setBrand] = useState<Brand>(defaultBrand);
  const [brandReady, setBrandReady] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
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
  const slideRef = useRef<HTMLDivElement>(null);

  const generateFn = useServerFn(generateCarousel);

  // Boot
  useEffect(() => {
    const b = loadBrand();
    if (b) {
      setBrand(b);
      setBrandReady(true);
    } else {
      setShowBrand(true);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length === 8) {
          setSlides(
            data.map((d: Slide) => ({
              ...d,
              gradient: d.gradient ?? "bottom",
              gradientIntensity: d.gradientIntensity ?? 70,
              buttonPosition: d.buttonPosition ?? "inline",
              imagePos: d.imagePos ?? "center",
            })),
          );
          setView("editor");
        }
      } catch {}
    }
    setLibrary(loadLibrary());
  }, []);

  const handleSaveCarousel = () => {
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
    const next = upsertCarousel(item);
    setLibrary(next);
    setCurrentId(id);
    setCurrentName(name);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleLoadCarousel = (item: SavedCarousel) => {
    const data = (item.slides as Slide[]).map((d) => ({
      ...d,
      gradient: d.gradient ?? "bottom",
      gradientIntensity: d.gradientIntensity ?? 70,
      buttonPosition: d.buttonPosition ?? "inline",
      imagePos: d.imagePos ?? "center",
    }));
    setSlides(data);
    setCurrentId(item.id);
    setCurrentName(item.name);
    setActive(0);
    setView("editor");
    setShowLibrary(false);
  };

  const handleDeleteCarousel = (id: string) => {
    const next = deleteCarousel(id);
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
      const next: Slide[] = result.slides.map((s, i) => ({
        kicker: s.kicker,
        title: sanitizeTitle(s.title),
        subtitle: s.subtitle,
        buttonText: s.buttonText,
        buttonCaption: s.buttonCaption,
        handle: brand.handle,
        author: brand.author,
        image: null,
        align: s.align,
        gradient: "bottom",
        gradientIntensity: 70,
        buttonPosition: i === 7 ? "bottom" : "inline",
        imagePos: "center",
      }));
      setSlides(next);
      setActive(0);
      setCurrentId(null);
      setCurrentName("");
      setView("editor");
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message || e);
      if (msg.includes("429")) setError("Limite de uso atingido. Tente novamente em alguns segundos.");
      else if (msg.includes("402")) setError("Créditos esgotados. Adicione créditos no workspace.");
      else setError("Falha ao gerar carrossel. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const exportSlide = async (idx?: number) => {
    const i = idx ?? active;
    if (i !== active) setActive(i);
    await new Promise((r) => setTimeout(r, 50));
    if (!slideRef.current) return;
    const dataUrl = await toPng(slideRef.current, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `slide-${i + 1}.png`;
    a.click();
    setSaved(i);
    setTimeout(() => setSaved(null), 1500);
  };

  const exportAll = async () => {
    for (let i = 0; i < slides.length; i++) {
      setActive(i);
      await new Promise((r) => setTimeout(r, 200));
      if (!slideRef.current) continue;
      const dataUrl = await toPng(slideRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide-${i + 1}.png`;
      a.click();
      await new Promise((r) => setTimeout(r, 250));
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
        const dataUrl = await toPng(slideRef.current, {
          pixelRatio: 2,
          cacheBust: true,
        });
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
    <div className="min-h-screen text-white" style={{ background: "#111" }}>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
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
              onClick={() => {
                setLibrary(loadLibrary());
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
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Preview */}
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[420px]">
                <div
                  className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
                  style={{ aspectRatio: "1080 / 1350" }}
                >
                  <div
                    ref={slideRef}
                    className="absolute inset-0 flex flex-col"
                    style={{ background: BG, color: "white" }}
                  >
                    {s.image && (
                      <img
                        src={s.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: `center ${s.imagePos === "top" ? "0%" : s.imagePos === "bottom" ? "100%" : "50%"}` }}
                      />
                    )}
                    {s.image && (
                      <div
                        className="absolute inset-0"
                        style={{ background: gradientFor(s.gradient, s.gradientIntensity) }}
                      />
                    )}
                    <div className={`relative z-10 flex h-full w-full flex-col px-7 pb-20 ${alignClass}`}>
                      <div>
                        <div
                          className="text-[11px] font-bold tracking-[0.28em]"
                          style={{ color: GOLD }}
                        >
                          {s.kicker}
                        </div>
                        <h2
                          className="mt-3 whitespace-pre-line text-[28px] leading-[1.1] font-bold"
                          style={{ fontFamily: brand.fontFamily }}
                        >
                          {s.title}
                        </h2>
                        {s.subtitle && (
                          <p className="mt-3 text-[13px] leading-snug text-white/80">{s.subtitle}</p>
                        )}
                        {s.buttonText && s.buttonPosition === "inline" && (
                          <div className="mt-5">
                            <div
                              className="w-full rounded-md py-3 text-center text-[13px] font-bold"
                              style={{ background: GOLD, color: "#111" }}
                            >
                              {s.buttonText}
                            </div>
                            {s.buttonCaption && (
                              <div className="mt-2 text-center text-[11px] text-white/60">
                                {s.buttonCaption}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {s.buttonText && s.buttonPosition === "bottom" && (
                      <div className="absolute right-0 bottom-16 left-0 z-10 px-7">
                        <div
                          className="w-full rounded-md py-3 text-center text-[13px] font-bold"
                          style={{ background: GOLD, color: "#111" }}
                        >
                          {s.buttonText}
                        </div>
                        {s.buttonCaption && (
                          <div className="mt-2 text-center text-[11px] text-white/60">
                            {s.buttonCaption}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Footer fixo na parte inferior */}
                    <div className="absolute right-0 bottom-0 left-0 z-10 px-7 pb-5">
                      <div className="flex items-center justify-between text-[11px] text-white/70">
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
                  </div>
                </div>
              </div>

              <div className="mt-6 grid w-full grid-cols-4 gap-2 sm:grid-cols-8">
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

              <div className="mt-4 flex w-full max-w-[420px] gap-2">
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
                className="mt-2 inline-flex w-full max-w-[420px] items-center justify-center gap-2 rounded-md py-3 text-sm font-bold"
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
            <aside className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <div className="mb-4">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">
                  Editar slide {active + 1}
                </h2>
              </div>

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#161616] p-6 ring-1 ring-white/10">
        <h2 className="mb-1 text-lg font-bold">Sua marca</h2>
        <p className="mb-5 text-xs text-white/50">
          A IA usa essas informações para escrever no seu tom e aplicar seu visual.
        </p>

        <div className="grid grid-cols-2 gap-3">
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
          <div className="col-span-2">
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
