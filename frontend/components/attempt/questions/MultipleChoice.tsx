import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface MultipleChoiceProps {
  options: { id: string; text: string }[];
  name?: string; 
  value?: string;
  onChange?: (val: string) => void;
}

export function MultipleChoice({ options, name, value, onChange }: MultipleChoiceProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
      {options?.map((opt) => {
        const isChecked = value === opt.id;
        return (
          <label 
            key={opt.id} 
            className={`rounded-num-30 py-[0.5rem] px-[1.5rem] cursor-pointer transition-all border flex items-center gap-2 group max-w-full ${
              isChecked 
                ? "bg-mediumslateblue/10 border-mediumslateblue text-mediumslateblue ring-1 ring-mediumslateblue/50" 
                : "bg-cornflowerblue-200 border-transparent hover:bg-mediumslateblue/20 text-mediumslateblue"
            }`}
          >
            <input 
              type="radio" 
              name={name} 
              value={opt.id} 
              checked={isChecked}
              onChange={() => onChange?.(opt.id)}
              className="hidden" 
            />
            <b className="text-base leading-[1.75rem] whitespace-nowrap truncate">
              {opt.id}.
            </b>
            <div className={`text-base leading-[1.75rem] break-words ${isChecked ? 'font-bold' : 'font-normal'}`}>
              <LatexText content={opt.text} />
            </div>
          </label>
        );
      })}
    </div>
  );
}
