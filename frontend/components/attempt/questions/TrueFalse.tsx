import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface TrueFalseProps {
  statements: {
    id: string; // The specific child question ID
    content: string; // the statement text
    options: { id: string, text: string }[]; // [{id: "True", "text": "Đúng"}, ...]
  }[];
  parentId: string; // for grouping radios
  answers?: Record<string, string>; // Selected answers dict, mapped by child ID
  onChange?: (childId: string, val: string) => void;
  mode?: "exam" | "review";
  correctAnswers?: Record<string, string>;
}

export function TrueFalse({ statements, parentId, answers = {}, onChange, mode = "exam", correctAnswers = {} }: TrueFalseProps) {
  const isSelected = (stmtId: string, val: string) => answers[stmtId] === val;
  const isCorrect = (stmtId: string, val: string) => mode === "review" && correctAnswers[stmtId] === val;
  const isWrongSelected = (stmtId: string, val: string) => mode === "review" && isSelected(stmtId, val) && correctAnswers[stmtId] !== val;

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="min-w-[500px] w-full max-w-3xl grid grid-cols-[1fr_80px_80px] gap-x-3 gap-y-2 text-mediumslateblue text-base">
        {/* Header row */}
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-[1.5rem] flex items-center justify-center text-center font-bold h-full rounded-t-lg">Khẳng định</div>
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-2 flex items-center justify-center text-center font-bold rounded-t-lg">Đúng</div>
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-2 flex items-center justify-center text-center font-bold rounded-t-lg">Sai</div>

        {/* Rows */}
        {statements.map((stmt, idx) => {
          const labels = ["a", "b", "c", "d", "e", "f"];
          return (
            <React.Fragment key={stmt.id}>
              <div className="flex items-center px-[1.125rem] py-3 bg-aliceblue text-foreground border border-aliceblue transition-colors min-h-[48px] rounded-lg">
              <div className="leading-[1.75rem] w-full break-words relative pl-7">
                <b className="font-bold text-mediumslateblue absolute left-0 top-0">{labels[idx]}.</b>
                <LatexText content={stmt.content} />
              </div>
            </div>

              {/* The mock JSON usually defines options where [0] is "True/Đúng" and [1] is "False/Sai" */}
              {["True", "False"].map((opt) => {
                let labelClass = "bg-aliceblue hover:bg-cornflowerblue-200 cursor-pointer";
                if (mode === "review") {
                  labelClass = "cursor-default";
                  if (isSelected(stmt.id, opt) && isCorrect(stmt.id, opt)) labelClass += " bg-mediumslateblue text-white border-mediumslateblue ring-2 ring-mediumslateblue";
                  else if (isCorrect(stmt.id, opt)) labelClass += " bg-green-100 text-green-700 font-bold border-green-500 ring-2 ring-green-500";
                  else if (isWrongSelected(stmt.id, opt)) labelClass += " bg-red-500 text-white font-bold ring-2 ring-red-500";
                  else labelClass += " bg-aliceblue";
                } else {
                  if (isSelected(stmt.id, opt)) labelClass = "bg-mediumslateblue/20 ring-1 ring-mediumslateblue cursor-pointer";
                }

                return (
                  <label key={opt} className={`flex items-center justify-center p-2 transition-colors min-h-[48px] rounded-lg ${labelClass}`}>
                    <input
                      type="radio"
                      name={`tf-${stmt.id}`}
                      value={opt}
                      checked={isSelected(stmt.id, opt)}
                      onChange={() => mode !== "review" && onChange?.(stmt.id, opt)}
                      disabled={mode === "review"}
                      className="w-5 h-5 accent-mediumslateblue scale-110"
                      style={{ cursor: mode === "review" ? "default" : "pointer" }}
                    />
                  </label>
                );
              })}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  );
}
