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
  images: UiPatternImage[];
};

export type UiPatternImage = {
  src: string;
  fullSrc: string;
};

export type UiPatternGroupWithPatterns = UiPatternGroup & {
  recognizedPatterns: ReadonlyArray<readonly [string, string]>;
};

export type ResearchTargetUser = {
  name: string;
  role: string;
  goals: string;
  frustration: string;
  context: string;
};

export type CompetitiveView = "card" | "matrix";

export type ResearchTabData = {
  summary: string[];
  companySnapshot: ReadonlyArray<readonly [string, string]>;
  competitors: ResearchCompetitor[];
  competitiveMatrixRows: Array<{ label: string; values: string[] }>;
  uiPatternGroups: UiPatternGroupWithPatterns[];
  targetUsers: ResearchTargetUser[];
  opportunities: string[];
};
