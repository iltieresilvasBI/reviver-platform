import { z } from "zod";
import { getPublishedContentBySlug } from "@/lib/public-content";
import { publicJson, publicOptions } from "@/lib/api-response";

const schema = z.object({
  type: z.enum(["event", "video", "post", "campaign", "gallery", "home_highlight"]),
  slug: z.string().min(1).max(140),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({
    type: url.searchParams.get("type"),
    slug: url.searchParams.get("slug"),
  });

  if (!parsed.success) return publicJson({ error: "Invalid request" }, 400);

  try {
    const data = await getPublishedContentBySlug(parsed.data.type, parsed.data.slug);
    if (!data) return publicJson({ error: "Not found" }, 404);
    return publicJson({ data });
  } catch {
    return publicJson({ error: "Content temporarily unavailable" }, 503);
  }
}
export const OPTIONS = publicOptions;
