import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signIn, verifyCode } from "@/lib/auth";
import stageLogo from "@/assets/logos/stage-logo-light.png";

type Step = "email" | "code";

export function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email);
      setStep("code");
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
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5 && newCode.every((d) => d)) {
      handleCodeSubmit(newCode.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`);
      prev?.focus();
    }
  }

  async function handleCodeSubmit(fullCode: string) {
    setError("");
    setLoading(true);
    try {
      await verifyCode(fullCode);
      navigate({ to: "/dashboard" });
    } catch {
      setError("Invalid code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      document.getElementById("code-0")?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign in — Stage</title>
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
                    error={error}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full bg-text-primary hover:bg-text-primary/90"
                    isLoading={loading}
                  >
                    Continue
                  </Button>
                </form>
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
