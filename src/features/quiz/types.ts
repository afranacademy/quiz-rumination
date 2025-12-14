export type QuizIntake = {
  firstName: string;
  lastName: string;
  mobile: string;
  mobileRegion: "IR" | "INTL";
  createdAt: string;
};

export type LikertValue = 0 | 1 | 2 | 3 | 4;

export type QuizItem = {
  id: number;
  text: string;
  reverse?: boolean;
};

export type QuizDefinition = {
  slug: string;
  title: string;
  intro: string;
  scale: {
    min: 0;
    max: 4;
    labels: string[];
  };
  items: QuizItem[];
};

export type ScoreBreakdown = {
  total: number;
  maxTotal: number;
  normalized: number;
  reversedItemIds: number[];
};

export type LevelKey = "low" | "medium" | "high";

export type LevelConfig = {
  key: LevelKey;
  titleFa: string;
  min: number;
  max: number;
};
