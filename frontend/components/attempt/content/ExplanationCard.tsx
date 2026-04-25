import React from "react";
import { LatexText } from "@/components/shared/LatexText";
import type { AttemptExplanationBlock } from "@/lib/api/attempts/types";

interface ExplanationCardProps {
  correctAnswerText?: string;
  explanation?: string;
  explanationBlocks?: AttemptExplanationBlock[];
}

export function ExplanationCard({
  correctAnswerText,
  explanation,
  explanationBlocks = [],
}: ExplanationCardProps) {
  const hasBlocks = explanationBlocks.length > 0;
  if (!correctAnswerText && !explanation && !hasBlocks) return null;

  return (
    <div className="w-full rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-start py-4 px-6 box-border gap-2.5 mt-6 text-foreground">
      {correctAnswerText && (
        <b className="text-[1.25rem] leading-8 text-mediumslateblue">Đáp án đúng: {correctAnswerText}</b>
      )}

      {(hasBlocks || explanation) && (
        <>
          <b className="text-mediumslateblue mt-2">Giải thích:</b>
          <div className="flex w-full flex-col gap-3 leading-7 text-slate-700">
            {hasBlocks ? (
              explanationBlocks.map((block, index) => {
                if (block.block_type === "image" && block.image_url) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${block.block_type}-${index}`}
                      src={block.image_url}
                      alt={block.alt_text || "Hình minh họa lời giải"}
                      className="max-h-[420px] w-full rounded-lg border border-slate-200 object-contain"
                      loading="lazy"
                    />
                  );
                }

                if (block.block_type === "text" && block.content_text) {
                  return (
                    <div key={`${block.block_type}-${index}`} className="w-full">
                      <LatexText content={block.content_text} />
                    </div>
                  );
                }

                return null;
              })
            ) : (
              <LatexText content={explanation ?? ""} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
