import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ko } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function displayLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = "날짜 선택",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const minDate = parseDate(min ?? "");
  const maxDate = parseDate(max ?? "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl border border-[#dcd8ce] bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-[#b7cbb2]"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-[#214e3b]" />
          <span className="text-stone-400">{label}</span>
          <span className={value ? "text-stone-800" : "text-stone-400"}>{value ? displayLabel(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-2xl border-[#e7e4dc] p-0 shadow-[0_20px_50px_rgba(69,65,53,0.16)]"
        style={
          {
            "--primary": "#214e3b",
            "--primary-foreground": "#ffffff",
            "--accent": "#e8f0e8",
            "--accent-foreground": "#214e3b",
          } as React.CSSProperties
        }
      >
        <Calendar
          mode="single"
          locale={ko}
          selected={parseDate(value)}
          defaultMonth={parseDate(value) ?? maxDate ?? new Date()}
          disabled={(date: Date) => (minDate ? date < minDate : false) || (maxDate ? date > maxDate : false)}
          onSelect={date => { if (date) { onChange(formatDate(date)); setOpen(false); } }}
        />
      </PopoverContent>
    </Popover>
  );
}
