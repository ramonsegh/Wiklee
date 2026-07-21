import { useParams } from "wouter";
import { Link } from "wouter";
import { CalendarClock } from "lucide-react";
import { useGetPublicProfile } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, isError } = useGetPublicProfile(username ?? "");

  if (isError) return <NotFound />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {isLoading || !profile ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="mb-10 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary font-display font-semibold text-2xl flex items-center justify-center mx-auto mb-4">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-2xl">{profile.name}</h1>
              <p className="text-muted-foreground mt-1">Pick an event type to see available times</p>
            </div>

            {profile.eventTypes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No event types available right now.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {profile.eventTypes.map((eventType) => (
                  <Link key={eventType.id} href={`/${profile.username}/${eventType.slug}`}>
                    <Card className="cursor-pointer hover-elevate">
                      <CardContent className="py-5 flex items-center gap-4">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: eventType.color }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{eventType.title}</p>
                          {eventType.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{eventType.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {eventType.durationMinutes} min
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
