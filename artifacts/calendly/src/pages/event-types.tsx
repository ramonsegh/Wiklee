import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getListMyEventTypesQueryKey,
  useCreateEventType,
  useDeleteEventType,
  useListMyEventTypes,
  useUpdateEventType,
} from "@workspace/api-client-react";
import type { EventType } from "@workspace/api-client-react";
import { DashboardLayout, basePath } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Copy, EyeOff, Lock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(5).max(480),
  color: z.string().min(1),
  isActive: z.boolean(),
  isPublic: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f97316", "#e11d48", "#a855f7"];

function EventTypeForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  submitLabel: string;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const color = watch("color");
  const isActive = watch("isActive");
  const isPublic = watch("isPublic");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Name</Label>
        <Input id="title" placeholder="30 Minute Meeting" {...register("title")} />
        {formState.errors.title && (
          <p className="text-sm text-destructive">{formState.errors.title.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="durationMinutes">Duration (minutes)</Label>
        <Input id="durationMinutes" type="number" min={5} max={480} {...register("durationMinutes")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="What's this meeting about?" {...register("description")} />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue("color", c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? "var(--foreground)" : "transparent" }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <div>
          <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
          <p className="text-xs text-muted-foreground">Visible and bookable by guests</p>
        </div>
        <Switch id="isActive" checked={isActive} onCheckedChange={(v) => setValue("isActive", v)} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <Label htmlFor="isPublic" className="cursor-pointer">Listed publicly</Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? "Shown on your public booking page" : "Secret — only accessible via direct link"}
            </p>
          </div>
        </div>
        <Switch id="isPublic" checked={isPublic} onCheckedChange={(v) => setValue("isPublic", v)} />
      </div>
      <DialogFooter>
        <Button type="submit">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}

const DEMO_EVENTS = [
  {
    title: "Quick Chat",
    description: "A casual 15-minute catch-up. No agenda needed.",
    durationMinutes: 15,
    color: "#0ea5e9",
    isActive: true,
    isPublic: true,
  },
  {
    title: "VIP Strategy Session",
    description: "Private 60-minute session — invite only.",
    durationMinutes: 60,
    color: "#6366f1",
    isActive: true,
    isPublic: false,
  },
];

export function EventTypes() {
  const { data: eventTypes, isLoading } = useListMyEventTypes();
  const { data: profile } = useGetMyProfile();
  const queryClient = useQueryClient();
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const deleteMutation = useDeleteEventType();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [seeding, setSeeding] = useState(false);

  const invalidateEventTypes = () => {
    queryClient.invalidateQueries({ queryKey: getListMyEventTypesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  async function loadDemoData() {
    setSeeding(true);
    try {
      for (const demo of DEMO_EVENTS) {
        await new Promise<void>((resolve, reject) => {
          createMutation.mutate(
            { data: demo },
            { onSuccess: () => resolve(), onError: () => reject() },
          );
        });
      }
      invalidateEventTypes();
      toast({ title: "Demo event types created!" });
    } catch {
      toast({ title: "Failed to create demo data", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl">Event Types</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New event type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New event type</DialogTitle>
            </DialogHeader>
            <EventTypeForm
              defaultValues={{ title: "", description: "", durationMinutes: 30, color: COLORS[0], isActive: true, isPublic: true }}
              submitLabel="Create"
              onSubmit={(values) => {
                createMutation.mutate(
                  { data: values },
                  {
                    onSuccess: () => {
                      setCreateOpen(false);
                      invalidateEventTypes();
                      toast({ title: "Event type created" });
                    },
                    onError: () => toast({ title: "Failed to create event type", variant: "destructive" }),
                  },
                );
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !eventTypes || eventTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No event types yet. Create your first one to start accepting bookings.
            </p>
            <Button
              variant="outline"
              onClick={loadDemoData}
              disabled={seeding}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {seeding ? "Creating..." : "Load demo events"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Creates a public "Quick Chat" and a secret "VIP Strategy Session"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {eventTypes.map((eventType) => (
            <Card key={eventType.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: eventType.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{eventType.title}</p>
                      {!eventType.isActive && <Badge variant="secondary">Hidden</Badge>}
                      {!eventType.isPublic && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <EyeOff className="h-3 w-3" />
                          Secret
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {eventType.durationMinutes} min &middot; /{profile?.username}/{eventType.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copy link"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}${basePath}/${profile?.username}/${eventType.slug}`,
                      );
                      toast({ title: "Link copied!" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(eventType)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{eventType.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. Guests will no longer be able to book this event type.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deleteMutation.mutate(
                              { id: eventType.id },
                              {
                                onSuccess: () => invalidateEventTypes(),
                                onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
                              },
                            )
                          }
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit event type</DialogTitle>
          </DialogHeader>
          {editing && (
            <EventTypeForm
              defaultValues={{
                title: editing.title,
                description: editing.description ?? "",
                durationMinutes: editing.durationMinutes,
                color: editing.color,
                isActive: editing.isActive,
                isPublic: editing.isPublic,
              }}
              submitLabel="Save changes"
              onSubmit={(values) => {
                updateMutation.mutate(
                  { id: editing.id, data: values },
                  {
                    onSuccess: () => {
                      setEditing(null);
                      invalidateEventTypes();
                      toast({ title: "Event type updated" });
                    },
                    onError: () => toast({ title: "Failed to update event type", variant: "destructive" }),
                  },
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
