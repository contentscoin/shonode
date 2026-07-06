(function shonodeCloudAuth() {
  const VENDOR_SUPABASE_SRC = "vendor/supabase-js-2.110.0.js";

  const state = {
    config: null,
    client: null,
    session: null,
    listeners: new Set()
  };

  const readyPromise = initialize();

  async function initialize() {
    try {
      const config = await fetchConfig();
      if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
        return false;
      }

      await loadSupabaseLibrary();
      if (!window.supabase?.createClient) {
        console.warn("[ShonodeCloud] supabase-js failed to load; staying in local mode.");
        return false;
      }

      state.config = config;
      state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      const { data } = await state.client.auth.getSession();
      state.session = data?.session || null;

      state.client.auth.onAuthStateChange((_event, session) => {
        state.session = session || null;
        state.listeners.forEach((listener) => {
          try {
            listener(state.session);
          } catch (error) {
            console.warn("[ShonodeCloud] auth listener failed.", error);
          }
        });
      });

      return true;
    } catch (error) {
      console.warn("[ShonodeCloud] Cloud mode unavailable; staying in local mode.", error);
      return false;
    }
  }

  async function fetchConfig() {
    const origin = window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "http://127.0.0.1:4173";
    const response = await fetch(`${origin}/api/config`, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = VENDOR_SUPABASE_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load vendored supabase-js."));
      document.head.appendChild(script);
    });
  }

  function requireClient() {
    if (!state.client) {
      throw new Error("클라우드 모드가 설정되지 않았습니다. SUPABASE_URL / SUPABASE_ANON_KEY를 확인하세요.");
    }
    return state.client;
  }

  window.ShonodeCloud = {
    ready: readyPromise,
    isEnabled: () => readyPromise,
    getClient: () => state.client,
    getSession: () => state.session,
    getUser: () => state.session?.user || null,
    onAuthChange(listener) {
      if (typeof listener === "function") {
        state.listeners.add(listener);
      }
      return () => state.listeners.delete(listener);
    },
    async signUpWithPassword(email, password) {
      const { data, error } = await requireClient().auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      return data;
    },
    async signInWithPassword(email, password) {
      const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      return data;
    },
    async signInWithGoogle() {
      const { data, error } = await requireClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) {
        throw error;
      }
      return data;
    },
    async signOut() {
      const { error } = await requireClient().auth.signOut();
      if (error) {
        throw error;
      }
    }
  };
})();
