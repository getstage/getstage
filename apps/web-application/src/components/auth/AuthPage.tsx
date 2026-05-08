import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "motion/react";
import { useSignIn } from "@/lib/auth";
import {
  getPendingDesktopAuthRedirect,
  isDesktopAuthRedirect,
  storePendingDesktopAuthRedirect,
} from "@/lib/desktopAuthRedirect";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { signInEmailSchema, verificationCodeSchema } from "@/lib/validation";
import { isDemoAuthEnabledForHostname } from "../../../shared/demoAuth";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";

type Step = "email" | "code";

export function AuthPage() {
  const navigate = useNavigate();
  const { desktop_redirect_uri, desktop_state, redirect } = useSearch({ from: "/auth" });
  const pendingDesktopRedirect = getPendingDesktopAuthRedirect();
  const desktopAuthRedirect = getDesktopAuthRedirect({
    redirectUri: desktop_redirect_uri,
    state: desktop_state,
  });
  const redirectTo = desktopAuthRedirect ?? redirect ?? pendingDesktopRedirect ?? "/dashboard";
  const { isAuthenticated } = useConvexAuth();
  const signIn = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeAuthFlowRef = useRef<null | "email" | "code" | "google" | "demo">(null);
  const showDemoSignIn =
    typeof window !== "undefined" ? isDemoAuthEnabledForHostname(window.location.hostname) : true;

  useEffect(() => {
    if (isAuthenticated) {
      activeAuthFlowRef.current = null;
      setLoading(false);
      if (isDesktopAuthRedirect(redirectTo)) {
        storePendingDesktopAuthRedirect(redirectTo);
        console.info("[stage-desktop-auth] resuming desktop auth after existing session");
        window.location.assign(redirectTo);
        return;
      }
      navigate({ to: redirectTo, replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  if (isAuthenticated) {
    return null;
  }

  function focusCodeInput(index: number) {
    const input = document.getElementById(`code-${index}`);
    input?.focus();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeAuthFlowRef.current) {
      return;
    }

    const parsed = signInEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a valid email address.");
      return;
    }

    const normalizedEmail = parsed.data.email;

    setError("");
    activeAuthFlowRef.current = "email";
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", normalizedEmail);
      await signIn("loops-otp", formData);
      setEmail(normalizedEmail);
      setStep("code");
    } catch (error) {
      setError(
        toUserFacingErrorMessage(
          error,
          "We could not send your sign-in code. Please try again.",
        ),
      );
    } finally {
      if (activeAuthFlowRef.current === "email") {
        activeAuthFlowRef.current = null;
      }
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      focusCodeInput(index + 1);
    }

    // Auto-submit when all 6 digits filled
    if (newCode.every((digit) => digit)) {
      handleCodeSubmit(newCode.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      focusCodeInput(index - 1);
    }
  }

  function handleCodePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();

    const pastedDigits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedDigits) {
      return;
    }

    const nextCode = [...code];
    const digitsToInsert = pastedDigits.slice(0, nextCode.length - index).split("");

    digitsToInsert.forEach((digit, offset) => {
      nextCode[index + offset] = digit;
    });

    setCode(nextCode);

    if (nextCode.every((digit) => digit)) {
      void handleCodeSubmit(nextCode.join(""));
      return;
    }

    const nextEmptyIndex = nextCode.findIndex((digit) => !digit);
    focusCodeInput(nextEmptyIndex >= 0 ? nextEmptyIndex : Math.min(index + digitsToInsert.length, 5));
  }

  async function handleCodeSubmit(fullCode: string) {
    if (activeAuthFlowRef.current) {
      return;
    }

    const parsed = verificationCodeSchema.safeParse({ code: fullCode });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Code must be 6 digits.");
      setCode(["", "", "", "", "", ""]);
      focusCodeInput(0);
      return;
    }

    setError("");
    activeAuthFlowRef.current = "code";
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", parsed.data.code);
      await signIn("loops-otp", formData);
      if (isDesktopAuthRedirect(redirectTo)) {
        storePendingDesktopAuthRedirect(redirectTo);
        window.location.assign(redirectTo);
        return;
      }

      navigate({ to: redirectTo, replace: true });
    } catch (error) {
      setError(
        toUserFacingErrorMessage(
          error,
          "That code didn't work. Enter the latest 6-digit code from your email and try again.",
        ),
      );
      setCode(["", "", "", "", "", ""]);
      focusCodeInput(0);
    } finally {
      if (activeAuthFlowRef.current === "code") {
        activeAuthFlowRef.current = null;
      }
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (activeAuthFlowRef.current) {
      return;
    }

    setError("");
    activeAuthFlowRef.current = "google";
    setLoading(true);
    let redirected = false;
    try {
      if (isDesktopAuthRedirect(redirectTo)) {
        storePendingDesktopAuthRedirect(redirectTo);
        console.info("[stage-desktop-auth] starting google sign-in for desktop auth");
      }

      const result = await signIn("google", { redirectTo });
      redirected = result.redirect !== undefined;
    } catch (error) {
      setError(
        toUserFacingErrorMessage(
          error,
          "Google sign-in is temporarily unavailable. Please try again.",
        ),
      );
    } finally {
      if (!redirected && activeAuthFlowRef.current === "google") {
        activeAuthFlowRef.current = null;
        setLoading(false);
      }
    }
  }

  async function handleDemoSignIn() {
    if (activeAuthFlowRef.current) {
      return;
    }

    setError("");
    activeAuthFlowRef.current = "demo";
    setLoading(true);
    try {
      await signIn("demo");
    } catch (error) {
      setError(
        toUserFacingErrorMessage(
          error,
          "Demo sign-in is temporarily unavailable. Please try again.",
        ),
      );
    } finally {
      if (activeAuthFlowRef.current === "demo") {
        activeAuthFlowRef.current = null;
      }
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign in — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-dvh bg-white p-2 lg:h-dvh lg:overflow-hidden lg:bg-[#F5F5F5] lg:p-1">
        <div className="min-h-[calc(100dvh-16px)] bg-white lg:h-[calc(100dvh-8px)] lg:min-h-0 lg:overflow-hidden lg:rounded-[8px] lg:border lg:border-[#F5F5F5] lg:p-2">
          <div className="grid min-h-[calc(100dvh-16px)] rounded-[12px] lg:flex lg:h-full lg:min-h-0 lg:overflow-hidden">
            <section className="flex min-h-0 flex-col items-center px-3 pt-3 lg:flex-1 lg:flex-row lg:justify-center lg:overflow-hidden lg:px-[74px] lg:py-0">
              <div className="relative flex h-[min(400px,40dvh)] w-full shrink-0 items-center justify-center overflow-hidden rounded-[8px] lg:hidden">
                <img
                  src="/auth/auth-mobile.webp"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-h-0 w-full max-w-[508px] flex-1 flex-col justify-between py-[44px] lg:h-full lg:flex-none lg:py-[100px]">
                <div>
                  <img src={stageLogo} alt="Stage" className="mb-8 h-[23px] w-auto" />

                  <AnimatePresence mode="wait">
                    {step === "email" ? (
                      <motion.div
                        key="email"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="mb-6">
                          <h1 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
                            Sign up with Stage
                          </h1>
                          <p className="mt-1.5 text-[14px] leading-[1.5] font-medium text-[#525252] lg:mt-2.5 lg:text-[13px]">
                            Enter your basic details to get started with Stage
                          </p>
                        </div>

                        <form onSubmit={handleEmailSubmit}>
                          <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                            <div className="flex flex-col gap-4 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                              <div className="flex flex-col gap-2">
                                <label
                                  htmlFor="auth-email"
                                  className="block text-[14px] leading-none font-medium text-[#171717] lg:text-[13px]"
                                >
                                  Email Address
                                </label>
                                <input
                                  id="auth-email"
                                  type="email"
                                  value={email}
                                  onChange={(event) => setEmail(event.target.value)}
                                  placeholder="heypratik@baseframe.design"
                                  autoFocus
                                  className={cn(
                                    "h-[38px] w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-normal text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#737373] lg:text-[12px] lg:font-medium",
                                    "focus:bg-white focus:ring-1 focus:ring-[#6D67D3]/35",
                                    error && step === "email" && "ring-1 ring-destructive/50",
                                  )}
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <label
                                  htmlFor="auth-password"
                                  className="block text-[14px] leading-none font-medium text-[#171717] lg:text-[13px]"
                                >
                                  Enter Password
                                </label>
                                <input
                                  id="auth-password"
                                  type="password"
                                  value={password}
                                  onChange={(event) => setPassword(event.target.value)}
                                  placeholder="heypr@tik15t0-1"
                                  className="h-[38px] w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-normal text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#737373] focus:bg-white focus:ring-1 focus:ring-[#6D67D3]/35 lg:text-[12px] lg:font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          {error && step === "email" ? (
                            <p className="mt-3 text-[13px] leading-normal text-destructive">{error}</p>
                          ) : null}

                          <button
                            type="submit"
                            disabled={loading}
                            className="mt-3 inline-flex h-[38px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-4 text-[14px] font-medium text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:opacity-50 lg:h-9 lg:text-[13px]"
                          >
                            {loading && activeAuthFlowRef.current === "email" ? (
                              <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : null}
                            Sign up
                          </button>
                        </form>

                        <div className="my-3 flex items-center gap-2">
                          <div className="h-px flex-1 bg-[#E5E5E5]" />
                          <span className="text-[13px] leading-[1.5] font-medium text-[#737373]">OR</span>
                          <div className="h-px flex-1 bg-[#E5E5E5]" />
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[6px] bg-white px-3 text-[14px] font-medium text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.3)] transition-colors hover:bg-[#FAFAFA] disabled:cursor-default disabled:opacity-50 lg:text-[13px]"
                        >
                          <GoogleIcon />
                          Continue with Google
                        </button>

                        {showDemoSignIn ? (
                          <button
                            type="button"
                            onClick={handleDemoSignIn}
                            disabled={loading}
                            className="sr-only"
                            aria-hidden="true"
                            tabIndex={-1}
                          >
                            Continue with demo
                          </button>
                        ) : null}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="code"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="mb-6">
                          <h1 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
                            Check your email
                          </h1>
                          <p className="mt-2.5 text-[13px] leading-[1.5] font-medium text-[#525252]">
                            We sent a code to <span className="text-[#0A0A0A]">{email}</span>
                          </p>
                        </div>

                        <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                            <label className="mb-2 block text-[13px] leading-none font-medium text-[#171717]">
                              Verification Code
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                              {code.map((digit, i) => (
                                <input
                                  key={i}
                                  id={`code-${i}`}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(event) => handleCodeChange(i, event.target.value)}
                                  onPaste={(event) => handleCodePaste(i, event)}
                                  onKeyDown={(event) => handleCodeKeyDown(i, event)}
                                  autoFocus={i === 0}
                                  className="h-11 min-w-0 rounded-[6px] bg-[#F5F5F5] text-center text-[18px] font-semibold text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-[#6D67D3]/35"
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {error ? (
                          <p className="mt-3 text-[13px] leading-normal text-destructive">{error}</p>
                        ) : null}

                        {loading ? (
                          <div className="mt-4 flex justify-center">
                            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#6D67D3] border-t-transparent" />
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            setStep("email");
                            setCode(["", "", "", "", "", ""]);
                            setError("");
                          }}
                          className="mt-6 cursor-pointer text-[13px] font-medium text-[#525252] underline underline-offset-2 transition-colors hover:text-[#0A0A0A]"
                        >
                          Use a different email
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex justify-center gap-1 text-[14px] leading-[1.5] font-medium lg:mt-12 lg:text-[13px]">
                  <span className="text-[#525252]">Already have a account?</span>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="cursor-pointer text-[#0A0A0A] underline underline-offset-2 disabled:cursor-default disabled:opacity-50"
                  >
                    Login
                  </button>
                </div>
              </div>
            </section>

            <section className="hidden min-h-0 py-1 pr-1 lg:flex lg:w-[calc((100dvh-32px)*0.76+4px)] lg:flex-none lg:items-center lg:justify-end">
              <div className="relative flex h-full w-full items-center justify-end overflow-hidden rounded-[8px]">
                <img
                  src="/auth/auth.webp"
                  alt=""
                  className="h-full max-h-full w-auto object-contain object-right"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getDesktopAuthRedirect(args: {
  redirectUri?: string;
  state?: string;
}) {
  if (!args.redirectUri || !args.state) {
    return null;
  }

  try {
    const redirectUri = new URL(args.redirectUri);

    if (redirectUri.protocol !== "stage:" || redirectUri.hostname !== "auth") {
      return null;
    }

    const search = new URLSearchParams({
      redirect_uri: redirectUri.toString(),
      state: args.state,
    });

    return `/auth/desktop?${search.toString()}`;
  } catch {
    return null;
  }
}
