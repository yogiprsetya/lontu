"use client";

import { useMemo, useState } from "react";
import { EllipsisVerticalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { RecurringForm } from "@/components/forms/recurring-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import {
  RestoreButton,
  ShowArchivedSwitch,
} from "@/components/modals/archive-controls";
import {
  RecordOccurrenceModal,
  skipOccurrence,
} from "@/components/recurring/occurrence-actions";
import { RuleRow } from "@/components/recurring/rule-row";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { archiveRule, restoreRule, useRecurring } from "@/hooks/use-recurring";
import { todayInJakarta } from "@/lib/date";
import { failureMessage } from "@/lib/offline/network-error";
import { undoToast } from "@/lib/undo-toast";
import type { RulePreset } from "@/lib/recurring-form";
import { RECURRING_GROUPS } from "@/lib/recurring-format";
import type { RecurringRule } from "@/lib/schemas/recurring";
import { nameMap } from "@/lib/transaction-format";

type Editing =
  | { kind: "create"; preset?: RulePreset }
  | { kind: "edit"; id: string }
  | null;

function ViewSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Memuat aturan"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

type RowMenuProps = {
  rule: RecurringRule;
  online: boolean;
  onArchive: () => void;
};

// Lewati acts on the next occurrence even before it is due (spec decision #10).
function RowMenu({ rule, online, onArchive }: RowMenuProps) {
  const suffix = online ? "" : " · Butuh koneksi";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            aria-label={`Aksi untuk ${rule.name}`}
          />
        }
      >
        <EllipsisVerticalIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-2xl p-1.5">
        <DropdownMenuItem
          className="min-h-11 rounded-xl text-base"
          disabled={!online}
          onClick={() => void skipOccurrence(rule)}
        >
          Lewati{suffix}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 rounded-xl text-base"
          disabled={!online}
          onClick={onArchive}
        >
          Arsipkan{suffix}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecurringView() {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  // Archived rows vanish at once; the id leaves this set when the request settles.
  const [archiving, setArchiving] = useState<ReadonlySet<string>>(new Set());
  const online = useOnlineStatus();
  const recurring = useRecurring({ includeArchived: showArchived });
  const accounts = useAccounts({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const today = todayInJakarta();

  const rules = recurring.data?.rules.filter((r) => !archiving.has(r.id));
  const editingRule =
    editing?.kind === "edit"
      ? recurring.data?.rules.find((r) => r.id === editing.id)
      : undefined;
  const recording = recurring.data?.rules.find(
    (r) => r.id === recordingId && !r.archivedAt,
  );
  const currentPayday = recurring.data?.rules.find(
    (r) => r.isPayday && !r.archivedAt,
  );
  const close = () => setEditing(null);

  function settle(id: string) {
    setArchiving((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function archive(rule: RecurringRule) {
    setArchiving((prev) => new Set(prev).add(rule.id));
    try {
      await archiveRule(rule.id);
      undoToast({ message: "Aturan diarsipkan", restore: () => restoreRule(rule.id) });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal mengarsipkan aturan. Coba lagi."));
    } finally {
      settle(rule.id);
    }
  }

  const error = recurring.error ?? accounts.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat aturan berulang."
        onRetry={() => {
          void recurring.mutate();
          void accounts.mutate();
        }}
      />
    );
  } else if (!rules || !accounts.data) {
    content = <ViewSkeleton />;
  } else if (rules.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground">
          {showArchived
            ? "Belum ada aturan, termasuk arsip."
            : "Daftarkan gaji dan tagihan tetap supaya kamu tahu berapa yang bebas dipakai sampai gajian."}
        </p>
        {!showArchived && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              className="h-11 text-base"
              onClick={() =>
                setEditing({
                  kind: "create",
                  preset: { type: "income", isPayday: true },
                })
              }
            >
              Tambah gaji
            </Button>

            <Button
              variant="outline"
              className="h-11 text-base"
              onClick={() =>
                setEditing({ kind: "create", preset: { type: "expense" } })
              }
            >
              Tambah tagihan
            </Button>
          </div>
        )}
      </div>
    );
  } else {
    content = RECURRING_GROUPS.map(({ type, label }) => {
      const rows = rules.filter((r) => r.type === type);
      if (rows.length === 0) return null;
      return (
        <section key={type} aria-labelledby={`recurring-${type}`}>
          <h2
            id={`recurring-${type}`}
            className="mb-2 px-1 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
          >
            {label}
          </h2>
          <ul className="surface divide-y px-4">
            {rows.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                accountName={accountNames.get(rule.accountId) ?? "Akun"}
                today={today}
                onEdit={
                  rule.archivedAt
                    ? undefined
                    : () => setEditing({ kind: "edit", id: rule.id })
                }
              >
                {rule.archivedAt ? (
                  <RestoreButton
                    name={rule.name}
                    restore={() => restoreRule(rule.id)}
                  />
                ) : (
                  <>
                    {/* Always visible, not in the menu; filled once the occurrence is due. */}
                    <Button
                      variant={rule.nextDueDate <= today ? "default" : "outline"}
                      className="h-11 px-4 text-base"
                      disabled={!online}
                      onClick={() => setRecordingId(rule.id)}
                    >
                      Catat
                    </Button>
                    <RowMenu
                      rule={rule}
                      online={online}
                      onArchive={() => void archive(rule)}
                    />
                  </>
                )}
              </RuleRow>
            ))}
          </ul>
        </section>
      );
    });
  }

  const formOpen = editing?.kind === "create" || !!editingRule;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          className="h-11 self-start text-base"
          onClick={() => setEditing({ kind: "create" })}
        >
          <PlusIcon aria-hidden />
          Tambah aturan
        </Button>
        <ShowArchivedSwitch
          id="show-archived-rules"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        {!online && (
          <p className="text-sm text-muted-foreground">
            Butuh koneksi untuk mencatat, melewati, atau mengarsipkan.
          </p>
        )}
      </div>
      {content}
      <ResponsiveModal
        open={formOpen}
        onOpenChange={(open) => !open && close()}
        title={editingRule ? "Ubah aturan" : "Tambah aturan"}
        footer={
          <div className="flex flex-col gap-2">
            {!online && (
              <p className="text-center text-sm text-muted-foreground">
                Butuh koneksi untuk menyimpan.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 text-base"
                onClick={close}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="recurring-form"
                className="h-11 flex-1 text-base"
                disabled={!online}
              >
                Simpan
              </Button>
            </div>
          </div>
        }
      >
        {formOpen && (
          <RecurringForm
            key={editingRule?.id ?? "create"}
            rule={editingRule}
            preset={editing?.kind === "create" ? editing.preset : undefined}
            currentPayday={currentPayday}
            today={today}
            onDone={close}
          />
        )}
      </ResponsiveModal>
      <RecordOccurrenceModal
        rule={recording}
        onClose={() => setRecordingId(null)}
      />
    </>
  );
}
