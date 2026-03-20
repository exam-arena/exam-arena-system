import React from "react";

interface ShortAnswerProps {
  name?: string;
  placeholder?: string;
}

export function ShortAnswer({ name, placeholder = "Nhập câu trả lời" }: ShortAnswerProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <b className="text-base leading-[1.75rem] text-mediumslateblue font-bold">Câu trả lời:</b>
      <input 
        type="text" 
        name={name}
        placeholder={placeholder} 
        className="w-full max-w-[20rem] rounded-num-30 border-cornflowerblue-100 border text-mediumslateblue py-[1rem] px-[1.5rem] outline-none text-base focus:border-mediumslateblue focus:ring-1 focus:ring-mediumslateblue/50 transition-all bg-white"
      />
    </div>
  );
}
