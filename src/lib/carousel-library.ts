import { supabase } from "@/integrations/supabase/client";
import { getSpaceId } from "./space-id";

export type SavedCarousel = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  slides: unknown[];
};

type Row = {
  id: string;
  space_id: string;
  name: string;
  slides: unknown[];
  created_at: string;
  updated_at: string;
};

function rowToItem(r: Row): SavedCarousel {
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    slides: r.slides,
  };
}

export async function loadLibrary(): Promise<SavedCarousel[]> {
  if (typeof window === "undefined") return [];
  const space = getSpaceId();
  const { data, error } = await supabase
    .from("carousels")
    .select("*")
    .eq("space_id", space)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("loadLibrary", error);
    return [];
  }
  return (data as Row[]).map(rowToItem).filter((i) => i.id !== "__brand__");
}

function compressImageForStorage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith("data:image")) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const max = 400;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > max) { h = (h / w) * max; w = max; }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.5));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function upsertCarousel(item: SavedCarousel): Promise<SavedCarousel[]> {
  const space = getSpaceId();
  const slidesForCloud = await Promise.all(
    (item.slides as Record<string, unknown>[]).map(async (s) => {
      if (typeof s.image === "string" && s.image.startsWith("data:image")) {
        return { ...s, image: await compressImageForStorage(s.image) };
      }
      return s;
    }),
  );
  const { error } = await supabase.from("carousels").upsert(
    {
      id: item.id,
      space_id: space,
      name: item.name,
      slides: slidesForCloud as never,
    },
    { onConflict: "space_id,id" },
  );
  if (error) {
    console.error("upsertCarousel", error);
    throw error;
  }
  return loadLibrary();
}

export async function deleteCarousel(id: string): Promise<SavedCarousel[]> {
  const space = getSpaceId();
  const { error } = await supabase
    .from("carousels")
    .delete()
    .eq("space_id", space)
    .eq("id", id);
  if (error) console.error("deleteCarousel", error);
  return loadLibrary();
}

export async function saveBrandToCloud(brand: unknown): Promise<void> {
  const space = getSpaceId();
  await supabase.from("carousels").upsert(
    { id: "__brand__", space_id: space, name: "__brand__", slides: [brand] as never },
    { onConflict: "space_id,id" },
  );
}

export async function loadBrandFromCloud(): Promise<unknown | null> {
  const space = getSpaceId();
  const { data } = await supabase
    .from("carousels")
    .select("slides")
    .eq("space_id", space)
    .eq("id", "__brand__")
    .single();
  if (!data || !Array.isArray(data.slides) || data.slides.length === 0) return null;
  return data.slides[0];
}

export function newId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
