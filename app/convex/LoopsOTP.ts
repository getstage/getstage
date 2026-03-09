import { Email } from "@convex-dev/auth/providers/Email";
import type { RandomReader } from "@oslojs/crypto/random";
import { generateRandomString } from "@oslojs/crypto/random";
import { enforceOtpRequestRateLimit } from "./rateLimits";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export const LoopsOTP = Email({
  id: "loops-otp",
  apiKey: getEnv("AUTH_LOOPS_API_KEY"),
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 6);
  },
  async sendVerificationRequest(params: {
    identifier: string;
    provider: { apiKey?: string };
    token: string;
  }) {
    const { identifier: email, provider, token } = params;
    const ctx = arguments[1] as Parameters<typeof enforceOtpRequestRateLimit>[0] | undefined;
    const transactionalId =
      getEnv("AUTH_LOOPS_TRANSACTIONAL_ID") ?? getEnv("LOOPS_TRANSACTIONAL_ID");
    if (!transactionalId) {
      throw new Error("AUTH_LOOPS_TRANSACTIONAL_ID is not set");
    }
    if (!ctx) {
      throw new Error("OTP rate limiter context is unavailable.");
    }

    await enforceOtpRequestRateLimit(ctx, email);

    const response = await fetch("https://app.loops.so/api/v1/transactional", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionalId,
        email,
        dataVariables: {
          code: token,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send OTP email: ${response.status} ${errorText}`);
    }
  },
});
