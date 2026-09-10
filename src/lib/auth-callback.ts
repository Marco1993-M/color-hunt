import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next-path";

export async function handleAuthCallback(
  request: NextRequest,
  options?: {
    next?: string;
    transferTripId?: string | null;
    guestUserId?: string | null;
  },
) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const transferTripId = options?.transferTripId ?? requestUrl.searchParams.get("transferTripId");
  const guestUserId = options?.guestUserId ?? requestUrl.searchParams.get("guestUserId");
  const next = safeNextPath(
    options?.next ||
    requestUrl.searchParams.get("next") ||
    (transferTripId ? `/trips/${transferTripId}/poster` : "/dashboard"));
  const handoffUrl = new URL("/auth/finish", request.url);
  handoffUrl.searchParams.set("next", next);
  if (transferTripId) {
    handoffUrl.searchParams.set("transferTripId", transferTripId);
  }
  if (guestUserId) {
    handoffUrl.searchParams.set("guestUserId", guestUserId);
  }
  const response = NextResponse.redirect(handoffUrl);

  if (code) {
    const env = getSupabaseEnv();
    const supabase = createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      handoffUrl.searchParams.set("error", "Sign-in could not be completed. Please try again.");
      response.headers.set("location", handoffUrl.toString());
    }
  }

  return response;
}
