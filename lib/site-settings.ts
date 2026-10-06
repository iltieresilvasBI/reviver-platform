import { site, type SiteSettings } from '@/lib/site-static';

export async function getSiteSettings():Promise<SiteSettings>{
  return site;
}
