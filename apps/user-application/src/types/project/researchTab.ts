export type ResearchCompetitor = {
  name: string;
  url: string;
  mark: string;
  color: string;
  tagline: string;
  note: string;
  strengths: string[];
  weaknesses: string[];
};

export type UiPatternGroup = {
  id: string;
  title: string;
  images: string[];
};

export type CompetitiveView = "card" | "matrix";
