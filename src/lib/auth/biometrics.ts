/**
 * Biometric (Fingerprint / Passkey) authentication for Stone Tech OS.
 * Uses the WebAuthn platform authenticator API (PublicKeyCredential)
 * which interfaces with native device biometric hardware (Android BiometricPrompt,
 * Touch ID / Face ID, Windows Hello).
 */
import { supabase } from "@/integrations/supabase/client";

const BIOMETRIC_PREFIX = "stos_bio_cred_";
const BIOMETRIC_SESSION_PREFIX = "stos_bio_sess_";

export interface BiometricStatus {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  isLinked: boolean;
}

/**
 * Check if the current browser and device support biometric authentication.
 */
export async function checkBiometricSupport(email?: string): Promise<BiometricStatus> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return {
      isSupported: false,
      hasPlatformAuthenticator: false,
      isLinked: false,
    };
  }

  let hasPlatformAuthenticator = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      hasPlatformAuthenticator =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    hasPlatformAuthenticator = false;
  }

  const isLinked = email ? isBiometricLinked(email) : false;

  return {
    isSupported: true,
    hasPlatformAuthenticator,
    isLinked,
  };
}

/**
 * Check if a biometric credential is already linked for a given email on this device.
 */
export function isBiometricLinked(email: string): boolean {
  if (typeof window === "undefined" || !email) return false;
  const key = `${BIOMETRIC_PREFIX}${email.trim().toLowerCase()}`;
  return !!window.localStorage.getItem(key);
}

/**
 * Register device fingerprint / biometric credential for an employee.
 */
export async function registerDeviceBiometric(
  email: string,
  userId: string,
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined" || !window.navigator.credentials) {
    throw new Error("Biometric authentication is not supported by this browser.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBytes = new TextEncoder().encode(userId || normalizedEmail);

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Stone Tech OS",
          id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: normalizedEmail,
          displayName: normalizedEmail.split("@")[0] || normalizedEmail,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // forces native platform biometric (fingerprint/face)
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Biometric registration was cancelled.");
    }

    // Save credential ID
    const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    window.localStorage.setItem(
      `${BIOMETRIC_PREFIX}${normalizedEmail}`,
      JSON.stringify({
        credId,
        registeredAt: new Date().toISOString(),
        email: normalizedEmail,
      }),
    );

    // Save current session tokens so fingerprint can restore the session later
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      saveBiometricSession(normalizedEmail, {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });
    }

    return { ok: true, message: "Fingerprint linked successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("NotAllowedError") || errorMsg.includes("abort")) {
      throw new Error("Fingerprint registration cancelled or timed out.");
    }
    throw new Error(errorMsg || "Failed to link fingerprint.");
  }
}

/**
 * Save active session tokens locally for biometric quick unlock.
 */
export function saveBiometricSession(
  email: string,
  tokens: { access_token: string; refresh_token: string },
) {
  if (typeof window === "undefined" || !email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const raw = JSON.stringify({
    ...tokens,
    savedAt: Date.now(),
  });
  window.localStorage.setItem(`${BIOMETRIC_SESSION_PREFIX}${normalizedEmail}`, btoa(raw));
}

/**
 * Authenticate using fingerprint and automatically restore user session.
 */
export async function authenticateWithBiometrics(
  email?: string,
): Promise<{ ok: boolean; email: string }> {
  if (typeof window === "undefined" || !window.navigator.credentials) {
    throw new Error("Biometric authentication is not supported by this browser.");
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : getLastBiometricEmail();
  if (!normalizedEmail) {
    throw new Error("Please enter your registered work email first to use fingerprint sign-in.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credDataRaw = window.localStorage.getItem(`${BIOMETRIC_PREFIX}${normalizedEmail}`);
  let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;

  if (credDataRaw) {
    try {
      const parsed = JSON.parse(credDataRaw);
      const binaryCredId = Uint8Array.from(atob(parsed.credId), (c) => c.charCodeAt(0));
      allowCredentials = [
        {
          id: binaryCredId,
          type: "public-key",
          transports: ["internal"],
        },
      ];
    } catch {
      // Fall back to prompting any platform credential
    }
  }

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
        allowCredentials,
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error("Fingerprint verification was cancelled.");
    }

    // Fingerprint verified by native hardware!
    // Now restore session:
    const sessionRaw = window.localStorage.getItem(`${BIOMETRIC_SESSION_PREFIX}${normalizedEmail}`);
    if (sessionRaw) {
      try {
        const tokens = JSON.parse(atob(sessionRaw));
        if (tokens.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
          if (error) {
            // If refresh token expired, try refreshSession
            const { error: refErr } = await supabase.auth.refreshSession();
            if (refErr) throw refErr;
          }
        }
      } catch (sessErr) {
        console.warn("Could not restore session from biometric cache", sessErr);
      }
    }

    return { ok: true, email: normalizedEmail };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("NotAllowedError") || errorMsg.includes("abort")) {
      throw new Error("Fingerprint verification cancelled or not recognized.");
    }
    throw new Error(errorMsg || "Fingerprint verification failed.");
  }
}

/**
 * Get the most recently used biometric email on this device.
 */
export function getLastBiometricEmail(): string | null {
  if (typeof window === "undefined") return null;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(BIOMETRIC_PREFIX)) {
      return key.replace(BIOMETRIC_PREFIX, "");
    }
  }
  return null;
}

/**
 * Unlink fingerprint for an employee.
 */
export function unlinkDeviceBiometric(email: string) {
  if (typeof window === "undefined" || !email) return;
  const normalizedEmail = email.trim().toLowerCase();
  window.localStorage.removeItem(`${BIOMETRIC_PREFIX}${normalizedEmail}`);
  window.localStorage.removeItem(`${BIOMETRIC_SESSION_PREFIX}${normalizedEmail}`);
}
