export const moodboardImages = [
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
];

export type MoodboardMode = "upload" | "figma";

export type MoodboardItem = {
  id: string;
  image: string;
  folder: string | null;
  isInMoodboard: boolean;
};
