# Plano: Fábrica de Carrosséis com IA

Transformar o app atual (editor manual de 8 slides) em uma **fábrica automática**: usuário cola um insight → IA gera os 8 slides prontos com copy, estrutura estratégica e branding aplicado.

## Arquitetura

```
[Insight bruto] → [IA analisa] → [Gera 8 slides estruturados] → [Aplica branding salvo] → [Editor visual atual] → [Exporta PNG]
```

Mantém o editor visual atual como camada de ajuste fino. A IA preenche tudo automaticamente; usuário só revisa e exporta.

## Escopo desta entrega (V1)

### 1. Entrada de insight (nova tela inicial)
- Textarea grande: "Cole aqui seu insight, link, ideia, anotação ou texto..."
- Botão **"Gerar carrossel"**
- Suporte a: texto livre, link (fetch do conteúdo via Firecrawl), tweet, artigo
- Sem upload de vídeo nesta versão (escopo)

### 2. Configuração da marca (primeira vez + edição)
Modal/página de setup salvando em **localStorage**:
- Nicho
- Público-alvo
- Tom de voz (autoridade / próximo / provocador / didático)
- Cor primária (já existe gold) + cor de fundo
- @handle e nome do autor
- Objetivo padrão (autoridade / conversão / educação / viralização)

Aplicado automaticamente em todas as gerações.

### 3. Geração via IA (Lovable AI Gateway)
- Modelo: `google/gemini-3-flash-preview`
- Server function `generateCarousel` em `src/lib/carousel.functions.ts`
- Prompt estruturado que:
  1. Extrai tema, dor, desejo, ângulo
  2. Cria gancho de alta retenção (slide 1)
  3. Organiza narrativa progressiva (slides 2–6)
  4. Conduz à virada/CTA (slides 7–8)
  5. Aplica filtro anti-IA (sem clichês, sem emojis em excesso, ritmo humano)
- Saída estruturada via `Output.object` com Zod: array de 8 slides `{kicker, title, subtitle, buttonText?, buttonCaption?, align}`
- Se link colado → Firecrawl scrape antes de mandar pra IA

### 4. Integração com editor existente
- Após geração: popula os 8 slides no editor atual
- Usuário pode ajustar texto, alinhamento, foto e exportar (fluxo já funciona)
- Botão **"Gerar novo"** volta pra tela de insight

### 5. Fora do escopo desta V1 (deixar pra próxima)
- Geração automática de imagens de fundo por slide (custa caro; pode adicionar depois)
- Múltiplos carrosséis salvos
- Análise de vídeo
- Backend persistido (usa localStorage)

## Estrutura técnica

```
src/
  routes/
    index.tsx              → tela de insight (novo)
    editor.tsx             → editor atual movido pra cá
  lib/
    carousel.functions.ts  → createServerFn: generateCarousel
    ai-gateway.server.ts   → provider helper Lovable AI
    brand-storage.ts       → util localStorage da marca
  components/
    InsightInput.tsx
    BrandSetupDialog.tsx
```

## Dependências
- `bun add ai @ai-sdk/openai-compatible zod` (Lovable AI Gateway)
- Firecrawl: ativar via connector apenas se usuário pedir suporte a links (posso adicionar depois — V1 começa só com texto colado pra simplificar)

## Custos
Usa créditos do workspace (Lovable AI). Geração ~1 request por carrossel (~$0.001).

---

**Pergunta antes de implementar:** Confirma que pra V1 a gente foca em **texto colado** (sem scraping de links ainda) e **sem geração automática de imagens** (fundos continuam upload manual)? Isso entrega o core "insight → carrossel pronto" rapidíssimo e a gente adiciona link-scraping + imagens IA num segundo passo.