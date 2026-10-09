import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeIcs(value:string){
  return value
    .replace(/\\/g,"\\\\")
    .replace(/\r\n|\r|\n/g,"\\n")
    .replace(/,/g,"\\,")
    .replace(/;/g,"\\;");
}

function icsDate(value:string){
  return new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
}

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) return new NextResponse("Unauthorized",{status:401});

  const {data:network}=await supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  if(!network) return new NextResponse("Worship network not configured",{status:404});

  const {data:membership}=await supabase
    .from("network_memberships")
    .select("id,status")
    .eq("network_id",network.id)
    .eq("user_id",String(uid))
    .maybeSingle();

  if(!membership||membership.status!=="active") return new NextResponse("Forbidden",{status:403});

  const {data:assignments,error:assignmentError}=await supabase
    .from("worship_schedule_members")
    .select("id,schedule_id,role")
    .eq("membership_id",membership.id);
  if(assignmentError) return new NextResponse(assignmentError.message,{status:500});

  const scheduleIds=[...new Set((assignments??[]).map((a:any)=>a.schedule_id))];
  const {data:schedules,error:scheduleError}=scheduleIds.length
    ?await supabase.from("worship_schedules").select("id,title,service_type,starts_at,call_time,group_code,status,notes").in("id",scheduleIds).neq("status","cancelled").order("starts_at")
    :{data:[] as any[],error:null};
  if(scheduleError) return new NextResponse(scheduleError.message,{status:500});

  const {data:rehearsals,error:rehearsalError}=await supabase
    .from("worship_rehearsals")
    .select("id,schedule_id,title,starts_at,ends_at,location,notes")
    .order("starts_at");
  if(rehearsalError) return new NextResponse(rehearsalError.message,{status:500});

  const ownScheduleIds=new Set(scheduleIds);
  const visibleRehearsals=(rehearsals??[]).filter((r:any)=>!r.schedule_id||ownScheduleIds.has(r.schedule_id));
  const rolesBySchedule=new Map<string,string[]>();
  for(const assignment of assignments??[]){
    const roles=rolesBySchedule.get(assignment.schedule_id)??[];
    if(assignment.role&&!roles.includes(assignment.role)) roles.push(assignment.role);
    rolesBySchedule.set(assignment.schedule_id,roles);
  }

  const events:string[]=[];
  for(const schedule of schedules??[]){
    const roles=rolesBySchedule.get(schedule.id)??[];
    const start=schedule.call_time??schedule.starts_at;
    const end=new Date(new Date(schedule.starts_at).getTime()+2*60*60*1000).toISOString();
    events.push([
      "BEGIN:VEVENT",
      `UID:worship-schedule-${schedule.id}@reviver`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcs(schedule.title)}`,
      `DESCRIPTION:${escapeIcs([schedule.service_type,roles.length?`Funções: ${roles.join(", ")}`:null,schedule.group_code?`Grupo ${schedule.group_code}`:null,schedule.notes].filter(Boolean).join(" · "))}`,
      "END:VEVENT"
    ].join("\r\n"));
  }

  for(const rehearsal of visibleRehearsals){
    const end=rehearsal.ends_at??new Date(new Date(rehearsal.starts_at).getTime()+90*60*1000).toISOString();
    events.push([
      "BEGIN:VEVENT",
      `UID:worship-rehearsal-${rehearsal.id}@reviver`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(rehearsal.starts_at)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcs("Ensaio · "+rehearsal.title)}`,
      rehearsal.location?`LOCATION:${escapeIcs(rehearsal.location)}`:null,
      rehearsal.notes?`DESCRIPTION:${escapeIcs(rehearsal.notes)}`:null,
      "END:VEVENT"
    ].filter(Boolean).join("\r\n"));
  }

  const body=[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reviver//Worship Calendar//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    ""
  ].join("\r\n");

  return new NextResponse(body,{
    status:200,
    headers:{
      "Content-Type":"text/calendar; charset=utf-8",
      "Content-Disposition":"attachment; filename=reviver-louvor.ics",
      "Cache-Control":"private, no-store"
    }
  });
}
