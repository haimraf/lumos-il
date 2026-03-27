import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { fetchProfileWithFallback } from "@/lib/profileAccess";
import { createClient } from "@/utils/supabase/server";

type JsonObject = Record<string, unknown>;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const initialResult = await fetchProfileWithFallback<JsonObject>(
      supabase,
      { id: user.id, email: user.email },
      "*",
    );

    if (initialResult.data) {
      return NextResponse.json({
        profile: initialResult.data,
        source: initialResult.source,
        error: null,
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey || !user.email) {
      return NextResponse.json({
        profile: null,
        source: initialResult.source,
        error:
          initialResult.error instanceof Error
            ? initialResult.error.message
            : initialResult.error ?? "Profile not found",
      });
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: profileById, error: profileByIdError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<JsonObject>();

    if (profileById) {
      return NextResponse.json({
        profile: profileById,
        source: "server-id",
        error: null,
      });
    }

    const normalizedEmail = user.email.trim();
    const { data: profileByEmail, error: profileByEmailError } = await adminClient
      .from("profiles")
      .select("*")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle<JsonObject>();

    return NextResponse.json({
      profile: profileByEmail,
      source: profileByEmail ? "server-email" : "none",
      error:
        profileByIdError?.message ||
        profileByEmailError?.message ||
        (initialResult.error instanceof Error ? initialResult.error.message : initialResult.error) ||
        null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        profile: null,
        source: "none",
        error: error instanceof Error ? error.message : "Profile lookup failed",
      },
      { status: 500 },
    );
  }
}
