import { notFound } from "next/navigation";
import { SitePage } from "@/components/site-exact";
import { getSiteDynamicData, pathExists } from "@/lib/site-data";

export async function PublicSitePage({ path }: { path: string }) {
  const data = await getSiteDynamicData();
  if (!pathExists(path, data)) notFound();
  return <SitePage path={path} data={data} />;
}
