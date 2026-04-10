import { createBrowserClient } from "@supabase/ssr";

const missingSupabaseEnvError = {
  message: "Supabase client environment variables are missing.",
};

type NoopQueryResult = {
  count: number;
  data: null;
  error: typeof missingSupabaseEnvError;
};

function hasSupabaseBrowserEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function createNoopQueryBuilder() {
  const result: NoopQueryResult = {
    count: 0,
    data: null,
    error: missingSupabaseEnvError,
  };

  const builder = new Proxy(
    {
      then(onFulfilled?: (value: NoopQueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    },
    {
      get(target, prop, receiver) {
        if (prop === "count") return result.count;
        if (prop === "data") return result.data;
        if (prop === "error") return result.error;
        if (prop === "then") return target.then.bind(target);
        return () => receiver;
      },
    },
  );

  return builder;
}

function createNoopChannel() {
  const channel = new Proxy(
    {
      subscribe() {
        return channel;
      },
      unsubscribe() {},
    },
    {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        return () => receiver;
      },
    },
  );

  return channel;
}

function createNoopClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: missingSupabaseEnvError }),
      getUser: async () => ({ data: { user: null }, error: missingSupabaseEnvError }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: missingSupabaseEnvError }),
      signOut: async () => ({ error: missingSupabaseEnvError }),
      signUp: async () => ({ data: { session: null, user: null }, error: missingSupabaseEnvError }),
      updateUser: async () => ({ data: { user: null }, error: missingSupabaseEnvError }),
    },
    channel: () => createNoopChannel(),
    from: () => createNoopQueryBuilder(),
    removeChannel: async () => "ok" as const,
    rpc: async () => ({ data: null, error: missingSupabaseEnvError }),
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        upload: async () => ({ data: null, error: missingSupabaseEnvError }),
      }),
    },
  };
}

function createTypedBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type BrowserSupabaseClient = ReturnType<typeof createTypedBrowserClient>;

let browserClient: BrowserSupabaseClient | null = null;

export function createClient(): BrowserSupabaseClient {
  if (typeof window === "undefined" || !hasSupabaseBrowserEnv()) {
    return createNoopClient() as unknown as BrowserSupabaseClient;
  }

  if (!browserClient) {
    browserClient = createTypedBrowserClient();
  }

  return browserClient;
}
