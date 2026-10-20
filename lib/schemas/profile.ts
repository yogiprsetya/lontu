import { z } from "zod";

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1, "Nama wajib diisi").max(80, "Maksimal 80 karakter"),
    phone: z.string().trim().max(32, "Maksimal 32 karakter").nullable(),
    location: z.string().trim().max(100, "Maksimal 100 karakter").nullable(),
    currency: z.literal("IDR", "Saat ini hanya IDR"),
  })
  .partial();

export type ProfileInput = z.infer<typeof profileSchema>;
