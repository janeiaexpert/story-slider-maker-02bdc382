import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import { generateCarousel } from "@/lib/carousel.functions";
import {
  type Brand,
  defaultBrand,
  loadBrand,
  saveBrand,
} from "@/lib/brand-storage";

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
};

const STORAGE_KEY = "carousel-creator-v1";

const GRADIENTS: Record<Slide["gradient"], string> = {
  top: "linear-gradient(to top, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.85) 100%)",
  bottom: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.85) 100%)",
  left: "linear-gradient(to left, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.85) 100%)",
  right: "linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.85) 100%)",
};

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
  }));
}

function Index() {
  const [brand, setBrand] = useState<Brand>(defaultBrand);
  const [brandReady, setBrandReady] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [view, setView] = useState<"insight" | "editor">("insight");
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slides, setSlides] = useState<Slide[]>(blankSlides(defaultBrand));
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
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
          setSlides(data);
          setView("editor");
        }
      } catch {}
    }
  }, []);

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
      const next: Slide[] = result.slides.map((s) => ({
        kicker: s.kicker,
        title: s.title.replace(/\\n/g, "\n"),
        subtitle: s.subtitle,
        buttonText: s.buttonText,
        buttonCaption: s.buttonCaption,
        handle: brand.handle,
        author: brand.author,
        image: null,
        align: s.align,
        gradient: "bottom",
      }));
      setSlides(next);
      setActive(0);
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

  const newCarousel = () => {
    setInsight("");
    setError(null);
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowBrand(true)}
              className="rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
            >
              ⚙ Marca
            </button>
            {view === "editor" && (
              <>
                <button
                  onClick={newCarousel}
                  className="rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                >
                  + Novo
                </button>
                <button
                  onClick={exportAll}
                  className="rounded-md px-4 py-2 text-sm font-semibold"
                  style={{ background: GOLD, color: "#111" }}
                >
                  ⬇ Exportar todos
                </button>
              </>
            )}
          </div>
        </header>

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
                {loading ? "Gerando carrossel…" : "✨ Gerar carrossel"}
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
                        className="absolute inset-0 h-full w-full object-cover opacity-90"
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: GRADIENTS[s.gradient] }}
                    />
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
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                          {s.title}
                        </h2>
                        {s.subtitle && (
                          <p className="mt-3 text-[13px] leading-snug text-white/80">{s.subtitle}</p>
                        )}
                        {s.buttonText && (
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
                  className="flex-1 rounded-md bg-white/5 py-3 text-sm font-semibold disabled:opacity-30"
                >
                  ‹ Anterior
                </button>
                <button
                  onClick={() => setActive((a) => Math.min(7, a + 1))}
                  disabled={active === 7}
                  className="flex-1 rounded-md bg-white/5 py-3 text-sm font-semibold disabled:opacity-30"
                >
                  Próximo ›
                </button>
              </div>
              <button
                onClick={() => exportSlide()}
                className="mt-2 w-full max-w-[420px] rounded-md py-3 text-sm font-bold"
                style={{ background: GOLD, color: "#111" }}
              >
                ⬇ Salvar slide {active + 1}
              </button>
              {saved === active && (
                <div className="mt-2 text-xs text-white/60">✓ Slide {active + 1} salvo!</div>
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

              <Field label="Gradiente (escurece esse lado)">
                <div className="grid grid-cols-4 gap-2">
                  {(["top", "bottom", "left", "right"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => update({ gradient: g })}
                      className={`rounded-md py-2 text-xs font-semibold capitalize ${
                        s.gradient === g ? "bg-white text-black" : "bg-white/5 text-white/70"
                      }`}
                    >
                      {g === "top" ? "↑" : g === "bottom" ? "↓" : g === "left" ? "←" : "→"} {g}
                    </button>
                  ))}
                </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
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
