import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Use this in Server Components (layouts/pages) where cookies are immutable.
 * We only READ cookies here; set/remove are no-ops to avoid Next 15 warnings.
 */
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies(); // immutable in RSC (Promise in Next 15)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops in Server Components to avoid "Cookies can only be modified..." error
        set() {
          /* no-op in RSC */
        },
        remove() {
          /* no-op in RSC */
        },
      },
    }
  );
}

/**
 * Use this ONLY inside Server Actions / Route Handlers where cookies are mutable.
 * Example: sign-in, sign-out, auth mutations, etc.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // mutable in Server Actions / Route Handlers

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In actions/handlers, cookies() is mutable, so this is allowed.
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
