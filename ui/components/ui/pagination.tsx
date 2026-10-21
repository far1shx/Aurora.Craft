import { IconChevronLeft, IconChevronRight, IconDots } from "@tabler/icons-react";
import { cn } from "cn";
import {
  type ChangeEvent,
  type ComponentProps,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";

function Pagination({ className, ...props }: ComponentProps<"nav">): JSX.Element {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">): JSX.Element {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: ComponentProps<"li">): JSX.Element {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  disabled?: boolean;
} & Pick<ComponentProps<typeof Button>, "size"> &
  ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  disabled,
  size = "icon",
  ...props
}: PaginationLinkProps): JSX.Element {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      disabled={disabled}
      className={cn(disabled && "pointer-events-none opacity-50", className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: ComponentProps<typeof PaginationLink> & { text?: string }): JSX.Element {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("pl-1.5!", className)}
      {...props}
    >
      <IconChevronLeft data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  align = "right",
  ...props
}: ComponentProps<typeof PaginationLink> & {
  text?: string | null;
  align?: "left" | "right";
}): JSX.Element {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size={text ? "default" : "icon"}
      className={cn(className)}
      {...props}
    >
      {align === "left" && <IconChevronLeft data-icon="inline-start" />}
      {text && <span className="hidden sm:block">{text}</span>}
      {align === "right" && <IconChevronRight data-icon="inline-end" />}
    </PaginationLink>
  );
}

type PaginationEllipsisProps = {
  max?: number;
  onPageChange?: (page: number) => void;
} & ComponentProps<"span">;

function PaginationEllipsis({
  className,
  max,
  onPageChange,
  ...props
}: PaginationEllipsisProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const submit = (): void => {
    const num = Number.parseInt(value, 10);
    if (!Number.isNaN(num)) {
      const target = Math.max(1, Math.min(max ?? Infinity, num));
      onPageChange?.(target);
    }
    setIsEditing(false);
  };

  if (onPageChange && isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={max}
        placeholder={max ? `1-${max}` : "页码"}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => {
          const val = e.target.value;
          if (val === "") {
            setValue("");
            return;
          }
          const num = Number.parseInt(val, 10);
          if (!Number.isNaN(num)) {
            if (max !== undefined && num > max) {
              setValue(String(max));
            } else if (num < 1) {
              setValue("1");
            } else {
              setValue(String(num));
            }
          }
        }}
        onBlur={submit}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setIsEditing(false);
          }
        }}
        className={cn(
          "h-8 w-11 rounded-lg border border-input bg-background px-1 text-center text-xs font-medium shadow-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
      />
    );
  }

  if (onPageChange) {
    return (
      <button
        type="button"
        aria-label="跳转页码"
        title={max ? `点击跳转页码 (1-${max})` : "点击跳转页码"}
        data-slot="pagination-ellipsis"
        onClick={(): void => {
          setValue("");
          setIsEditing(true);
        }}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
          className,
        )}
      >
        <IconDots className="size-4" />
        <span className="sr-only">跳转页码</span>
      </button>
    );
  }

  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <IconDots />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
