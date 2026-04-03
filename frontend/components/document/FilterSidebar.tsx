"use client";

import { useState } from "react";
import { Search, BookOpen, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SUBJECTS = ["Toán", "Tổ hợp tự nhiên", "Tiếng Anh", "Tổ hợp xã hội"];
const CATEGORIES = ["Đề thi thử", "Đề thi các năm", "Đề thi tổng hợp", "Đề thi tuyển chọn"];

export default function FilterSidebar() {
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    return (
        <aside className="w-full relative rounded-num-30 bg-white border border-[#0050e2]/20 box-border overflow-hidden flex flex-col items-start py-9 px-4 gap-6 font-roboto sm:sticky sm:top-24">

            {/* Search container */}
            <div className="w-full flex flex-col items-start gap-6 text-cornflowerblue-100">
                <div className="w-full h-9 rounded-num-30 bg-[#EAF2FF] shrink-0 flex items-center py-2 px-4 box-border gap-1 border border-transparent focus-within:border-[#004EDC] transition-colors">
                    <Search className="h-4 w-4 shrink-0 text-[#004EDC]" />
                    <Input
                        type="text"
                        placeholder="Tìm kiếm đề thi..."
                        className="bg-transparent border-none outline-none shadow-none text-xs text-[#004EDC] w-full placeholder:text-cornflowerblue-100/70 focus-visible:ring-0 px-0 rounded-none h-auto shrink-0 leading-none"
                    />
                </div>
                <div className="w-full flex flex-col items-start gap-3 text-xl text-[#0050e2]">
                    <b className="relative leading-3.5">Bộ lọc</b>
                    <div className="w-full h-[0.5px] border-t border-cornflowerblue-100 box-border" />
                </div>
            </div>

            {/* Subject Filter */}
            <div className="flex flex-col items-start gap-2 text-base w-full">
                <div className="flex items-center gap-2 text-[#0050e2]">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <b className="relative">Môn học</b>
                </div>
                {/* 2 columns grid for buttons using flex wraps or grid */}
                <div className="w-full grid grid-cols-2 gap-3 text-xs">
                    {SUBJECTS.map((sub) => (
                        <Button
                            key={sub}
                            variant={selectedSubject === sub ? "default" : "secondary"}
                            onClick={() => setSelectedSubject(sub)}
                            className={`rounded-num-30 font-medium py-1 h-auto px-3 transition-colors flex items-center justify-center w-full text-xs shadow-none ${selectedSubject === sub
                                    ? "bg-[#0050e2] hover:bg-mediumslateblue text-white"
                                    : "bg-[#EAF2FF] hover:bg-blue-100 text-[#0050e2]"
                                }`}
                        >
                            {sub}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col items-start gap-2 text-base w-full">
                <div className="flex items-center gap-2 text-[#0050e2]">
                    <Filter className="w-4 h-4 shrink-0" />
                    <b className="relative">Phân loại</b>
                </div>
                <div className="w-full grid grid-cols-2 gap-3 text-xs">
                    {CATEGORIES.map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "secondary"}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-num-30 font-medium py-1 h-auto px-3 transition-colors flex items-center justify-center w-full text-xs shadow-none ${selectedCategory === cat
                                    ? "bg-[#0050e2] hover:bg-mediumslateblue text-white"
                                    : "bg-[#EAF2FF] hover:bg-blue-100 text-[#0050e2]"
                                }`}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="w-full flex items-center justify-center gap-3 text-xs mt-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        setSelectedSubject("");
                        setSelectedCategory("");
                    }}
                    className="flex-1 rounded-num-30 bg-white border border-[#0050e2]/20 hover:border-[#0050e2] hover:bg-transparent text-[#0050e2] font-bold py-2 px-4 h-auto transition-colors shadow-none"
                >
                    Đặt lại bộ lọc
                </Button>
                <Button className="flex-1 rounded-num-30 bg-[#0050e2] hover:bg-mediumslateblue text-white font-bold py-2 px-4 h-auto transition-colors shadow-none text-xs">
                    Lọc kết quả
                </Button>
            </div>
        </aside>
    );
}
