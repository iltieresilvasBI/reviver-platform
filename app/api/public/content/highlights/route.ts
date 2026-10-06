import { listPublishedContent } from "@/lib/public-content";
import { publicJson, publicOptions } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const data = await listPublishedContent("home_highlight", new URL(request.url).searchParams);
    return publicJson({ data });
  } catch {
    return publicJson({ error: "Content temporarily unavailable", data: [] }, 503);
  }
}
export const OPTIONS = publicOptions;
