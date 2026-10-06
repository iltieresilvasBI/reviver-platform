import { NextRequest } from "next/server";
import { listPublishedContent, type PublicContentType } from "@/lib/public-content";

const allowed = new Set<PublicContentType>(["home_highlight","event","video","post","campaign","gallery"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as PublicContentType | null;
  if (!type || !allowed.has(type)) {
    return Response.json({ ok:false, error:"Invalid or missing content type." }, { status:400 });
  }

  try {
    const items = await listPublishedContent(type, searchParams);
    return Response.json(
      { ok:true, type, count:items.length, items },
      { headers:{ "Cache-Control":"public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch {
    return Response.json({ ok:false, error:"Unable to load published content." }, { status:500 });
  }
}
