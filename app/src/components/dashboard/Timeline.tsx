import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { formatShortDate } from "@/lib/utils";
import type { Project } from "@/types";

interface TimelineProps {
  projects: Project[];
}

type PositionedProject = {
  project: Project;
  x: number;
  y: number;
};

type CurvePoint = {
  x: number;
  y: number;
};

const VIEWBOX_HEIGHT = 210;

const MAIN_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 132 },
  { x: 6, y: 123 },
  { x: 13, y: 128 },
  { x: 24, y: 124 },
  { x: 36, y: 124 },
  { x: 48, y: 127 },
  { x: 58, y: 122 },
  { x: 67, y: 121 },
  { x: 74, y: 128 },
  { x: 82, y: 120 },
  { x: 90, y: 119 },
  { x: 96, y: 119 },
  { x: 100, y: 120 },
];

const TOP_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 66 },
  { x: 6, y: 58 },
  { x: 14, y: 76 },
  { x: 24, y: 57 },
  { x: 35, y: 60 },
  { x: 47, y: 73 },
  { x: 55, y: 56 },
  { x: 63, y: 56 },
  { x: 70, y: 84 },
  { x: 78, y: 48 },
  { x: 86, y: 55 },
  { x: 92, y: 70 },
  { x: 98, y: 40 },
  { x: 100, y: 46 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getYAtX(points: CurvePoint[], x: number) {
  if (points.length === 0) return 0;
  const clampedX = clamp(x, 0, 100);
  for (let i = 1; i < points.length; i += 1) {
    const left = points[i - 1]!;
    const right = points[i]!;
    if (clampedX <= right.x) {
      const distance = right.x - left.x || 1;
      const progress = (clampedX - left.x) / distance;
      return left.y + (right.y - left.y) * progress;
    }
  }
  return points[points.length - 1]?.y ?? 0;
}

function buildSmoothPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x},${points[0]!.y}`;

  let path = `M ${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return path;
}

function withOverscan(points: CurvePoint[]) {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  return [
    { x: -2, y: first!.y },
    ...points,
    { x: 102, y: last!.y },
  ];
}

export function Timeline({ projects }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, width: 0 });

  const { minDate, maxDate, positioned, todayX, todayY } = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const starts = projects.map((project) => project.startDate);
    const ends = projects.map((project) => project.endDate);
    const min = Math.min(...starts) - 7 * day;
    const max = Math.max(...ends) + 7 * day;

    const toX = (timestamp: number) =>
      clamp(((timestamp - min) / Math.max(max - min, day)) * 100, 0, 100);

    const withPosition: PositionedProject[] = [...projects]
      .sort((a, b) => a.startDate - b.startDate)
      .map((project) => {
        const x = toX(project.startDate);
        return {
          project,
          x,
          y: getYAtX(MAIN_CURVE_POINTS, x),
        };
      });

    const nowX = toX(Date.now());

    return {
      minDate: min,
      maxDate: max,
      positioned: withPosition,
      todayX: nowX,
      todayY: getYAtX(MAIN_CURVE_POINTS, nowX),
    };
  }, [projects]);

  const curve = useMemo(() => {
    const mainPoints = withOverscan(MAIN_CURVE_POINTS);
    const topPoints = withOverscan(TOP_CURVE_POINTS);
    const linePath = buildSmoothPath(mainPoints);
    const areaPath = `${linePath} L 102,${VIEWBOX_HEIGHT} L -2,${VIEWBOX_HEIGHT} Z`;
    const topPath = buildSmoothPath(topPoints);

    return {
      linePath,
      areaPath,
      topPath,
    };
  }, []);

  const hovered = positioned.find((entry) => entry.project.id === hoveredId)?.project;
  const hoveredX = positioned.find((entry) => entry.project.id === hoveredId)?.x ?? todayX;

  return (
    <div className="relative h-[272px]">
      <div className="relative h-full overflow-hidden">
        <svg
          viewBox={`-2 0 104 ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="stage-timeline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8F8BF8" stopOpacity="0.33" />
              <stop offset="100%" stopColor="#8F8BF8" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <path d={curve.topPath} fill="none" stroke="#D3D3DA" strokeWidth="0.9" />
          <path d={curve.areaPath} fill="url(#stage-timeline-fill)" />
          <path d={curve.linePath} fill="none" stroke="#A7A4F8" strokeWidth="1.1" />
        </svg>

        <div
          className="absolute bottom-0 top-0 w-px bg-[#D4D2FF]"
          style={{ left: `${todayX}%` }}
        >
          <div
            className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#A7A4F8]"
            style={{ top: `${(todayY / VIEWBOX_HEIGHT) * 100}%` }}
          />
        </div>

        {hoveredId && (
          <div
            className="absolute bottom-0 top-0 w-px bg-[#D4D2FF]"
            style={{ left: `${hoveredX}%` }}
          />
        )}

        {positioned.map((entry) => (
          <Link
            key={entry.project.id}
            to="/project/$id"
            params={{ id: entry.project.id }}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${entry.x}%`,
              top: `${(entry.y / VIEWBOX_HEIGHT) * 100}%`,
            }}
            onMouseEnter={(event) => {
              setHoveredId(entry.project.id);
              const rect = event.currentTarget.parentElement?.getBoundingClientRect();
              if (rect) {
                setCursor({
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  width: rect.width,
                });
              }
            }}
            onMouseMove={(event) => {
              const rect = event.currentTarget.parentElement?.getBoundingClientRect();
              if (rect) {
                setCursor({
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  width: rect.width,
                });
              }
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.div
              animate={{
                scale: hoveredId === entry.project.id ? 1.12 : 1,
                opacity: hoveredId && hoveredId !== entry.project.id ? 0.35 : 1,
              }}
              transition={{ duration: 0.18 }}
              className="h-9 w-9 overflow-hidden rounded-full border-[2px] border-[#8F8BF8] bg-white shadow-[0_1px_4px_rgba(26,26,46,0.2)]"
            >
              {entry.project.clientAvatarUrl ? (
                <img
                  src={entry.project.clientAvatarUrl}
                  alt={entry.project.clientName}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </motion.div>
          </Link>
        ))}

        <div className="absolute bottom-3 left-1 text-[11px] text-text-secondary">
          {formatShortDate(minDate)}
        </div>
        <div className="absolute bottom-3 right-1 rounded-full bg-[#ECEBF7] px-2.5 py-1 text-[11px] text-text-secondary">
          {formatShortDate(maxDate)}
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute z-20 w-[250px] rounded-[10px] bg-[#17192E] p-4 text-white shadow-[0_14px_30px_rgba(23,25,46,0.28)]"
            style={{
              left: Math.max(12, Math.min(cursor.x + 18, Math.max(12, cursor.width - 262))),
              top: Math.max(cursor.y - 120, 36),
            }}
          >
            <div className="text-[12px] text-white/50">{formatShortDate(Date.now())}</div>
            <div className="mt-1 text-[14px] font-medium">{hovered.name}</div>
            <div className="mt-1 text-[12px] text-white/55">
              {hovered.phases.find((phase) => phase.status === "active")?.name ??
                hovered.phases[0]?.name}
            </div>
            <div className="mt-3 border-t border-white/10 pt-2">
              {(
                hovered.phases.find((phase) => phase.status === "active")?.tasks ??
                hovered.phases[0]?.tasks ??
                []
              )
                .slice(0, 4)
                .map((task) => (
                  <div key={task.id} className="py-0.5 text-[12px]">
                    <span className={task.isCompleted ? "text-white/35" : "text-white/75"}>
                      {task.isCompleted ? "☑" : "☐"} {task.title}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
