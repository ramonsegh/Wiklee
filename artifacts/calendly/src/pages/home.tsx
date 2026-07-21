import { Link } from "wouter";
import { CalendarClock, Clock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 max-w-6xl w-full mx-auto">
        <span className="font-display font-semibold text-lg">Wiklee</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight max-w-2xl">
          Scheduling, without the back-and-forth
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          Create event types, set your availability, and share a booking link.
          Guests pick a time that works &mdash; no emails required.
        </p>
        <div className="mt-8 flex gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start scheduling for free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <CalendarClock className="h-8 w-8 text-primary" />
              <h3 className="font-display font-semibold">Define event types</h3>
              <p className="text-sm text-muted-foreground">
                Set up meetings of any length with custom names and colors.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <h3 className="font-display font-semibold">Set your availability</h3>
              <p className="text-sm text-muted-foreground">
                Choose your weekly working hours once and let it run.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <Share2 className="h-8 w-8 text-primary" />
              <h3 className="font-display font-semibold">Share your link</h3>
              <p className="text-sm text-muted-foreground">
                Guests pick an open slot and book instantly &mdash; done.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
