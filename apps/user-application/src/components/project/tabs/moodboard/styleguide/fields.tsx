import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// Form controls for the Style Guide editor, measured from the STA-56 Figma frames
// (P1 2176:6255, P2 2176:6614): 13px labels, 27px fields, 0.5px neutral borders.

export function Icon({ name, size = 15 }: { name: string; size?: number }) {
  return <img src={`/logos/style-guide/${name}.svg`} width={size} height={size} alt="" aria-hidden="true" className="shrink-0" />;
}

export function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start gap-1.5">
        {icon}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-[15px] font-medium text-neutral-900">{title}</h3>
          {description ? <p className="text-[13px] text-balance text-neutral-600">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Divider() {
  return <hr className="w-full border-t-[0.5px] border-neutral-300" />;
}

export function Field({ label, hint, aside, children }: { label: string; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-0.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-neutral-900">{label}</span>
          {hint ? <span className="text-[12px] text-neutral-500">{hint}</span> : null}
        </span>
        {aside}
      </div>
      {children}
    </div>
  );
}

const box = "rounded-[4px] border-[0.5px] border-neutral-300 bg-neutral-100 shadow-stage-control";
const control = cn(box, "h-[27px] w-full pr-0.5 pl-3 text-[12px] font-medium text-neutral-800 outline-none placeholder:text-neutral-400 focus-visible:border-accent-deep");

export function TextInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder?: string; label: string }) {
  return <input aria-label={label} className={control} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

export function TextArea({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <textarea
      aria-label={label}
      className={cn(control, "h-[69px] resize-none py-1.5")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function Select<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (value: T) => void; label: string }) {
  return (
    <span className="relative block">
      <select aria-label={label} className={cn(control, "appearance-none pr-8")} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
        <Icon name="chevron-down" />
      </span>
    </span>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  fit = false,
}: {
  value: T | readonly T[];
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
  /** Size to the labels (toolbar toggles) instead of filling the row. */
  fit?: boolean;
}) {
  const isOn = (option: T) => (Array.isArray(value) ? value.includes(option) : value === option);
  return (
    <div role="group" aria-label={label} className={cn("flex overflow-hidden rounded-[6px] border-[0.5px] border-neutral-300 bg-neutral-100 shadow-stage-control", fit && "w-fit shrink-0")}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={isOn(option.value)}
          onClick={() => onChange(option.value)}
          className={cn(
            "truncate px-2.5 py-0.5 text-[13px] leading-[1.5] font-medium whitespace-nowrap text-neutral-600",
            fit ? "min-w-[50px]" : "min-w-0 flex-1",
            isOn(option.value) && "border-x-[0.5px] border-neutral-300 bg-white text-neutral-950 first:border-l-0 last:border-r-0",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ValueChip({ children }: { children: ReactNode }) {
  return <span className={cn(box, "flex min-w-6 items-center justify-center p-1.5 text-[10px] leading-none font-medium text-neutral-600")}>{children}</span>;
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ background: `linear-gradient(to right, var(--color-accent-deep) ${percent}%, var(--color-neutral-100) ${percent}%)` }}
      className="h-1 w-full cursor-pointer appearance-none rounded-[4px] border-[0.5px] border-neutral-300 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-accent-deep [&::-webkit-slider-thumb]:bg-accent-light"
    />
  );
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <span className={cn(box, "flex h-[27px] items-center gap-2 p-0.5")}>
      <label className="relative aspect-square h-full shrink-0 cursor-pointer overflow-hidden rounded-[2px]" style={{ backgroundColor: value }}>
        <input
          type="color"
          aria-label={`${label} colour`}
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        aria-label={`${label} hex`}
        defaultValue={value}
        key={value}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toUpperCase());
          else event.target.value = value;
        }}
        className="w-full min-w-0 bg-transparent text-[12px] font-medium text-neutral-800 outline-none"
      />
      <button type="button" aria-label={`Copy ${label}`} onClick={() => void navigator.clipboard.writeText(value)} className="px-1 hover:opacity-70">
        <Icon name="copy" />
      </button>
    </span>
  );
}

export function RemovableRow({
  value,
  onChange,
  onRemove,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <span className={cn(box, "flex h-[27px] items-center gap-2 pr-1.5 pl-3")}>
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 bg-transparent text-[12px] font-medium text-neutral-800 outline-none" />
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="hover:opacity-70">
        <X size={12} className="text-neutral-500" />
      </button>
    </span>
  );
}

export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(box, "flex h-[27px] items-center justify-center gap-1 bg-white text-[12px] font-medium text-neutral-800 hover:bg-neutral-50")}>
      + Add
    </button>
  );
}

export function TextLink({ children, onClick, tone = "accent" }: { children: ReactNode; onClick: () => void; tone?: "accent" | "destructive" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-1.5 text-[13px] leading-[1.5] font-medium hover:opacity-80", tone === "accent" ? "text-accent-deep" : "text-red-500")}
    >
      {children}
    </button>
  );
}
