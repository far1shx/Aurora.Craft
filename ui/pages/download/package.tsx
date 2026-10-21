import { IconCircleCheck, IconFlask, IconHistory } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { type JSX, type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { useNavScroll } from "@/components/app/navigation.tsx";
import { QueryState } from "@/components/aurora/query-state.tsx";
import { VirtualList } from "@/components/aurora/virtual-list.tsx";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu.tsx";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination.tsx";
import { api } from "@/lib/controller.ts";

const PAGE_SIZE = 20;

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

function VersionItem({
  item,
  onClick,
}: {
  item: Awaited<ReturnType<typeof api.modrinth.search>>["hits"][number];
  onClick: () => void;
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clickable list item container
    <div
      className="w-full h-full px-3.5 flex items-center justify-between rounded-lg text-left hover:bg-background dark:hover:bg-muted/50 transition-colors"
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3.5">
        <img aria-label="icon" src={item.icon_url} className="size-8 rounded-md" alt={item.title} />

        <div className="flex flex-col">
          <span className="font-bold text-sm">{item.title}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[90vh]">
            {item.description}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PackagePage({
  search = "",
  setMenu,
}: {
  search?: string;
  setMenu: (menu: JSX.Element) => void;
}): JSX.Element {
  const [page, setPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const listViewportRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["download:package", page, search],
    queryFn: () =>
      api.modrinth.search({
        facets: [["project_type:modpack"], ["versions:1.20.1"]],
        index: "downloads",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        query: search.trim() ? search.trim() : undefined,
      }),
    gcTime: 0,
  });

  useNavScroll(listViewportRef);

  useEffect(() => {
    void search;
    setIsInitialized(false);
    setPage(1);
    listViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [search]);

  useEffect((): (() => void) | undefined => {
    setMenu(
      <DropdownMenuRadioGroup>
        <DropdownMenuRadioItem value="release">
          <IconCircleCheck />
          正式版
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="snapshot">
          <IconFlask />
          测试版
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="old">
          <IconHistory />
          旧版
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>,
    );

    if (query.data && !isInitialized) {
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 500);

      return (): void => clearTimeout(timer);
    }

    return undefined;
  }, [query.data, isInitialized, setMenu]);

  const totalHits = query.data?.total_hits ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHits / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = getPageItems(safePage, totalPages);
  const versions = query.data?.hits ?? [];

  const handlePageChange = (newPage: number): void => {
    if (newPage < 1 || newPage > totalPages || newPage === safePage) {
      return;
    }
    setIsInitialized(false);
    setPage(newPage);
    listViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <QueryState query={query} loading={query.isLoading || query.isFetching}>
      <VirtualList
        viewportRef={listViewportRef}
        className="flex-1 min-h-0"
        data={versions}
        itemHeight={64}
        childrenAlign="bottom"
        renderItem={(
          item: Awaited<ReturnType<typeof api.modrinth.search>>["hits"][number],
          index: number,
        ) => (
          <motion.div
            key={item.project_id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 25,
              delay: !isInitialized ? index * 0.05 : 0,
            }}
            className="h-14"
          >
            <VersionItem item={item} onClick={() => 1} />
          </motion.div>
        )}
      >
        {totalHits > 0 && (
          <Pagination className="mb-2.5 w-full bg-background rounded-lg border p-1">
            <PaginationContent className="w-full">
              <PaginationItem className="mr-auto">
                <PaginationNext
                  text={null}
                  align="left"
                  href="#"
                  disabled={safePage <= 1}
                  onClick={(e: MouseEvent<HTMLAnchorElement>): void => {
                    e.preventDefault();
                    handlePageChange(safePage - 1);
                  }}
                />
              </PaginationItem>
              {pageItems.map((item) => {
                if (typeof item === "number") {
                  return (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === safePage}
                        onClick={(e: MouseEvent<HTMLAnchorElement>): void => {
                          e.preventDefault();
                          handlePageChange(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={item}>
                    <PaginationEllipsis max={totalPages} onPageChange={handlePageChange} />
                  </PaginationItem>
                );
              })}
              <PaginationItem className="ml-auto">
                <PaginationNext
                  text={null}
                  align="right"
                  href="#"
                  disabled={safePage >= totalPages}
                  onClick={(e: MouseEvent<HTMLAnchorElement>): void => {
                    e.preventDefault();
                    handlePageChange(safePage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </VirtualList>
    </QueryState>
  );
}
