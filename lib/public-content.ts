import { createClient } from "@/lib/supabase/server";

export type PublicContentType =
  | "home_highlight"
  | "event"
  | "video"
  | "post"
  | "campaign"
  | "gallery";

const publicSelect =
  "id,content_type,title,slug,summary,body,event_start,event_end,event_location,campaign_start,campaign_end,cta_label,cta_url,youtube_id,featured,priority,published_at" as const;

export async function listPublishedContent(
  contentType: PublicContentType,
  searchParams: URLSearchParams,
) {
  const supabase = await createClient();

  let query = supabase
    .from("content_items")
    .select(publicSelect)
    .eq("content_type", contentType)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order(
      contentType === "event" ? "event_start" : "published_at",
      { ascending: false },
    );

  const category = searchParams.get("category");
  const network = searchParams.get("network");
  const featured = searchParams.get("featured");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  if (featured === "true") query = query.eq("featured", true);
  if (contentType === "event" && from) query = query.gte("event_start", from);
  if (contentType === "event" && to) query = query.lte("event_start", to);

  if (network) {
    const { data: networkRow } = await supabase
      .from("networks")
      .select("id")
      .eq("slug", network)
      .eq("active", true)
      .maybeSingle();

    if (!networkRow) return [];

    const { data: networkLinks, error: networkError } = await supabase
      .from("content_item_networks")
      .select("content_item_id")
      .eq("network_id", networkRow.id);

    if (networkError) throw networkError;
    const networkIds = (networkLinks ?? []).map((row) => row.content_item_id);
    if (!networkIds.length) return [];
    query = query.in("id", networkIds);
  }

  if (category) {
    const { data: categoryRow } = await supabase
      .from("content_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    if (!categoryRow) return [];

    const { data: links, error: linksError } = await supabase
      .from("content_item_categories")
      .select("content_item_id")
      .eq("category_id", categoryRow.id);

    if (linksError) throw linksError;
    const ids = (links ?? []).map((row) => row.content_item_id);
    if (!ids.length) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  return data ?? [];
}

export async function getPublishedContentBySlug(
  contentType: PublicContentType,
  slug: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(publicSelect)
    .eq("content_type", contentType)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: media, error: mediaError } = await supabase
    .from("content_media")
    .select("id,media_type,storage_path,external_url,alt_text,sort_order")
    .eq("content_item_id", data.id)
    .order("sort_order");

  if (mediaError) throw mediaError;

  return { ...data, media: media ?? [] };
}
