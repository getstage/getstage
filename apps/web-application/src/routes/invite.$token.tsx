import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { Helmet } from "react-helmet-async";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useAuth, useSignOut } from "@/lib/auth";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/invite/$token")({
  component: WorkspaceInvitePage,
});

type InvitePreview =
  | { status: "loading" | "invalid" }
  | {
      status: "pending" | "accepted" | "revoked" | "expired";
      inviterName: string;
      invitedEmail: string;
      expiresAt: number;
    };

function WorkspaceInvitePage() {
  const { token } = Route.useParams();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const signOut = useSignOut();
  const previewInvite = useAction(api.workspaceInvites.preview);
  const acceptInvite = useAction(api.workspaceInvites.accept);
  const [preview, setPreview] = useState<InvitePreview>({ status: "loading" });
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void previewInvite({ token })
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch(() => {
        if (active) setPreview({ status: "invalid" });
      });
    return () => {
      active = false;
    };
  }, [previewInvite, token]);

  async function accept() {
    if (isAccepting) return;
    setIsAccepting(true);
    setErrorMessage(null);
    try {
      await acceptInvite({ token });
      setAccepted(true);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "We could not accept this invitation."));
    } finally {
      setIsAccepting(false);
    }
  }

  const terminalStatus = accepted ? "accepted" : preview.status;
  const pendingPreview = preview.status === "pending" ? preview : null;
  const invitePath = `/invite/${token}`;

  return (
    <>
      <Helmet>
        <title>Join a Stage workspace</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] px-4 py-10">
        <section className="w-full max-w-[440px] rounded-[8px] bg-white p-8 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <img src={stageLogo} alt="Stage" className="h-[23px] w-auto" />

          {terminalStatus === "loading" || isAuthLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#8782F5] border-t-transparent" />
            </div>
          ) : terminalStatus === "pending" && pendingPreview ? (
            <div className="mt-8">
              <h1 className="text-[24px] font-semibold leading-[1.2] text-[#0A0A0A]">
                Join {pendingPreview.inviterName}&apos;s workspace
              </h1>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#525252]">
                You&apos;ve been invited to collaborate on projects in Stage. Continue with
                <strong className="font-semibold text-[#171717]"> {pendingPreview.invitedEmail}</strong>.
              </p>

              {errorMessage ? (
                <p className="mt-4 text-[13px] font-medium leading-[1.5] text-[#B91C1C]">
                  {errorMessage}
                </p>
              ) : null}

              {isAuthenticated ? (
                <div className="mt-7 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => void accept()}
                    disabled={isAccepting}
                    className="inline-flex h-10 items-center justify-center rounded-[6px] bg-[#171717] px-4 text-[13px] font-semibold text-white hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAccepting ? "Joining..." : "Accept invitation"}
                  </button>
                  <p className="text-center text-[12px] text-[#737373]">
                    Signed in as {user?.email}
                  </p>
                  {errorMessage ? (
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="text-[12px] font-medium text-[#525252] underline underline-offset-2"
                    >
                      Sign in with another account
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.assign(`/auth?redirect=${encodeURIComponent(invitePath)}`);
                  }}
                  className="mt-7 inline-flex h-10 w-full items-center justify-center rounded-[6px] bg-[#171717] px-4 text-[13px] font-semibold text-white hover:bg-[#262626]"
                >
                  Sign in or create an account
                </button>
              )}
            </div>
          ) : terminalStatus === "accepted" ? (
            <InviteResult
              title="You're in"
              body="The workspace has been added to your Stage account. Open Stage and sign in with the same email address."
              showDownload
            />
          ) : terminalStatus === "expired" ? (
            <InviteResult
              title="This invitation expired"
              body="Ask the workspace owner to resend the invitation from Settings → Team."
            />
          ) : terminalStatus === "revoked" ? (
            <InviteResult
              title="This invitation was revoked"
              body="Contact the workspace owner if you still need access."
            />
          ) : (
            <InviteResult
              title="Invalid invitation"
              body="This invitation link is not valid. Ask the workspace owner for a new one."
            />
          )}
        </section>
      </main>
    </>
  );
}

function InviteResult({ title, body, showDownload = false }: { title: string; body: string; showDownload?: boolean }) {
  return (
    <div className="mt-8">
      <h1 className="text-[24px] font-semibold leading-[1.2] text-[#0A0A0A]">{title}</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#525252]">{body}</p>
      {showDownload ? (
        <a
          href="/download/mac"
          className="mt-7 inline-flex h-10 w-full items-center justify-center rounded-[6px] bg-[#171717] px-4 text-[13px] font-semibold text-white hover:bg-[#262626]"
        >
          Download or open Stage
        </a>
      ) : null}
    </div>
  );
}
