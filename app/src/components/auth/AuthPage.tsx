import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSignIn } from "@/lib/auth";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { signInEmailSchema, verificationCodeSchema } from "@/lib/validation";
import stageLogo from "@/assets/logos/stage-logo-light.png";

type Step = "email" | "code";

export function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const signIn = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  function focusCodeInput(index: number) {
    const input = document.getElementById(`code-${index}`);
    input?.focus();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a valid email address.");
      return;
    }

    const normalizedEmail = parsed.data.email;

    setError("");
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
      const parsed = verificationCodeSchema.safeParse({ code: fullCode });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Code must be 6 digits.");
      setCode(["", "", "", "", "", ""]);
      focusCodeInput(0);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", parsed.data.code);
      await signIn("loops-otp", formData);
      navigate({ to: "/dashboard", replace: true });
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
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch (error) {
      setError(
        toUserFacingErrorMessage(
          error,
          "Google sign-in is temporarily unavailable. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoSignIn() {
    setError("");
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
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign in — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img src={stageLogo} alt="Stage" className="mx-auto h-6 w-auto" />
          </div>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <p className="mb-9 text-center text-[16px] text-text-secondary">
                  Track your creative projects with clarity
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input
                    type="email"
                    className="border-transparent bg-input-bg focus:border-border focus:bg-white"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={error && step === "email" ? error : undefined}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full bg-text-primary hover:bg-text-primary/90"
                    isLoading={loading}
                  >
                    Continue with email
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-[13px] text-text-secondary">or</span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-border bg-white px-4 py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  disabled={loading}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-border bg-bg-subtle px-4 py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-white disabled:opacity-50"
                >
                  Continue with demo
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="mb-2 text-center font-heading text-[24px] font-semibold text-text-primary">
                  Check your email
                </h1>
                <p className="mb-8 text-center text-[15px] text-text-secondary">
                  We sent a code to{" "}
                  <span className="font-medium text-text-primary">{email}</span>
                </p>

                <div className="mb-4 flex justify-center gap-3">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onPaste={(e) => handleCodePaste(i, e)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="h-[60px] w-[52px] rounded-[10px] border border-transparent bg-input-bg text-center font-heading text-[24px] font-semibold text-text-primary transition-colors focus:border-accent focus:bg-white focus:outline-none"
                    />
                  ))}
                </div>

                {error && (
                  <p className="mb-4 text-center text-[13px] text-destructive">{error}</p>
                )}

                {loading && (
                  <div className="mb-4 flex justify-center">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode(["", "", "", "", "", ""]);
                      setError("");
                    }}
                    className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    ← Use a different email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
