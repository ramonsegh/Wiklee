import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getListMyBookingsQueryKey,
  useCancelBooking,
  useListMyBookings,
} from "@workspace/api-client-react";
import type { BookingStatusFilter } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const TABS: { value: BookingStatusFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export function Bookings() {
  const [status, setStatus] = useState<BookingStatusFilter>("upcoming");
  const { data: bookings, isLoading } = useListMyBookings({ status });
  const queryClient = useQueryClient();
  const cancelMutation = useCancelBooking();
  const { toast } = useToast();

  return (
    <DashboardLayout>
      <h1 className="text-2xl mb-8">Bookings</h1>

      <Tabs value={status} onValueChange={(v) => setStatus(v as BookingStatusFilter)} className="mb-6">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookings in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{booking.eventTypeTitle}</p>
                    <Badge variant={booking.status === "cancelled" ? "secondary" : "default"}>
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(booking.startTime), "EEE, MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.inviteeName} &middot; {booking.inviteeEmail}
                  </p>
                  {booking.notes && <p className="text-sm text-muted-foreground mt-1">"{booking.notes}"</p>}
                </div>
                {booking.status === "confirmed" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {booking.inviteeName} will need to book a new time if they still want to meet.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep booking</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            cancelMutation.mutate(
                              { id: booking.id },
                              {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
                                  queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
                                  toast({ title: "Booking cancelled" });
                                },
                                onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
                              },
                            )
                          }
                        >
                          Cancel booking
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
