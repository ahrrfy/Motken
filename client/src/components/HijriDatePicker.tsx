import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, toHijri } from "@/lib/utils";

interface HijriDatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  "data-testid"?: string;
}

export function HijriDatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  className,
  disabled,
  name,
  id,
  "data-testid": testId,
}: HijriDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const formatGregorian = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
    setOpen(false);
  };

  const hijriStr = selectedDate ? toHijri(selectedDate) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          id={id}
          data-testid={testId}
          className={cn(
            "w-full justify-start text-right font-normal h-9 px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          {selectedDate ? (
            <span className="flex items-center gap-2 text-sm">
              <span>{formatGregorian(selectedDate)}</span>
              {hijriStr && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{hijriStr} هـ</span>
                </>
              )}
            </span>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2040, 11)}
          formatters={{
            formatMonthDropdown: (date) =>
              date.toLocaleDateString("ar-SA", { month: "long" }),
          }}
        />
        {selectedDate && (
          <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
            {hijriStr && `${hijriStr} هـ`}
          </div>
        )}
      </PopoverContent>
      {name && <input type="hidden" name={name} value={value || ""} />}
    </Popover>
  );
}
