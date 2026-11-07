import { Button } from "@/components/ui/button";

/** Modal footer for a form that renders above it; `form` is that form's id. */
export function FormActions({ form, onCancel }: { form: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
        Batal
      </Button>
      <Button type="submit" form={form} className="flex-1">
        Simpan
      </Button>
    </div>
  );
}
