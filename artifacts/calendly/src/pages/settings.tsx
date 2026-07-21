import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyProfileQueryKey, useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { DashboardLayout, basePath } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  timezone: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function Settings() {
  const { data: profile, isLoading } = useGetMyProfile();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateMyProfile();
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", username: "", timezone: "UTC" },
  });

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name, username: profile.username, timezone: profile.timezone });
    }
  }, [profile, reset]);

  function onSubmit(values: FormValues) {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          toast({ title: "Settings saved" });
        },
        onError: (error: any) =>
          toast({
            title: error?.error === "Username is already taken" ? "Username is already taken" : "Failed to save settings",
            variant: "destructive",
          }),
      },
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl mb-8">Settings</h1>

      {isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...register("name")} />
                {formState.errors.name && (
                  <p className="text-sm text-destructive">{formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">{window.location.host}{basePath}/</span>
                  <Input id="username" {...register("username")} />
                </div>
                {formState.errors.username && (
                  <p className="text-sm text-destructive">{formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" placeholder="America/New_York" {...register("timezone")} />
                <p className="text-xs text-muted-foreground">
                  IANA timezone name, e.g. America/New_York, Europe/London.
                </p>
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
