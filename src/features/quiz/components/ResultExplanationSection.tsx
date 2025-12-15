import { ResultBlocks } from "./ResultBlocks";
import type { ResultBlock } from "../results/afranR14Results";

interface ResultExplanationSectionProps {
  blocks: ResultBlock[];
}

export function ResultExplanationSection({ blocks }: ResultExplanationSectionProps) {
  return (
    <div className="bg-primary/15 backdrop-blur-2xl border border-primary/30 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
      <ResultBlocks blocks={blocks} />
    </div>
  );
}

