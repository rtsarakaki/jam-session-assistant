"use server";

import { revalidatePath } from "next/cache";
import { createAgendaEvent, deleteAgendaEvent, listMyAgendaEvents } from "@/lib/platform/agenda-service";
import type { AgendaEventItem, AgendaEventKind } from "@/lib/platform/agenda-service";

export async function loadMyAgendaEventsAction(): Promise<{ error: string | null; items?: AgendaEventItem[] }> {
  try {
    const items = await listMyAgendaEvents();
    return { error: null, items };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not load agenda." };
  }
}

export async function createAgendaEventAction(input: {
  kind: AgendaEventKind;
  title: string;
  details?: string;
  addressText: string;
  eventAtIso: string;
  videoUrl?: string;
}): Promise<{ error: string | null }> {
  try {
    await createAgendaEvent(input);
    revalidatePath("/app/agenda");
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create event." };
  }
}

export async function deleteAgendaEventAction(eventId: string): Promise<{ error: string | null }> {
  try {
    await deleteAgendaEvent(eventId);
    revalidatePath("/app/agenda");
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete event." };
  }
}
