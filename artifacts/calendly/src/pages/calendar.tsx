import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListMyBookings } from "@workspace/api-client-react";
import type { Booking } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-zinc-600", text: "text-white" },
  { bg: "bg-slate-500", text: "text-white" },
  { bg: "bg-yellow-600", text: "text-white" },
  { bg: "bg-stone-500", text: "text-white" },
  { bg: "bg-neutral-600", text: "text-white" },
];

function colorForTitle(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  }
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

function bookingsForDay(bookings: Booking[], day: Date): Booking[] {
  return bookings.filter((b) => isSameDay(parseISO(b.startTime as string), day));
}

const MAX_VISIBLE = 5;

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: bookings = [] } = useListMyBookings({ status: "all" });

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const selectedDayBookings = useMemo(
    () => (selectedDay ? bookingsForDay(bookings, selectedDay) : []),
    [selectedDay, bookings],
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(startOfMonth(new Date()));
                setSelectedDay(new Date());
              }}
            >
              Today
            </Button>
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0 border border-border rounded-2xl overflow-hidden bg-card">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {days.map((day, idx) => {
                const dayBookings = bookingsForDay(bookings, day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isTodayDay = isToday(day);
                const visibleBookings = dayBookings.slice(0, MAX_VISIBLE);
                const overflow = dayBookings.length - MAX_VISIBLE;

                return (
                  <button
                    key={idx}
                    onClick={() =>
                      setSelectedDay(isSelected ? null : day)
                    }
                    className={cn(
                      "min-h-[96px] p-2 text-left border-b border-r border-border flex flex-col gap-1 transition-colors",
                      "hover:bg-muted/40",
                      !isCurrentMonth && "bg-muted/20",
                      isSelected && "bg-amber-50/60 dark:bg-amber-950/10",
                      (idx + 1) % 7 === 0 && "border-r-0",
                      idx >= days.length - 7 && "border-b-0",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium transition-colors",
                        isTodayDay && "bg-amber-500 text-white",
                        !isTodayDay && isCurrentMonth && "text-foreground",
                        !isTodayDay && !isCurrentMonth && "text-muted-foreground/50",
                        isSelected && !isTodayDay && "ring-2 ring-amber-400 ring-offset-1",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {visibleBookings.map((booking) => {
                        const color = colorForTitle(booking.eventTypeTitle);
                        const cancelled = booking.status === "cancelled";
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "flex items-center rounded px-1.5 py-0.5 text-xs truncate",
                              cancelled
                                ? "bg-zinc-100 text-zinc-400 line-through"
                                : cn(color.bg, color.text),
                            )}
                          >
                            <span className="truncate font-medium">
                              {format(parseISO(booking.startTime as string), "h:mm")}{" "}
                              {booking.eventTypeTitle}
                            </span>
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <span className="text-xs text-muted-foreground px-1 font-medium">
                          +{overflow} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel — selected day */}
          {selectedDay && (
            <div className="w-72 shrink-0">
              <div className="border border-border rounded-2xl bg-card overflow-hidden sticky top-6">
                <div className="px-4 py-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {format(selectedDay, "EEEE")}
                  </p>
                  <p className="text-3xl font-semibold mt-0.5 tabular-nums">
                    {format(selectedDay, "d")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDay, "MMMM yyyy")}
                  </p>
                </div>

                <div className="overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-320px)]">
                  {selectedDayBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No bookings this day
                    </p>
                  ) : (
                    selectedDayBookings.map((booking) => {
                      const color = colorForTitle(booking.eventTypeTitle);
                      const cancelled = booking.status === "cancelled";
                      const start = parseISO(booking.startTime as string);
                      const end = parseISO(booking.endTime as string);
                      return (
                        <div
                          key={booking.id}
                          className="rounded-xl p-3 border border-border bg-card"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                "mt-1 h-2 w-2 rounded-full shrink-0",
                                cancelled ? "bg-zinc-400" : color.bg,
                              )}
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-semibold leading-tight",
                                  cancelled && "line-through text-muted-foreground",
                                )}
                              >
                                {booking.eventTypeTitle}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(start, "h:mm a")} – {format(end, "h:mm a")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {booking.inviteeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {booking.inviteeEmail}
                              </p>
                              {booking.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  "{booking.notes}"
                                </p>
                              )}
                              <Badge
                                variant={cancelled ? "secondary" : "default"}
                                className="mt-2 text-xs"
                              >
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
