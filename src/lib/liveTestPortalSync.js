import { supabase } from "./supabaseClient.js";

const LIVE_SYNC_ENABLED =
  String(import.meta.env.VITE_NLF_LIVE_TEST_SYNC || "").toLowerCase() === "true";

const PORTAL_STATE_STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const PORTAL_STATE_TABLE = "no_limit_test_portal_state";
const PORTAL_STATE_ID =
  import.meta.env.VITE_NLF_LIVE_TEST_SYNC_KEY || "client-feedback-v1";

const POLL_INTERVAL_MS = 15000;
const PUSH_DEBOUNCE_MS = 700;

let syncInstalled = false;
let suppressUpload = false;
let pushTimer = null;
let remoteUpdatedAt = null;
let lastPushedStateString = "";

function hasSupabaseClient() {
  return Boolean(supabase && typeof supabase.from === "function");
}

function isBrowserReady() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function setStatus(nextStatus) {
  if (!isBrowserReady()) return;

  window.__NLF_LIVE_TEST_SYNC_STATUS__ = {
    ...window.__NLF_LIVE_TEST_SYNC_STATUS__,
    ...nextStatus,
    enabled: LIVE_SYNC_ENABLED,
    hasSupabaseClient: hasSupabaseClient(),
    storageKey: PORTAL_STATE_STORAGE_KEY,
    table: PORTAL_STATE_TABLE,
    id: PORTAL_STATE_ID,
    updatedAt: new Date().toISOString(),
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function getLocalStateString() {
  if (!isBrowserReady()) return "";
  return window.localStorage.getItem(PORTAL_STATE_STORAGE_KEY) || "";
}

function getLocalStatePayload() {
  const stateString = getLocalStateString();

  if (!stateString) return null;

  return safeJsonParse(stateString);
}

function isValidPortalPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  return (
    Array.isArray(payload.clients) ||
    Array.isArray(payload.plans) ||
    Array.isArray(payload.workoutLogs) ||
    Array.isArray(payload.messages) ||
    Array.isArray(payload.notifications)
  );
}

function getUpdatedBy() {
  if (!isBrowserReady()) return "unknown";

  const params = new URLSearchParams(window.location.search);
  const isInternalTest = params.get("testUnlock") === "true";
  const portalMode =
    window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) ||
    (isInternalTest ? "internal-test" : "public-client");

  return isInternalTest ? `coach-test:${portalMode}` : "public-client";
}

async function pushPortalStateString(stateString, reason = "local-change") {
  if (!LIVE_SYNC_ENABLED || !stateString) return;

  if (!hasSupabaseClient()) {
    setStatus({
      state: "disabled",
      message: "Live sync is enabled, but Supabase client is not configured.",
      reason,
    });
    return;
  }

  const payload = safeJsonParse(stateString);

  if (!isValidPortalPayload(payload)) {
    setStatus({
      state: "skipped",
      message: "Live sync skipped invalid portal payload.",
      reason,
    });
    return;
  }

  if (stateString === lastPushedStateString) {
    return;
  }

  const updatedAt = new Date().toISOString();

  const { error } = await supabase.from(PORTAL_STATE_TABLE).upsert({
    id: PORTAL_STATE_ID,
    payload,
    updated_by: getUpdatedBy(),
    updated_at: updatedAt,
  });

  if (error) {
    setStatus({
      state: "push-error",
      message: error.message || String(error),
      reason,
    });
    return;
  }

  remoteUpdatedAt = updatedAt;
  lastPushedStateString = stateString;

  setStatus({
    state: "synced",
    message: "Live test portal state pushed to Supabase.",
    reason,
    remoteUpdatedAt,
  });
}

function schedulePush(stateString, reason = "local-change") {
  if (!LIVE_SYNC_ENABLED || suppressUpload) return;

  window.clearTimeout(pushTimer);

  pushTimer = window.setTimeout(() => {
    pushPortalStateString(stateString, reason);
  }, PUSH_DEBOUNCE_MS);
}

function isUserEditing() {
  if (!isBrowserReady()) return false;

  const activeElement = document.activeElement;

  if (!activeElement) return false;

  return ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
}

async function pullLatestPortalState({ reloadOnChange = false, reason = "pull" } = {}) {
  if (!LIVE_SYNC_ENABLED || !isBrowserReady()) return null;

  if (!hasSupabaseClient()) {
    setStatus({
      state: "disabled",
      message: "Live sync is enabled, but Supabase client is not configured.",
      reason,
    });
    return null;
  }

  const { data, error } = await supabase
    .from(PORTAL_STATE_TABLE)
    .select("payload, updated_by, updated_at")
    .eq("id", PORTAL_STATE_ID)
    .maybeSingle();

  if (error) {
    setStatus({
      state: "pull-error",
      message: error.message || String(error),
      reason,
    });
    return null;
  }

  if (!data || !isValidPortalPayload(data.payload)) {
    setStatus({
      state: "empty",
      message: "No shared live test portal state found yet.",
      reason,
    });
    return null;
  }

  const incomingString = safeJsonStringify(data.payload);
  const currentString = getLocalStateString();

  if (!incomingString) return null;

  const incomingTime = data.updated_at || null;
  const hasNewerTimestamp =
    incomingTime &&
    (!remoteUpdatedAt || Date.parse(incomingTime) > Date.parse(remoteUpdatedAt));

  const hasDifferentState = incomingString !== currentString;

  if (hasDifferentState && (hasNewerTimestamp || !remoteUpdatedAt)) {
    suppressUpload = true;
    window.localStorage.setItem(PORTAL_STATE_STORAGE_KEY, incomingString);
    suppressUpload = false;

    remoteUpdatedAt = incomingTime;
    lastPushedStateString = incomingString;

    setStatus({
      state: "pulled",
      message: "Live test portal state pulled from Supabase.",
      reason,
      remoteUpdatedAt,
      updatedBy: data.updated_by || "unknown",
    });

    if (reloadOnChange && !isUserEditing()) {
      window.location.reload();
    }
  } else {
    remoteUpdatedAt = incomingTime || remoteUpdatedAt;

    setStatus({
      state: "current",
      message: "Live test portal state is current.",
      reason,
      remoteUpdatedAt,
      updatedBy: data.updated_by || "unknown",
    });
  }

  return data.payload;
}

export async function loadLiveTestPortalState() {
  if (!LIVE_SYNC_ENABLED || !isBrowserReady()) {
    setStatus({
      state: "disabled",
      message: "Live test sync is disabled.",
    });
    return;
  }

  try {
    const remotePayload = await pullLatestPortalState({
      reloadOnChange: false,
      reason: "startup",
    });

    if (!remotePayload) {
      const localPayload = getLocalStatePayload();

      if (isValidPortalPayload(localPayload)) {
        await pushPortalStateString(safeJsonStringify(localPayload), "startup-seed");
      }
    }
  } catch (error) {
    setStatus({
      state: "startup-error",
      message: error.message || String(error),
    });
  }
}

export function installLiveTestPortalStateSync() {
  if (!LIVE_SYNC_ENABLED || !isBrowserReady() || syncInstalled) return;

  syncInstalled = true;

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

  window.localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);

    if (key === PORTAL_STATE_STORAGE_KEY && !suppressUpload) {
      schedulePush(String(value || ""), "localStorage.setItem");
    }
  };

  window.setInterval(() => {
    pullLatestPortalState({
      reloadOnChange: true,
      reason: "poll",
    });
  }, POLL_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      pullLatestPortalState({
        reloadOnChange: true,
        reason: "tab-visible",
      });
    }
  });

  window.nlfLiveTestSync = {
    pull: () =>
      pullLatestPortalState({
        reloadOnChange: true,
        reason: "manual-pull",
      }),
    push: () => pushPortalStateString(getLocalStateString(), "manual-push"),
    status: () => window.__NLF_LIVE_TEST_SYNC_STATUS__,
  };

  setStatus({
    state: "installed",
    message: "Live test sync is installed.",
  });
}
