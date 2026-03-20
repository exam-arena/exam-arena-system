import React from "react";

interface MultipleChoiceProps {
  options: string[];
  name?: string; // input name to group radios
}

export function MultipleChoice({ options, name }: MultipleChoiceProps) {
  const labels = ["A", "B", "C", "D", "E", "F"];
  
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
      {options.map((opt, idx) => {
        const value = labels[idx];
        return (
          <label 
            key={idx} 
            className="rounded-num-30 bg-cornflowerblue-200 py-[0.5rem] px-[1.5rem] cursor-pointer hover:bg-mediumslateblue/20 transition-colors text-mediumslateblue border border-transparent has-[:checked]:border-mediumslateblue has-[:checked]:bg-mediumslateblue/10 flex items-center gap-2 group"
          >
            <input type="radio" name={name} value={value} className="hidden" />
            <b className="text-base leading-[1.75rem]">
              {value}. {opt}
            </b>
          </label>
        );
      })}
    </div>
  );
}
