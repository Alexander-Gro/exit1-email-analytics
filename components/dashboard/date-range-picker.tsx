"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "MMM d, yyyy")} – {format(value.to, "MMM d, yyyy")}
              </>
            ) : (
              format(value.from, "MMM d, yyyy")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-gray-900 border-white/10 text-white"
        align="start"
      >
        <div className="flex">
          <div className="flex flex-col gap-1 border-r border-white/10 p-3 text-sm">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                className="text-left px-3 py-1.5 rounded-md hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                onClick={() => {
                  onChange({ from: subDays(new Date(), p.days - 1), to: new Date() });
                  setOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range) => range && onChange(range)}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            className="text-white [&_.rdp-day_button:hover]:bg-white/10 [&_.rdp-day_button.rdp-day_selected]:bg-blue-600"
          />
        </div>
        <div className="border-t border-white/10 p-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
