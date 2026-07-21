import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMyAvailabilityQueryKey,
  useListMyAvailability,
  useReplaceMyAvailability,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type DayState = { enabled: boolean; startTime: string; endTime: string };

const defaultDayState = (): DayState => ({ enabled: false, startTime: "09:00", endTime: "17:00" });

export function Availability() {
  const { data: rules, isLoading } = useListMyAvailability();
  const queryClient = useQueryClient();
  const replaceMutation = useReplaceMyAvailability();
  const { toast } = useToast();

  const [days, setDays] = useState<Record<number, DayState>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.value, defaultDayState()])),
  );

  useEffect(() => {
    if (!rules) return;
    const next = Object.fromEntries(DAYS.map((d) => [d.value, defaultDayState()])) as Record<number, DayState>;
    for (const rule of rules) {
      next[rule.dayOfWeek] = { enabled: true, startTime: rule.startTime, endTime: rule.endTime };
    }
    setDays(next);
  }, [rules]);

  function updateDay(day: number, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function handleSave() {
    const payload = {
      rules: DAYS.filter((d) => days[d.value]?.enabled).map((d) => ({
        dayOfWeek: d.value,
        startTime: days[d.value].startTime,
        endTime: days[d.value].endTime,
      })),
    };
    replaceMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyAvailabilityQueryKey() });
          toast({ title: "Availability saved" });
        },
        onError: () => toast({ title: "Failed to save availability", variant: "destructive" }),
      },
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl">Availability</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set the weekly hours guests can book with you.
          </p>
        </div>
        <Button onClick={handleSave} disabled={replaceMutation.isPending}>
          {replaceMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6 divide-y divide-border">
            {DAYS.map((day) => {
              const state = days[day.value] ?? defaultDayState();
              return (
                <div key={day.value} className="py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <Switch
                      checked={state.enabled}
                      onCheckedChange={(v) => updateDay(day.value, { enabled: v })}
                    />
                    <span className={state.enabled ? "font-medium" : "text-muted-foreground"}>
                      {day.label}
                    </span>
                  </div>
                  {state.enabled ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={state.startTime}
                        onChange={(e) => updateDay(day.value, { startTime: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={state.endTime}
                        onChange={(e) => updateDay(day.value, { endTime: e.target.value })}
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
