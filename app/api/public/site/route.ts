import { getSiteDynamicData } from "@/lib/site-data";

export async function GET() {
  try {
    const data = await getSiteDynamicData();
    return Response.json(
      { ok:true, data },
      { headers:{ "Cache-Control":"public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch {
    return Response.json({ ok:false, error:"Unable to load site data." }, { status:500 });
  }
}
