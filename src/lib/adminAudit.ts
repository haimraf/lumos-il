import type { SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type AdminActor = {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

export type AdminAuditInput = AdminActor & {
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  targetLabel?: string | null;
  details?: JsonRecord;
};

async function resolveActor(
  supabase: SupabaseClient,
  actorId?: string | null,
  fallback?: AdminActor,
) {
  if (!actorId) {
    return {
      actorName: fallback?.actorName || "צוות הטירה",
      actorRole: fallback?.actorRole || null,
    };
  }

  if (fallback?.actorName && fallback?.actorRole) {
    return {
      actorName: fallback.actorName,
      actorRole: fallback.actorRole,
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", actorId)
    .maybeSingle();

  return {
    actorName: fallback?.actorName || data?.full_name || "צוות הטירה",
    actorRole: fallback?.actorRole || data?.role || null,
  };
}

export async function logAdminAudit(
  supabase: SupabaseClient,
  input: AdminAuditInput,
) {
  try {
    const actor = await resolveActor(supabase, input.actorId, input);

    await supabase.from("admin_audit_logs").insert({
      actor_id: input.actorId || null,
      actor_name: actor.actorName,
      actor_role: actor.actorRole,
      action: input.action,
      target_type: input.targetType || null,
      target_id: input.targetId != null ? String(input.targetId) : null,
      target_label: input.targetLabel || null,
      details: input.details || {},
    });
  } catch (error) {
    console.warn("[admin-audit] failed to log action", error);
  }
}
