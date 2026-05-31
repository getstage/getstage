export const moodboardReferenceImages = [
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
] as const;

/** Grid uses six tiles (three images duplicated). */
export const moodboardImages = [
  ...moodboardReferenceImages,
  ...moodboardReferenceImages,
] as const;
