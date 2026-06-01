import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sem JSON na resposta");
  return JSON.parse(raw.slice(start, end + 1));
}

export const generateCarousel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

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
- kicker: 2 a 4 palavras em CAIXA ALTA.
- title: 4 a 14 palavras. Use \\n para quebras intencionais. Máximo 4 linhas curtas.
- subtitle: 0 a 25 palavras.
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
