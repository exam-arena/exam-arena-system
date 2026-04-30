import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ExamLayoutProps {
    header: React.ReactNode;
    content: React.ReactNode;
    sidebar: React.ReactNode;
    bottomBar: React.ReactNode;
}

export function ExamLayout({ header, content, sidebar, bottomBar }: ExamLayoutProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="fixed inset-0 bg-aliceblue font-sans overflow-hidden">
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_294px] gap-x-6 px-4 md:px-12 lg:px-24 py-4 lg:py-6 box-border">

                {/* LEFT COLUMN: 3 boxes stacked */}
                <div className="flex flex-col gap-3 min-h-0 lg:col-1 row-1">
                    {/* Box 1: Header (fixed top) */}
                    <div className="shrink-0">
                        {header}
                    </div>

                    {/* Box 2: Question content (scrollable, fills remaining) */}
                    <div className="flex-1 min-h-0 overflow-y-auto rounded-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)]">
                        <div className="p-6">
                            {content}
                        </div>
                    </div>

                    {/* Box 3: Bottom navigation (fixed bottom) */}
                    <div className="shrink-0">
                        {React.isValidElement(bottomBar)
                            ? React.cloneElement(
                                bottomBar as React.ReactElement<{ onOpenMenu?: () => void }>,
                                {
                                    onOpenMenu: () => setIsMenuOpen(true),
                                }
                            )
                            : bottomBar}
                    </div>
                </div>

                {/* RIGHT COLUMN: Sidebar (Desktop only) */}
                <aside className="hidden lg:flex flex-col gap-6 overflow-y-auto col-2 row-1 min-h-0 py-1 px-1">
                    {sidebar}
                </aside>
            </div>

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetContent side="left" className="w-75 p-0 bg-aliceblue border-none overflow-y-auto">
                    <SheetHeader className="p-4 bg-white border-b">
                        <SheetTitle className="text-mediumslateblue font-bold">Danh sách câu hỏi</SheetTitle>
                    </SheetHeader>
                    <div className="p-4">
                        {sidebar}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
