const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ""

export function hasSupabaseConfig() {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0
}

export async function selectRows<T>(table: string, query: Record<string, string> = {}) {
  return restRequest<T[]>(table, {
    method: "GET",
    query: {
      select: "*",
      ...query,
    },
  })
}

export async function upsertRows<T>(table: string, rows: unknown[], onConflict?: string) {
  return restRequest<T[]>(table, {
    method: "POST",
    query: onConflict ? { on_conflict: onConflict } : {},
    headers: {
      Prefer: "resolution=merge-duplicates, return=representation",
    },
    body: rows,
  })
}

export async function deleteRows(table: string, filters: Record<string, string>) {
  await restRequest(table, {
    method: "DELETE",
    query: filters,
    headers: {
      Prefer: "return=minimal",
    },
  })
}

export async function readAppStateValue<T>(key: string) {
  const rows = await selectRows<{ key: string; value: T }>("app_state", {
    key: `eq.${encodeFilterValue(key)}`,
  })

  return rows[0]?.value ?? null
}

export async function writeAppStateValue<T>(key: string, value: T) {
  await upsertRows("app_state", [{ key, value }], "key")
}

export async function deleteAppStateValue(key: string) {
  await deleteRows("app_state", { key: `eq.${encodeFilterValue(key)}` })
}

type RestRequestOptions = {
  method: "GET" | "POST" | "DELETE"
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: unknown
}

async function restRequest<T>(path: string, options: RestRequestOptions) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase URL or anon key is missing.")
  }

  const url = new URL(`/rest/v1/${path}`, supabaseUrl)

  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    method: options.method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${errorText || "Unknown error"}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

function encodeFilterValue(value: string) {
  return value.replaceAll(",", "\\,")
}
