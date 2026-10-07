import { publicJson, publicOptions } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(){
  try{
    const supabase=await createClient();
    const [{data:songs,error:songsError},{data:schedules,error:schedulesError}]=await Promise.all([
      supabase.from("worship_songs")
        .select("id,title,artist,composition_title,version_name,original_key,recommended_key,youtube_url,spotify_url,apple_music_url,deezer_url,chord_url,lyrics_url,themes,public_visible")
        .eq("public_visible",true)
        .eq("active",true)
        .is("archived_at",null)
        .order("title"),
      supabase.from("worship_schedules")
        .select("id,title,service_type,starts_at,themes,public_repertoire,publication_state")
        .eq("public_repertoire",true)
        .eq("publication_state","published")
        .neq("status","cancelled")
        .order("starts_at",{ascending:false})
        .limit(12),
    ]);
    if(songsError) throw songsError;
    if(schedulesError) throw schedulesError;

    const scheduleIds=(schedules??[]).map((s:any)=>s.id);
    const {data:setlist,error:setlistError}=scheduleIds.length
      ?await supabase.from("worship_schedule_songs")
        .select("schedule_id,song_id,position,key_override")
        .in("schedule_id",scheduleIds)
        .order("position")
      :{data:[],error:null};
    if(setlistError) throw setlistError;

    return publicJson({
      ok:true,
      songs:songs??[],
      repertoires:(schedules??[]).map((schedule:any)=>({
        ...schedule,
        songs:(setlist??[]).filter((row:any)=>row.schedule_id===schedule.id),
      })),
    },200);
  }catch{
    return publicJson({ok:false,error:"Unable to load public worship repertoire."},503);
  }
}
export const OPTIONS=publicOptions;
