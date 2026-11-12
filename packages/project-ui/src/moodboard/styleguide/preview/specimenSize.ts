// Type samples are compressed toward 12px so a 56px display style doesn't swamp the
// panel; the real size is always printed next to the sample.
export const specimenSize = (size: number) => Math.round(12 + (size - 12) * 0.4);
