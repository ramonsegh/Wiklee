import { Link } from "wouter";
import { CalendarClock, CalendarDays, Clock, Link as LinkIcon } from "lucide-react";
import { useGetDashboardSummary, useGetMyProfile, useListMyBookings } from "@workspace/api-client-react";
import { DashboardLayout, basePath } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function Dashboard() {
  const { data: profile } = useGetMyProfile();
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: bookings } = useListMyBookings({ status: "upcoming" });

  const publicUrl = profile ? `${window.location.origin}${basePath}/${profile.username}` : "";

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back{profile?.name ? `, ${profile.name}` : ""}.
          </p>
        </div>
        {profile && (
          <Button variant="outline" asChild>
            <a href={`/${profile.username}`} target="_blank" rel="noreferrer">
              <LinkIcon className="h-4 w-4" />
              View booking page
            </a>
          </Button>
        )}
      </div>

      {profile && (
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">Your public booking page</p>
              <p className="font-mono text-sm mt-1">{publicUrl}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              Copy link
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={CalendarClock} label="Event types" value={summary?.totalEventTypes ?? 0} />
            <StatCard icon={CalendarDays} label="Upcoming bookings" value={summary?.upcomingBookings ?? 0} />
            <StatCard icon={Clock} label="Today" value={summary?.bookingsToday ?? 0} />
            <StatCard icon={CalendarDays} label="This week" value={summary?.bookingsThisWeek ?? 0} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No upcoming bookings yet. Share your booking page to get started.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{booking.eventTypeTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.inviteeName} &middot; {format(new Date(booking.startTime), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2">
            <Link href="/bookings" className="text-sm text-primary hover:underline">
              View all bookings
            </Link>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Icon className="h-5 w-5 text-primary mb-2" />
        <p className="text-2xl font-display font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
