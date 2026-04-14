import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** تطبيع النص العربي — إزالة التشكيل وتوحيد أشكال الحروف */
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  dir?: "rtl" | "ltr";
  "data-testid"?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث...",
  emptyText = "لا توجد نتائج",
  className,
  triggerClassName,
  disabled = false,
  dir = "rtl",
  "data-testid": dataTestId,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const words = search.trim().split(/\s+/);
    return options.filter((o) => {
      const normalizedLabel = normalizeArabic(o.label.toLowerCase());
      return words.every(word => normalizedLabel.includes(normalizeArabic(word.toLowerCase())));
    });
  }, [options, search]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            "w-full justify-between font-normal text-sm h-9",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", className)}
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: 220 }}
        align="start"
        dir={dir}
      >
        <div className="flex items-center border-b px-3 gap-2" dir={dir}>
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            dir={dir}
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto overflow-x-hidden p-1" dir={dir}>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                  option.disabled && "pointer-events-none opacity-50",
                  value === option.value && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onValueChange(option.value === value ? "" : option.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "ml-2 h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
