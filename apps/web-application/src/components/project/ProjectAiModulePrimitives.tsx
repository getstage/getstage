import type { ComponentType, ReactNode } from "react";
import {
  CheckCircle,
  CircleNotch,
  Sparkle,
  WarningCircle,
  type IconProps,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type IconComponent = ComponentType<IconProps>;

export function ModulePanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {(title || description || action) ? (
        <div className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div>
            {title ? <h2 className="text-[15px] font-medium leading-none text-[#171717]">{title}</h2> : null}
            {description ? (
              <p className="mt-2 max-w-[470px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("rounded-[8px] bg-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function WhiteCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-[12px] border border-[#E5E5E5] bg-white shadow-[0_0.45px_1px_rgba(10,10,10,0.12)]", className)}>
      {children}
    </article>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-white px-3 text-[13px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DarkButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "neutral" | "warning" | "danger" | "purple";
  className?: string;
}) {
  const classes = {
    success: "bg-[#EDFCF2] text-[#22C55E]",
    neutral: "bg-[#F5F5F5] text-[#737373]",
    warning: "bg-[#FEF4EC] text-[#D97757]",
    danger: "bg-[#FDECEC] text-[#D64545]",
    purple: "bg-[#EEEDFE] text-[#463FBA]",
  }[tone];

  return (
    <span className={cn("inline-flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-medium", classes, className)}>
      {children}
    </span>
  );
}

export function ModuleEmptyState({
  icon: Icon = WarningCircle,
  title,
  description,
  action,
}: {
  icon?: IconComponent;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <ModulePanel bodyClassName="flex min-h-[642px] items-center justify-center px-6">
      <div className="flex max-w-[270px] flex-col items-center gap-1.5 text-center">
        <Icon size={24} weight="fill" className="text-[#525252]" />
        <p className="mt-2 text-[15px] font-medium leading-none text-[#171717]">{title}</p>
        <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </ModulePanel>
  );
}

export function LoadingWorkflow({
  title,
  description,
  steps,
  icon,
  onCancel,
}: {
  title: string;
  description: string;
  steps: string[];
  icon?: string;
  onCancel?: () => void;
}) {
  return (
    <ModulePanel bodyClassName="flex min-h-[642px] items-center justify-center px-6">
      <div className="flex w-full max-w-[360px] flex-col items-center text-center">
        {icon ? (
          <img src={icon} alt="" className="h-11 w-11" />
        ) : (
          <CircleNotch size={34} className="animate-spin text-[#7B76DF]" />
        )}
        <h2 className="mt-4 text-[16px] font-semibold leading-none text-[#171717]">{title}</h2>
        <p className="mt-2 max-w-[282px] text-[13px] font-medium leading-[1.5] text-[#525252]">{description}</p>
        <div className="mt-6 flex flex-col gap-2 text-left">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
              {index === 0 ? (
                <CircleNotch size={18} className="shrink-0 animate-spin text-[#7B76DF]" />
              ) : (
                <CheckCircle size={18} weight="fill" className="shrink-0 text-[#22C55E]" />
              )}
              {step}
            </div>
          ))}
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 text-[13px] font-medium text-[#737373] transition-colors hover:text-destructive"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </ModulePanel>
  );
}

export function SmallMeta({
  icon: Icon,
  children,
}: {
  icon?: IconComponent;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] text-[#737373]">
      {Icon ? <Icon size={15} className="text-[#525252]" /> : null}
      {children}
    </span>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[13px] font-medium text-[#171717]">{children}</label>;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn("h-9 w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3] focus:bg-white", className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn("min-h-[92px] w-full resize-none rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium leading-[1.5] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3] focus:bg-white", className)}
    />
  );
}

export function artifactText(artifact: ProjectAiArtifact | null | undefined) {
  if (!artifact) {
    return "";
  }

  if (artifact.contentMarkdown?.trim()) {
    return artifact.contentMarkdown.trim();
  }

  if (artifact.summary?.trim()) {
    return artifact.summary.trim();
  }

  if (artifact.contentJson?.trim()) {
    try {
      return JSON.stringify(JSON.parse(artifact.contentJson), null, 2);
    } catch {
      return artifact.contentJson.trim();
    }
  }

  return "No content available yet.";
}

export function splitMarkdownSections(
  text: string,
  fallbackTitle: string,
): Array<{ title: string; body: string }> {
  const lines = text.split(/\r?\n/);
  const sections: Array<{ title: string; body: string[] }> = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      if (current) {
        sections.push(current);
      }
      current = { title: (heading[1] ?? "").trim(), body: [] };
      continue;
    }

    if (!current) {
      current = { title: fallbackTitle, body: [] };
    }
    current.body.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections
    .map((section) => ({
      title: section.title,
      body: section.body.join("\n").trim(),
    }))
    .filter((section) => section.title || section.body);
}

export function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function runStatusLabel(status: ProjectAiRun["status"] | undefined) {
  switch (status) {
    case "draft":
      return "Awaiting Claude";
    case "running":
      return "Running";
    case "needs_input":
      return "Needs input";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Complete";
    default:
      return "Ready";
  }
}

export function runStatusTone(status: ProjectAiRun["status"] | undefined): "success" | "neutral" | "warning" | "danger" | "purple" {
  switch (status) {
    case "draft":
      return "neutral";
    case "running":
      return "purple";
    case "needs_input":
      return "warning";
    case "failed":
      return "danger";
    case "cancelled":
      return "neutral";
    default:
      return "success";
  }
}

export function ClaudeMark({ className }: { className?: string }) {
  return <img src="/logos/integrations/claude.svg" alt="" className={cn("h-4 w-4", className)} />;
}

export function AiGeneratedMeta() {
  return <SmallMeta icon={Sparkle}>AI Generated</SmallMeta>;
}
