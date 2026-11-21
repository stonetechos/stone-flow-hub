/**
 * Firebase Cloud Messaging (FCM) HTTP v1 Server Dispatcher
 *
 * Dispatches high-priority push notifications to registered Android/iOS
 * devices via Google's official FCM v1 REST API.
 *
 * Runs in Node 22 and Cloudflare Workers (nodejs_compat).
 * Authenticates using the Firebase Admin Service Account key.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ServiceAccountKey {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface FcmMessagePayload {
  title: string;
  body?: string;
  linkPath?: string;
  entityType?: string;
  entityId?: string;
  tier?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Resolves the service account configuration from process.env.FIREBASE_SERVICE_ACCOUNT_KEY
 * or fallback local paths during development.
 */
function getServiceAccount(): ServiceAccountKey | null {
  const envVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envVal && envVal.trim()) {
    try {
      let raw = envVal.trim();
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = JSON.parse(raw);
      }
      if (raw.startsWith("{")) {
        return JSON.parse(raw) as ServiceAccountKey;
      }
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      return JSON.parse(decoded) as ServiceAccountKey;
    } catch (err) {
      console.error("[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env", err);
    }
  }

  // Development fallback for local machine
  if (typeof process !== "undefined" && process.platform === "darwin") {
    try {
      const defaultPath =
        "/Users/stonetech/Downloads/stos-48add-firebase-adminsdk-fbsvc-d706fcf228.json";
      if (fs.existsSync(defaultPath)) {
        return JSON.parse(fs.readFileSync(defaultPath, "utf8")) as ServiceAccountKey;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Generates an OAuth2 access token for Google APIs with scope
 * `https://www.googleapis.com/auth/firebase.messaging`.
 */
async function getFcmAccessToken(sa: ServiceAccountKey): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  try {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: sa.token_uri || "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
      }),
    ).toString("base64url");

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(sa.private_key, "base64url");
    const assertion = `${header}.${payload}.${signature}`;

    const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[FCM] OAuth2 token exchange failed HTTP ${res.status}: ${text}`);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedAccessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600);
    return cachedAccessToken;
  } catch (err) {
    console.error("[FCM] Error generating FCM access token", err);
    return null;
  }
}

/**
 * Sends a single FCM notification message to a specific device registration token.
 */
export async function sendFcmToToken(
  token: string,
  payload: FcmMessagePayload,
): Promise<{ success: boolean; error?: string }> {
  const sa = getServiceAccount();
  if (!sa) {
    return { success: false, error: "Firebase Service Account key not configured" };
  }

  const accessToken = await getFcmAccessToken(sa);
  if (!accessToken) {
    return { success: false, error: "Failed to obtain FCM access token" };
  }

  const formattedTitle = payload.title.startsWith("STOS")
    ? payload.title
    : `STOS · ${payload.title}`;

  const message = {
    token,
    notification: {
      title: formattedTitle,
      body: payload.body || "",
    },
    android: {
      priority: "high" as const,
      notification: {
        channel_id: "stos_operations",
        icon: "ic_stat_stos",
        color: "#0f766e",
        default_sound: true,
        default_vibrate_timings: true,
        click_action: "OPEN_STOS_APP",
      },
    },
    data: {
      linkPath: payload.linkPath || "/dashboard",
      entityType: payload.entityType || "",
      entityId: payload.entityId || "",
      tier: payload.tier || "info",
    },
  };

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Fetches all FCM tokens registered for a target user ID or broadcast set,
 * and sends push notifications to all their active devices.
 */
export async function dispatchFcmNotification(
  supabaseAdmin: SupabaseClient,
  opts: {
    userId?: string | null;
    targetRole?: "all" | "admin";
    title: string;
    body?: string;
    linkPath?: string;
    entityType?: string;
    entityId?: string;
    tier?: string;
  },
): Promise<{ sentCount: number }> {
  try {
    let targetUserIds: string[] = [];

    if (opts.userId) {
      targetUserIds = [opts.userId];
    } else if (opts.targetRole === "admin") {
      const { data: adminRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);
      targetUserIds = Array.from(new Set((adminRows || []).map((r) => r.user_id).filter(Boolean)));
    } else {
      // Broadcast to all active users
      const { data: allProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("is_active", true);
      targetUserIds = (allProfiles || []).map((p) => p.id);
    }

    if (targetUserIds.length === 0) {
      return { sentCount: 0 };
    }

    // Retrieve FCM tokens from profiles.preferences
    const { data: profileRows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, preferences")
      .in("id", targetUserIds);

    if (error || !profileRows) {
      return { sentCount: 0 };
    }

    const allTokens: string[] = [];
    for (const row of profileRows) {
      const prefs = (row.preferences as Record<string, unknown>) || {};
      const tokens = prefs.fcm_tokens;
      if (Array.isArray(tokens)) {
        for (const t of tokens) {
          if (typeof t === "string" && t.length > 20 && !allTokens.includes(t)) {
            allTokens.push(t);
          }
        }
      }
    }

    if (allTokens.length === 0) {
      return { sentCount: 0 };
    }

    let sentCount = 0;
    await Promise.all(
      allTokens.map(async (token) => {
        const res = await sendFcmToToken(token, {
          title: opts.title,
          body: opts.body,
          linkPath: opts.linkPath,
          entityType: opts.entityType,
          entityId: opts.entityId,
          tier: opts.tier,
        });
        if (res.success) {
          sentCount++;
        } else {
          console.warn(`[FCM] Delivery failed for token: ${res.error}`);
        }
      }),
    );

    return { sentCount };
  } catch (err) {
    console.error("[FCM] dispatchFcmNotification error", err);
    return { sentCount: 0 };
  }
}
