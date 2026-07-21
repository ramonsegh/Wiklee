import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { CalendarClock, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCreatePublicBooking,
  useGetPublicEventType,
  useGetPublicEventTypeSlots,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";

const bookingFormSchema = z.object({
  inviteeName: z.string().min(1, "Name is required"),
  inviteeEmail: z.string().email("Enter a valid email"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const VISIBLE_DAYS = 7;
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function PublicBooking() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { data: eventType, isLoading, isError } = useGetPublicEventType(username ?? "", slug ?? "");

  const [rangeStart, setRangeStart] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  const startDate = format(rangeStart, "yyyy-MM-dd");
  const endDate = format(addDays(rangeStart, VISIBLE_DAYS - 1), "yyyy-MM-dd");

  const { data: slotDays, isLoading: slotsLoading } = useGetPublicEventTypeSlots({
    username: username ?? "",
    slug: slug ?? "",
    startDate,
    endDate,
    timezone,
  });

  const createBookingMutation = useCreatePublicBooking();

  const { register, handleSubmit, formState } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
  });

  const daysWithSlots = useMemo(() => {
    return Array.from({ length: VISIBLE_DAYS }).map((_, i) => {
      const date = addDays(rangeStart, i);
      const dateKey = format(date, "yyyy-MM-dd");
      const match = slotDays?.find((d) => d.date === dateKey);
      return { date, slots: match?.slots ?? [] };
    });
  }, [rangeStart, slotDays]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return daysWithSlots.find((d) => isSameDay(d.date, selectedDate))?.slots ?? [];
  }, [daysWithSlots, selectedDate]);

  if (isError) return <NotFound />;

  if (isLoading || !eventType) {
    return (
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-10 text-center flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="text-xl">You're booked!</h1>
            <p className="text-muted-foreground text-sm">
              {eventType.title} with {eventType.hostName}
              {selectedSlot && (
                <>
                  <br />
                  {format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a")}
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{eventType.hostName}</p>
          <h1 className="text-2xl">{eventType.title}</h1>
          {eventType.description && <p className="text-muted-foreground mt-1">{eventType.description}</p>}
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
            <CalendarClock className="h-4 w-4" />
            {eventType.durationMinutes} min
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {!selectedSlot ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRangeStart((d) => addDays(d, -VISIBLE_DAYS))}
                    disabled={isSameDay(rangeStart, startOfDay(new Date()))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-medium">
                    {format(rangeStart, "MMM d")} - {format(addDays(rangeStart, VISIBLE_DAYS - 1), "MMM d")}
                  </p>
                  <Button variant="ghost" size="icon" onClick={() => setRangeStart((d) => addDays(d, VISIBLE_DAYS))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-6">
                  {daysWithSlots.map(({ date, slots }) => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={slots.length === 0}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center gap-1 rounded-md p-2 text-sm hover-elevate disabled:opacity-30 disabled:pointer-events-none ${
                        selectedDate && isSameDay(selectedDate, date) ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <span className="text-xs text-muted-foreground">{format(date, "EEE")}</span>
                      <span className="font-medium">{format(date, "d")}</span>
                    </button>
                  ))}
                </div>

                {slotsLoading ? (
                  <Skeleton className="h-40 rounded-md" />
                ) : !slotsLoading && daysWithSlots.every((d) => d.slots.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No availability set for this period. Try a different week.
                  </p>
                ) : selectedDate ? (
                  slotsForSelectedDay.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No times available this day.</p>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {slotsForSelectedDay.map((slot) => (
                        <Button key={slot} variant="outline" onClick={() => setSelectedSlot(slot)}>
                          {format(new Date(slot), "h:mm a")}
                        </Button>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Select a day to see open times.</p>
                )}
              </>
            ) : (
              <form
                onSubmit={handleSubmit((values) => {
                  createBookingMutation.mutate(
                    {
                      username: username ?? "",
                      slug: slug ?? "",
                      data: { ...values, startTime: selectedSlot, timezone },
                    },
                    {
                      onSuccess: () => setBooked(true),
                      onError: () => setSelectedSlot(null),
                    },
                  );
                })}
                className="space-y-4"
              >
                <div className="pb-4 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to times
                  </button>
                  <p className="font-medium mt-2">
                    {format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteeName">Your name</Label>
                  <Input id="inviteeName" {...register("inviteeName")} />
                  {formState.errors.inviteeName && (
                    <p className="text-sm text-destructive">{formState.errors.inviteeName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteeEmail">Email</Label>
                  <Input id="inviteeEmail" type="email" {...register("inviteeEmail")} />
                  {formState.errors.inviteeEmail && (
                    <p className="text-sm text-destructive">{formState.errors.inviteeEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional notes</Label>
                  <Textarea id="notes" {...register("notes")} />
                </div>
                {createBookingMutation.isError && (
                  <p className="text-sm text-destructive">This time was just taken. Please pick another.</p>
                )}
                <Button type="submit" className="w-full" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? "Booking..." : "Confirm booking"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
