import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ClientPortalTabBar } from "./ClientPortalTabBar";

const DEFAULT_BRAND_COLOR = "#030303";

export function ClientPortalSettingsView() {
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);

  return (
    <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <div className="flex w-full flex-col gap-[28px]">
        <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-[14px]">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">Client Portal</h1>
            <p className="mt-[8px] max-w-[360px] text-[13px] font-medium leading-[1.35] text-[#737373]">
              Create Portals for your clients to track progress
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/client-portal/$projectId/preview",
                params: { projectId: "baseframe" },
              })
            }
            className="flex h-[32px] shrink-0 items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5]"
          >
            Preview Portal
            <RedirectIcon />
          </button>
        </header>

        <ClientPortalTabBar activeTab="brand" />

        <section className="relative overflow-hidden rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="px-[12px] pb-[12px] pt-[8px] leading-[1.5] text-[#0a0a0a]">
            <h2 className="text-[13px] font-medium">Configure your brand</h2>
            <p className="text-[12px] font-normal">Your branding will be reflected on the portal link.</p>
          </div>

          <div className={isSubscribed ? "flex flex-col gap-[4px]" : "pointer-events-none flex flex-col gap-[4px] blur-[10px]"}>
            <LogoCard />
            <BrandColorCard brandColor={brandColor} onBrandColorChange={setBrandColor} />
            <DomainCard />
            <div className="flex flex-col gap-[10px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:flex-row sm:gap-[12px]">
              <button className="rounded-[6px] bg-[#fafafa] px-[24px] py-[8px] text-[13px] font-medium text-[#dc2626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" type="button">
                Clear All
              </button>
              <button className="flex items-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]" type="button">
                Save Information
                <ArrowRightIcon className="h-[16px] w-[16px]" />
              </button>
            </div>
          </div>

          {!isSubscribed ? <PortalPaywall onStartTrial={() => setIsSubscribed(true)} /> : null}
        </section>
      </div>
    </div>
  );
}

function LogoCard() {
  return (
    <div className="flex items-end justify-between rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-w-0 flex-col gap-[24px]">
        <div className="flex flex-col gap-[16px]">
          <h3 className="text-[13px] font-medium text-[#171717]">Upload Your Logo</h3>
          <div className="flex flex-wrap items-center gap-[8px]">
            <div className="flex h-[36px] w-[36px] items-center justify-center overflow-hidden rounded-full border border-[#e5e5e5] bg-[#171717] text-[10px] font-semibold text-white">
              ST
            </div>
            <button className="flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-medium text-[#525252]" type="button">
              <img src="/logos/dashboard/upload.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
              Reupload
            </button>
            <button className="text-[12px] font-medium text-[#ef4444]" type="button">Remove</button>
          </div>
        </div>
        <SecondaryButton>Save</SecondaryButton>
      </div>
    </div>
  );
}

function BrandColorCard({
  brandColor,
  onBrandColorChange,
}: {
  brandColor: string;
  onBrandColorChange: (color: string) => void;
}) {
  const formattedBrandColor = brandColor.toUpperCase();
  const pickerId = "client-portal-brand-color";

  return (
    <div className="flex flex-col gap-[12px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[16px]">
        <h3 className="text-[13px] font-medium text-[#171717]">Select your brand color</h3>
        <div className="flex flex-wrap items-center gap-[16px]">
          <label
            htmlFor={pickerId}
            className="relative h-[36px] w-[36px] shrink-0 overflow-hidden rounded-full bg-[conic-gradient(from_180deg,#ff3b30,#ffcc00,#34c759,#00c7be,#5856d6,#ff2d55,#ff3b30)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            aria-label="Choose brand color"
          >
            <span
              className="absolute inset-[9px] rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: brandColor }}
              aria-hidden="true"
            />
            <input
              id={pickerId}
              type="color"
              value={brandColor}
              onChange={(event) => onBrandColorChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Brand color"
            />
          </label>
          <label
            htmlFor={pickerId}
            className="flex cursor-pointer items-center gap-[12px] rounded-[6px] bg-[#f5f5f5] px-[12px] py-[8px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
          >
            {formattedBrandColor}
            <ChevronDownIcon className="h-[16px] w-[16px]" />
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-[8px]">
        <h3 className="text-[13px] font-medium text-[#171717]">Preview</h3>
        <div className="rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[20px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="h-[6px] overflow-hidden rounded-full bg-[#e5e5e5]">
              <div className="h-full w-[70%] rounded-full" style={{ backgroundColor: brandColor }} />
            </div>
            <div>
              <div className="flex items-start gap-[8px]">
                <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[4px] text-white" style={{ backgroundColor: brandColor }}>
                  <CheckIcon className="h-[12px] w-[12px]" />
                </span>
                <p className="text-[13px] font-medium text-[#171717]">Project Milestone Completed</p>
              </div>
              <p className="mt-[4px] text-[12px] text-[#525252]">Here comes a simple description</p>
            </div>
            <button className="flex items-center gap-[8px] text-[13px] font-medium" style={{ color: brandColor }} type="button">
              View Deliverables
              <ArrowRightIcon className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>
      </div>
      <SecondaryButton>Save</SecondaryButton>
    </div>
  );
}

function DomainCard() {
  return (
    <div className="flex flex-col gap-[12px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[28px]">
        <div>
          <h3 className="text-[13px] font-medium text-[#171717]">Custom Domains</h3>
          <p className="mt-[4px] text-[12px] text-[#525252]">Use your own domain for the client portal</p>
        </div>
        <label className="flex flex-col gap-[8px]">
          <span className="text-[13px] font-medium text-[#171717]">Domain</span>
          <input className="h-[34px] w-full max-w-[290px] rounded-[6px] bg-[#f5f5f5] px-[12px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none" placeholder="ex. www.google.com" />
        </label>
      </div>
      <SecondaryButton>Save</SecondaryButton>
    </div>
  );
}

function PortalPaywall({ onStartTrial }: { onStartTrial: () => void }) {
  return (
    <div className="absolute inset-x-[4px] top-[64px] flex min-h-[calc(100%-68px)] items-start justify-center rounded-[8px] bg-white/25 px-[clamp(14px,4vw,24px)] pt-[clamp(56px,10vw,112px)] backdrop-blur-[12.5px]">
      <div className="flex w-full max-w-[516px] flex-col gap-[24px]">
        <div>
          <h2 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">Configure your portal link with PRO</h2>
          <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
            Upgrade your workspace plan to customise your client portal.
          </p>
        </div>
        <div className="rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[24px] rounded-[8px] bg-gradient-to-b from-white to-[rgba(158,153,248,0.05)] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <p className="bg-gradient-to-r from-[#463fba] via-[rgba(70,63,186,0.75)] to-[#463fba] bg-clip-text text-[13px] font-medium text-transparent">Pro</p>
            <div>
              <p className="text-[19px] font-semibold leading-[1.25] text-[#171717]">$29</p>
              <p className="mt-[2px] text-[13px] font-medium leading-[1.25] text-[#525252]">/month</p>
            </div>
            <div className="flex flex-col gap-[12px] text-[13px] font-medium text-[#525252]">
              <p>Everything in Start</p>
              <PlanFeature>Unlimited projects</PlanFeature>
              <PlanFeature>Customizable client portal (your brand, your domain)</PlanFeature>
              <PlanFeature>Priority support</PlanFeature>
            </div>
            <button
              type="button"
              onClick={onStartTrial}
              className="w-full rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-[12px] py-[10px] text-[13px] font-medium text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              Start 14-Day Trial
            </button>
          </div>
          <button className="mt-[4px] flex w-full items-center justify-center gap-[8px] rounded-[6px] bg-white py-[10px] text-[13px] font-medium text-[#737373] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" type="button">
            See All Plans
            <ArrowRightIcon className="h-[16px] w-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanFeature({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-[8px]">
      <BriefcaseIcon className="h-[16px] w-[16px]" />
      <span>{children}</span>
    </div>
  );
}

function SecondaryButton({ children }: { children: string }) {
  return (
    <button className="w-fit rounded-[6px] bg-[#fafafa] px-[24px] py-[8px] text-[13px] font-medium text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" type="button">
      {children}
    </button>
  );
}

function RedirectIcon() {
  return (
    <img src="/logos/dashboard/redirect.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}



function ChevronDownIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 12 12" fill="none"><path d="M2.5 6 5 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BriefcaseIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M5.5 5V4A1.5 1.5 0 0 1 7 2.5h2A1.5 1.5 0 0 1 10.5 4v1M3 5.5h10v7H3zM3 8h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
