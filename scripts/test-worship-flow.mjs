import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";

const root=process.cwd();
const read=(p)=>readFileSync(join(root,p),"utf8");
const check=(condition,message)=>assert.ok(condition,message);
const routes=[
  "/worship","/worship/schedules/new","/worship/substitutions","/worship/repertoire",
  "/worship/share","/worship/band-rotation","/worship/rotacao","/worship/import",
  "/worship/reports","/worship/themes","/academy"
];
for(const route of routes){
  const page=join(root,"app",route.slice(1),"page.tsx");
  const handler=join(root,"app",route.slice(1),"route.ts");
  check(existsSync(page)||existsSync(handler),"Broken internal route: "+route);
}
const main=read("app/worship/page.tsx");
const shell=read("components/app-shell.tsx");
const subs=read("app/worship/substitutions/page.tsx");
const wizard=read("app/worship/schedules/new/page.tsx");
const share=read("app/worship/share/page.tsx");
const actions=read("app/worship/actions.ts");
const substitutionActions=read("app/worship/substitutions/actions.ts");
const shareActions=read("app/worship/share/actions.ts");

const contracts=[
  [main,'href="/worship/schedules/new"',"Manager can start a schedule"],
  [main,'step=participants',"Manager can resume/edit participant planning"],
  [main,'href="/worship/repertoire"',"Manager can manage the song catalog"],
  [main,'href="/worship/substitutions"',"Users can open substitutions"],
  [main,'href="#my-schedules"',"Member has a working schedules anchor"],
  [main,'id="my-schedules"',"Schedules anchor destination exists"],
  [main,'href="#my-availability"',"Member has availability anchor"],
  [main,'id="my-availability"',"Availability anchor destination exists"],
  [main,'action={respondToWorshipAssignment}',"Attendance response action exists"],
  [main,'action={createWorshipUnavailability}',"Availability form action exists"],
  [main,'action={decideWorship}',"Leadership membership actions exist"],
  [subs,'id="request-change"',"Replacement request section exists"],
  [subs,'href="#request-change"',"Replacement request link is bound"],
  [subs,'id="backup-offers"',"Backup offer section exists"],
  [subs,'href="#backup-offers"',"Backup offer link is bound"],
  [subs,'action={requestAutomaticSubstitution}',"Replacement request form is bound"],
  [subs,'action={respondAutomaticSubstitution}',"Backup accept/refuse forms bound"],
  [wizard,'action={createScheduleAndContinue}',"Create schedule action exists"],
  [wizard,'action={autoAssignWorshipGroup}',"Assign vocal group action exists"],
  [wizard,'action={autoFillBand}',"Fill band action exists"],
  [wizard,'action={assignWorshipMember}',"Add participant action exists"],
  [wizard,'action={updateWorshipPublication}',"Publication action exists"],
  [wizard,'action={sendScheduleWhatsApp}',"WhatsApp publication action exists"],
  [wizard,'!schedule&&id!=="details"',"Wizard prevents uncreated-schedule navigation"],
  [share,'action={saveMyWorshipCommunicationPreference}',"Notification preferences save action bound"],
  [share,'href="/worship"',"Return navigation exists"],
  [shell,'variant==="worship-member"',"Member navigation is isolated"],
  [shell,'variant==="worship-leader"',"Leader navigation is isolated"],
  [actions,'export async function respondToWorshipAssignment',"Attendance handler is implemented"],
  [actions,'export async function saveMyWorshipCommunicationPreference',"Preference handler is implemented"],
  [substitutionActions,'export async function requestAutomaticSubstitution',"Substitution handler is implemented"],
  [substitutionActions,'export async function respondAutomaticSubstitution',"Backup handler is implemented"],
  [shareActions,'export async function sendScheduleWhatsApp',"WhatsApp handler is implemented"],
];
for(const [source,needle,name] of contracts){
  check(source.includes(needle),"Flow contract failed: "+name+" (missing "+needle+")");
}
check(!main.includes("PENDÊNCIAS AUTOMÁTICAS"),"Old pending cards still present");
check(!main.includes("PRONTIDÃO DO CULTO"),"Duplicate readiness dashboard still present");
check(!main.includes("Configurar escala</h2>"),"Duplicate inline schedule editor still present");
check(main.includes("Gerir integrantes"),"Manager can still administer members");
check(!wizard.includes('href={tabHref(schedule?.id,id)}') || wizard.includes('!schedule&&id!=="details"'),"Wizard tab guards missing");
for(const [name,s] of [["main",main],["subs",subs],["wizard",wizard],["share",share]]){
  check(!/<button(?:\s[^>]*)?\/>/.test(s),"Unexpected empty button in "+name);
}
console.log("PASS: "+routes.length+" internal routes, "+contracts.length+" journey/action contracts and anti-redundancy checks");
