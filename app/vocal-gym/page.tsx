import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { GymClient } from "./gym-client";

export default async function VocalGymPage(){
  const {email}=await requireUser();
  return <AppShell title="Vocal Gym" active="/vocal-gym" email={email}><GymClient/></AppShell>
}
