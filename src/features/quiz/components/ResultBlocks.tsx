import { Icon } from "./Icon";
import type { ResultBlock } from "../results/afranR14Results";

interface ResultBlocksProps {
  blocks: ResultBlock[];
}

export function ResultBlocks({ blocks }: ResultBlocksProps) {
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {blocks.map((block, index) => (
        <div key={index} className="text-right">
          <div className="flex items-start gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
            <div className="shrink-0 mt-0.5 sm:mt-1">
              <Icon
                name={block.icon}
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white/90"
                title={block.title}
              />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl text-foreground font-medium">{block.title}</h3>
          </div>
          <div className="space-y-3 sm:space-y-4 pr-8 sm:pr-10">
            {block.paragraphs.map((paragraph, pIndex) => (
              <p key={pIndex} className="text-foreground/85 leading-7 sm:leading-8 text-sm sm:text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
