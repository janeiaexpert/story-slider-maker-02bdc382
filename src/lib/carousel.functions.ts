import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createGroqProvider } from "./ai-gateway.server";

const SlideSchema = z.object({
  kicker: z.string(),
  title: z.string(),
  subtitle: z.string().default(""),
  buttonText: z.string().default(""),
  buttonCaption: z.string().default(""),
  align: z.enum(["top", "center", "bottom"]),
});

const CarouselSchema = z.object({
  slides: z.array(SlideSchema).length(8),
});

export type GeneratedSlide = z.infer<typeof SlideSchema>;

const InputSchema = z.object({
  insight: z.string().min(10).max(20000),
  brand: z.object({
    niche: z.string(),
    audience: z.string(),
    tone: z.string(),
    goal: z.string(),
    handle: z.string(),
    author: z.string(),
  }),
});

function extractJson(text: string): unknown {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : cleaned;
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("Sem JSON na resposta");

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end === -1) throw new Error("Sem JSON na resposta");
  let jsonStr = raw.slice(start, end + 1);

  jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  jsonStr = jsonStr.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");

  return JSON.parse(jsonStr);
}

export const generateCarousel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY ausente");

    const provider = createGroqProvider(key);
    const model = provider("llama-3.3-70b-versatile");

    const system = `Você é um estrategista de conteúdo para Instagram, especialista em carrosséis de alta retenção e conversão.

REGRAS DE OURO (filtro anti-cara-de-IA):
- Linguagem natural e humana. Sem clichês motivacionais.
- Nada de: "imagine se", "descubra agora", "transforme sua vida", "o segredo que ninguém te conta", "você sabia que".
- Sem emojis em excesso. No máximo 1 emoji em todo o carrossel, e só se fizer real diferença.
- Sem reticências dramáticas. Sem CAPS LOCK no corpo.
- Frases curtas, ritmo de leitura humano. Variação estrutural entre slides.
- Português brasileiro, tom condizente com o briefing da marca.

ESTRUTURA OBRIGATÓRIA (8 slides, nesta ordem):
1. CAPA — gancho de retenção máxima. Provoca curiosidade ou contradiz crença comum. Sem botão.
2. CONTEXTO/PROBLEMA — nomeia a dor real do público.
3. VIRADA — quebra a forma como o leitor enxerga o tema.
4. EXPLICAÇÃO — desenvolve o argumento central com clareza.
5. PROVA/EXEMPLO — aterriza com exemplo concreto, dado ou caso.
6. APROFUNDAMENTO — adiciona camada que diferencia de conteúdo raso.
7. SÍNTESE — fecha a ideia, gera o "click" mental.
8. CTA — chamada coerente com o objetivo. Único slide com buttonText e buttonCaption.

ALINHAMENTO:
- Capa (slide 1): "center".
- CTA (slide 8): "bottom".
- Demais: alternar entre "bottom" e "center" conforme o peso do texto.

LIMITES:
- kicker: 2 a 4 palavras em CAIXA ALTA. Sem emojis.
- title: 4 a 14 palavras. NUNCA use emojis. Use \\n só quando a quebra for tipograficamente intencional. Slide 1 (capa): título em UMA linha única, sem \\n. Demais slides: no máximo 1 \\n.
- subtitle: 0 a 25 palavras. Sem emojis.
- Nos slides 1 a 7: buttonText="" e buttonCaption="".
- No slide 8: buttonText curto (3-7 palavras) e buttonCaption de 4-7 palavras.

RETORNE APENAS JSON VÁLIDO no formato:
{
  "slides": [
    {"kicker":"...","title":"...","subtitle":"...","buttonText":"","buttonCaption":"","align":"center"},
    ... 8 itens no total
  ]
}
Nada de texto fora do JSON.`;

    const userPrompt = `BRIEFING DA MARCA:
- Nicho: ${data.brand.niche || "não definido"}
- Público: ${data.brand.audience || "não definido"}
- Tom: ${data.brand.tone}
- Objetivo: ${data.brand.goal}
- Autor: ${data.brand.author} (${data.brand.handle})

INSIGHT BRUTO:
"""
${data.insight}
"""

Extraia o ângulo mais forte deste insight e gere o carrossel de 8 slides seguindo a estrutura. Retorne apenas o JSON.`;

    const { text } = await generateText({
      model,
      system,
      prompt: userPrompt,
    });

    const parsed = CarouselSchema.parse(extractJson(text));
    return parsed;
  });

const CaptionInputSchema = z.object({
  slides: z
    .array(
      z.object({
        kicker: z.string().default(""),
        title: z.string().default(""),
        subtitle: z.string().default(""),
      }),
    )
    .min(1)
    .max(20),
  brand: z.object({
    niche: z.string().default(""),
    audience: z.string().default(""),
    tone: z.string().default(""),
    goal: z.string().default(""),
    handle: z.string().default(""),
    author: z.string().default(""),
  }),
  framework: z.enum(["AIDA", "PAS"]).default("AIDA"),
});

export const generateCaption = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CaptionInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY ausente");

    const provider = createGroqProvider(key);
    const model = provider("llama-3.3-70b-versatile");

    const slidesDump = data.slides
      .map(
        (s, i) =>
          `Slide ${i + 1}\n  kicker: ${s.kicker}\n  title: ${s.title.replace(/\n/g, " ")}\n  subtitle: ${s.subtitle}`,
      )
      .join("\n\n");

    const fw = data.framework;
    const fwGuide =
      fw === "AIDA"
        ? `Use o framework AIDA:
- Atenção: 1ª linha que para o scroll (gancho do slide 1).
- Interesse: 2-3 linhas contextualizando a dor/desejo do público.
- Desejo: o que muda quando ele entende o que está no carrossel.
- Ação: convite claro (salvar, comentar, compartilhar, clicar no link da bio etc.) coerente com o objetivo da marca.`
        : `Use o framework PAS:
- Problema: nomeie a dor real do público em 1-2 linhas.
- Agitação: aprofunde o custo de continuar nessa dor.
- Solução: aponte o que o carrossel entrega + CTA coerente com o objetivo.`;

    const system = `Você é um copywriter de Instagram. Escreve legendas em português brasileiro, naturais, sem cara de IA.

REGRAS:
- Use APENAS o que está nos slides. Não invente dados, estatísticas, nomes, casos ou promessas que não estejam ali.
- Sem clichês ("descubra agora", "transforme sua vida", "o segredo que ninguém te conta", "imagine se", "você sabia que").
- Sem emojis em excesso. No máximo 2 em toda a legenda, e só se agregarem.
- Frases curtas, ritmo humano, parágrafos de 1 a 3 linhas separados por linha em branco.
- Não use hashtags no corpo da legenda — elas vão num bloco final.
- Limite total: ~1800 caracteres.

${fwGuide}

RETORNE APENAS JSON VÁLIDO no formato:
{"caption":"texto da legenda","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}

IMPORTANTE: O campo "caption" NÃO pode conter quebras de linha reais dentro do JSON. Use a sequência literal \\n (barra + n) para separar parágrafos. O JSON precisa ser parseável por um parser JSON padrão.

Nada de texto fora do JSON.

REGRAS DAS HASHTAGS:
- Exatamente 5 hashtags, relevantes ao tema dos slides e ao nicho da marca.
- Sem espaços, sem acentos, em minúsculo. Cada uma começa com #.
- Nada genérico demais ("#instagram", "#follow"). Específicas ao conteúdo.`;

    const userPrompt = `BRIEFING DA MARCA:
- Nicho: ${data.brand.niche || "não definido"}
- Público: ${data.brand.audience || "não definido"}
- Tom: ${data.brand.tone || "não definido"}
- Objetivo: ${data.brand.goal || "não definido"}
- Autor: ${data.brand.author} (${data.brand.handle})

CARROSSEL (use apenas isto como fonte):
${slidesDump}

Gere a legenda no framework ${fw} seguindo as regras. Retorne apenas o JSON.`;

    const CaptionSchema = z.object({
      caption: z.string().min(1),
      hashtags: z.array(z.string()).min(3).max(8),
    });

    const { text } = await generateText({
      model,
      system,
      prompt: userPrompt,
      temperature: 0.4,
    });

    let parsed;
    try {
      parsed = CaptionSchema.parse(extractJson(text));
    } catch (parseErr) {
      const hex = [...text.slice(0, 20)].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
      const preview = text.replace(/[\r\n]+/g, " ").slice(0, 200);
      throw new Error(
        `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)} | HEX: ${hex} | RAW: ${preview}`
      );
    }

    const tags = parsed.hashtags
      .map((t) => {
        const clean = t.trim().replace(/\s+/g, "").replace(/^#+/, "");
        return clean ? `#${clean}` : "";
      })
      .filter(Boolean)
      .slice(0, 5);

    return { caption: parsed.caption.trim(), hashtags: tags };
  });
