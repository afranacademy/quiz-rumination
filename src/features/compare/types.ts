import type { DimensionKey } from "@/domain/quiz/types";
import type { Relation, Direction, Variance } from "./templates/compareText.fa";

/**
 * Traceability type for DEV-only audit logging.
 * Ensures every rendered text is traceable to selection inputs.
 */
export type CompareNarrativeTrace = {
  section: string;
  dimension?: DimensionKey;
  inputs: {
    relation?: Relation;
    direction?: Direction;
    variance?: Variance;
    confidence?: string;
    styleDelta?: boolean;
    level?: string;
  };
  selectedTextId: string;
};

