"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { updateProfile, useProfile } from "@/hooks/use-profile";
import { applyServerErrors } from "@/lib/form-errors";
import { type Profile, profileSchema } from "@/lib/schemas/profile";
import { LoadError } from "./load-error";
import { failureMessage } from "@/lib/offline/network-error";

const formSchema = profileSchema.pick({ displayName: true, phone: true, location: true }).required();
type FormValues = z.input<typeof formSchema>;

export function ProfileSection() {
  const { data, error, mutate } = useProfile();

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat profil." />;
  if (!data) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat profil">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full" />
        ))}
      </div>
    );
  }
  return <ProfileForm profile={data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: profile.displayName ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
    },
  });

  const onSubmit = handleSubmit(async ({ displayName, phone, location }) => {
    try {
      await updateProfile({ displayName, phone: phone || null, location: location || null });
      toast.success("Profil disimpan");
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(failureMessage(err, "Gagal menyimpan profil. Coba lagi."));
    }
  });

  const fields = [
    { name: "displayName", label: "Nama", autoComplete: "name" },
    { name: "phone", label: "Nomor HP", autoComplete: "tel", type: "tel" },
    { name: "location", label: "Lokasi", autoComplete: "address-level2" },
  ] as const;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{profile.email}</p>
      {fields.map(({ name, label, ...inputProps }) => {
        const id = `profile-${name}`;
        return (
          <FormField key={name} id={id} label={label} error={errors[name]?.message}>
            <Input
              id={id}
              className="h-11"
              aria-invalid={!!errors[name]}
              aria-describedby={`${id}-message`}
              {...inputProps}
              {...register(name)}
            />
          </FormField>
        );
      })}
      <Button type="submit" className="h-11 self-start px-6 text-base" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Simpan
      </Button>
    </form>
  );
}
