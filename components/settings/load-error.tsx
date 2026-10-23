import { Button } from "@/components/ui/button";

export function LoadError({ onRetry, message = "Gagal memuat data." }: { onRetry: () => void; message?: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border px-4 py-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="h-11 text-base" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}
