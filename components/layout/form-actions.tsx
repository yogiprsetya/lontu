import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormActionsProps = {
  /** The id of the form rendered above this footer. */
  form: string;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** For forms that save online only: blocks Simpan and says why. */
  offline?: boolean;
};

/** Modal footer for a form that renders above it. */
export function FormActions({
  form,
  onCancel,
  isSubmitting = false,
  offline = false,
}: FormActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      {offline && (
        <p className="text-center text-sm text-muted-foreground">Butuh koneksi untuk menyimpan.</p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Batal
        </Button>
        <Button type="submit" form={form} className="flex-1" disabled={isSubmitting || offline}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          Simpan
        </Button>
      </div>
    </div>
  );
}
