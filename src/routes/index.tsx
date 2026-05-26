import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";

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
};

const GOLD = "#c2a25b";
const BG = "#0a0a0a";

const defaultSlides: Slide[] = [
  {
    kicker: "INFRAESTRUTURA DE DADOS",
    title: "A ferramenta executa.\nA infraestrutura governa.",
    subtitle: "Você sabe a diferença?",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "center",
  },
  {
    kicker: "O PROBLEMA",
    title: "Você compra ferramentas.\nMas falta estrutura.",
    subtitle:
      "Sem infraestrutura, cada nova IA vira mais um software solto no seu negócio.",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "A DIFERENÇA",
    title: "Ferramenta ≠ Infraestrutura",
    subtitle:
      "Ferramenta resolve uma tarefa. Infraestrutura sustenta o negócio inteiro.",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "O CUSTO INVISÍVEL",
    title: "Sem governança,\nIA vira caos.",
    subtitle:
      "Retrabalho, dados duplicados e decisões sem rastreabilidade. Tudo isso custa caro.",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "A SOLUÇÃO",
    title: "A.I.L. — Arquitetura\nde Infraestrutura\nde Lucro.",
    subtitle:
      "Um método para transformar IA em ativo estratégico do seu negócio.",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "DIAGNÓSTICO GRATUITO",
    title: "Construa seu império\nsobre a rocha, com A.I.L.",
    subtitle: "Arquitetura de Infraestrutura de Lucro para o seu negócio.",
    buttonText: 'Envie "INFRAESTRUTURA" no direct',
    buttonCaption: "Receba seu diagnóstico personalizado",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "BÔNUS",
    title: "Quem governa os dados,\ngoverna o lucro.",
    subtitle: "A infraestrutura certa multiplica o resultado de cada IA.",
    buttonText: "",
    buttonCaption: "",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
  {
    kicker: "PRÓXIMO PASSO",
    title: "Pare de comprar ferramentas.\nComece a construir alicerce.",
    subtitle: "Salve este carrossel e compartilhe com quem precisa entender.",
    buttonText: 'Envie "INFRAESTRUTURA"',
    buttonCaption: "Vamos conversar no direct",
    handle: "@jane.iaexpert",
    author: "Jane Santana",
    image: null,
    align: "bottom",
  },
];

const STORAGE_KEY = "carousel-creator-v1";

function Index() {
  const [slides, setSlides] = useState<Slide[]>(defaultSlides);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length === 8) setSlides(data);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
  }, [slides]);

  const update = (patch: Partial<Slide>) => {
    setSlides((s) => s.map((sl, i) => (i === active ? { ...sl, ...patch } : sl)));
  };

  const onImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update({ image: reader.result as string });
    reader.readAsDataURL(file);
  };

  const exportSlide = async (idx?: number) => {
    const i = idx ?? active;
    if (i !== active) setActive(i);
    await new Promise((r) => setTimeout(r, 50));
    if (!slideRef.current) return;
    const dataUrl = await toPng(slideRef.current, {
      pixelRatio: 2,
      cacheBust: true,
    });
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
      const dataUrl = await toPng(slideRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide-${i + 1}.png`;
      a.click();
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const resetSlide = () => {
    setSlides((s) =>
      s.map((sl, i) => (i === active ? defaultSlides[i] : sl))
    );
  };

  const s = slides[active];
  const alignClass =
    s.align === "top"
      ? "justify-start pt-16"
      : s.align === "center"
      ? "justify-center"
      : "justify-end pb-12";

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#111" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <div
              className="text-xs tracking-[0.25em] uppercase"
              style={{ color: GOLD }}
            >
              Carrossel Creator
            </div>
            <h1 className="text-xl font-semibold">jane.iaexpert · 8 slides</h1>
          </div>
          <button
            onClick={exportAll}
            className="rounded-md px-4 py-2 text-sm font-semibold"
            style={{ background: GOLD, color: "#111" }}
          >
            ⬇ Exportar todos
          </button>
        </header>

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
                  {/* Image area */}
                  {s.image && (
                    <img
                      src={s.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-90"
                    />
                  )}
                  {/* Gradient for legibility */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.85) 100%)",
                    }}
                  />

                  {/* Content */}
                  <div
                    className={`relative z-10 flex h-full w-full flex-col px-7 ${alignClass}`}
                  >
                    <div className="mt-auto">
                      <div
                        className="text-[11px] font-bold tracking-[0.28em]"
                        style={{ color: GOLD }}
                      >
                        {s.kicker}
                      </div>
                      <h2
                        className="mt-3 whitespace-pre-line font-serif text-[28px] leading-[1.1] font-bold"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {s.title}
                      </h2>
                      {s.subtitle && (
                        <p className="mt-3 text-[13px] leading-snug text-white/80">
                          {s.subtitle}
                        </p>
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
                      <div className="mt-5 flex items-center justify-between text-[11px] text-white/60">
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
                          }%, rgba(255,255,255,0.15) ${
                            ((active + 1) / 8) * 100
                          }%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="mt-6 grid w-full grid-cols-4 gap-2 sm:grid-cols-8">
              {slides.map((sl, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`aspect-[1080/1350] rounded-md border-2 text-xs font-bold transition ${
                    i === active
                      ? "border-[color:var(--g)]"
                      : "border-white/10 hover:border-white/30"
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
              <div className="mt-2 text-xs text-white/60">
                ✓ Slide {active + 1} salvo!
              </div>
            )}
          </div>

          {/* Editor */}
          <aside className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">
                Editar slide {active + 1}
              </h2>
              <button
                onClick={resetSlide}
                className="text-xs text-white/50 hover:text-white"
              >
                restaurar
              </button>
            </div>

            <Field label="Kicker">
              <input
                value={s.kicker}
                onChange={(e) => update({ kicker: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Título (use Enter para quebrar linha)">
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
                      s.align === a
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/70"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Foto de fundo">
              <label
                className="block cursor-pointer rounded-md bg-white/5 px-3 py-2 text-center text-xs text-white/70 hover:bg-white/10"
              >
                {s.image ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onImage(e.target.files[0])
                  }
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
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#c2a25b]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-[11px] tracking-wider uppercase text-white/50">
        {label}
      </div>
      {children}
    </label>
  );
}
