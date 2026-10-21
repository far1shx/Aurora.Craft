import { IconAlertCircle, IconCircleDashed } from "@tabler/icons-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { JSX, ReactNode } from "react";
import { Spinner } from "@/components/kibo-ui/spinner";
import { Button } from "@/components/ui/button.tsx";

function QueryState<TData, TError = Error>({
  query,
  loading,
  isEmpty,
  children,
}: {
  query: UseQueryResult<TData, TError>;
  loading?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
}): JSX.Element {
  if (loading ?? query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner variant="circle-filled" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <IconAlertCircle className="size-10" />
        <span className="text-muted-foreground">
          {query.error instanceof Error
            ? query.error.message
            : query.error
              ? String(query.error)
              : "发生未知错误"}
        </span>
        <Button variant="outline" onClick={() => query.refetch()} className="mt-2">
          重试
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <IconCircleDashed className="size-10" />
        <span className="text-muted-foreground">{"这里啥也没有"}</span>
      </div>
    );
  }

  return <>{children}</>;
}

export { QueryState };
