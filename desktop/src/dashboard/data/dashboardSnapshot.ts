import { dashboardSnapshotSchema } from "../models/dashboard";

const now = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export const dashboardSnapshot = dashboardSnapshotSchema.parse({
  greeting: "Good Morning, Pratik.",
  subheading: "You have 4 projects that need your attention.",
  metrics: [
    { id: "active", icon: "/logos/dashboard/radio.svg", value: "2", label: "Active Projects" },
    { id: "due", icon: "/logos/dashboard/flag.svg", value: "21", label: "Tasks Due" },
    { id: "done", icon: "/logos/dashboard/check.svg", value: "0", label: "Completed" },
    { id: "process", icon: "/logos/dashboard/calculator.svg", value: "0%", label: "Avg. Process" },
  ],
  projects: [
    { id: "baseframe", name: "BaseFrame", logoLabel: "B", accentColor: "#f28c5b" },
    { id: "test", name: "Test Project", logoLabel: "T", accentColor: "#1485ff" },
  ],
  chart: [
    { label: "APR 12", value: 1 },
    { label: "APR 13", value: 4 },
    { label: "APR 14", value: 7 },
    { label: "APR 15", value: 7 },
    { label: "APR 16", value: 12 },
    { label: "APR 17", value: 8 },
    { label: "APR 18", value: 3 },
    { label: "APR 19", value: 3 },
  ],
  upcomingTasks: [
    {
      id: "brief-1",
      title: "Write creative brief",
      projectName: "Baseframe",
      dueDate: now,
      updatedAt: now - 2 * ONE_HOUR,
      isCompleted: false,
    },
    {
      id: "brief-2",
      title: "Write creative brief",
      projectName: "Test Project",
      dueDate: now + ONE_DAY,
      updatedAt: now - 5 * ONE_HOUR,
      isCompleted: false,
    },
    {
      id: "brief-3",
      title: "Write creative brief",
      projectName: "Baseframe",
      dueDate: now + 2 * ONE_DAY,
      updatedAt: now - 8 * ONE_HOUR,
      isCompleted: false,
    },
  ],
  recentActivity: [
    {
      id: "activity-1",
      title: "Collect visual references",
      projectName: "Baseframe",
      updatedAt: now - 23 * ONE_HOUR,
      isCompleted: false,
    },
    {
      id: "activity-2",
      title: "Define success criteria",
      projectName: "Baseframe",
      updatedAt: now - 23 * ONE_HOUR,
      isCompleted: false,
    },
    {
      id: "activity-3",
      title: "Write creative brief",
      projectName: "Baseframe",
      updatedAt: now - 23 * ONE_HOUR,
      isCompleted: true,
    },
  ],
  pipeline: [
    {
      id: "brief",
      label: "Brief",
      accentColor: "#9e99f8",
      barColor: "linear-gradient(90deg, #9e99f8 0%, rgba(158, 153, 248, 0.75) 50%, #9e99f8 100%)",
    },
    {
      id: "discovery",
      label: "Discovery",
      accentColor: "#d4d4d4",
      barColor: "linear-gradient(90deg, #d6d3d1 0%, rgba(214, 211, 209, 0.75) 50%, #d6d3d1 100%)",
    },
  ],
  revenue: {
    outstanding: "$0",
    received: "$0",
    note: "No payments yet.",
  },
});
