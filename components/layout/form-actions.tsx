import { Button } from "@/components/ui/button";

/** Modal footer for a form that renders above it; `form` is that form's id. */
export function FormActions({ form, onCancel }: { form: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="h-11 flex-1 text-base" onClick={onCancel}>
        Batal
      </Button>
      <Button type="submit" form={form} className="h-11 flex-1 text-base">
        Simpan
      </Button>
    </div>
  );
}
