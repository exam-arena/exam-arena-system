import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
    currentPage?: number;
    totalPages?: number;
    basePath?: string;
}

export default function CustomPagination({ 
    currentPage = 1, 
    totalPages = 10,
    basePath = "#"
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const buildPagination = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                pages.push("ellipsis");
            }
        }
        return pages.filter((item, idx, arr) => item !== "ellipsis" || arr[idx - 1] !== "ellipsis");
    };

    const displayPages = buildPagination();

    const prevPageUrl = currentPage > 1 ? `${basePath}?page=${currentPage - 1}` : basePath;
    const nextPageUrl = currentPage < totalPages ? `${basePath}?page=${currentPage + 1}` : basePath;

    return (
        <div className="mt-12 md:mt-16 mb-4 w-full flex justify-center">
            <Pagination>
                <PaginationContent className="space-x-1 sm:space-x-2">
                    
                    {/* Prev Button */}
                    <PaginationItem>
                        <PaginationPrevious 
                            href={prevPageUrl} 
                            text="Trang trước"
                            aria-disabled={currentPage === 1}
                            className={`flex items-center justify-center h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-blue-100 text-[#004EDC] hover:bg-[#004EDC] hover:text-white transition-all shadow-sm ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}`}
                        />
                    </PaginationItem>
                    
                    {displayPages.map((page, index) => {
                        if (page === "ellipsis") {
                            return (
                                <PaginationItem key={`ellipsis-${index}`}>
                                    <PaginationEllipsis className="w-6 sm:w-8 h-10 text-[#92B8FF] flex justify-center items-center" />
                                </PaginationItem>
                            );
                        }

                        return (
                            <PaginationItem key={page}>
                                <PaginationLink 
                                    href={`${basePath}?page=${page}`}
                                    isActive={page === currentPage}
                                    className={page === currentPage 
                                        ? "w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#004EDC] text-white font-bold hover:bg-[#004EDC] hover:text-white transition-all shadow-[0_4px_12px_rgb(0,78,220,0.3)] border-transparent"
                                        : "w-9 h-9 sm:w-10 sm:h-10 rounded-full border-transparent text-[#004EDC] hover:bg-blue-50 hover:border-blue-200 font-semibold transition-all"
                                    }
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    {/* Next Button */}
                    <PaginationItem>
                        <PaginationNext 
                            href={nextPageUrl}
                            text="Trang sau"
                            className={`flex items-center justify-center h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-blue-100 text-[#004EDC] hover:bg-[#004EDC] hover:text-white transition-all shadow-sm ${currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''}`} 
                        />
                    </PaginationItem>
                    
                </PaginationContent>
            </Pagination>
        </div>
    );
}
