import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const { toast } = await import("sonner");
const { ApiError } = await import("@/lib/fetcher");
const { OFFLINE_MUTATION_MESSAGE } = await import("@/lib/offline/network-error");
const { undoToast } = await import("@/lib/undo-toast");

const mockedToast = vi.mocked(toast);

type Options = { duration: number; action: { label: string; onClick: () => void } };

function shown() {
  const [message, options] = mockedToast.mock.calls[0] as unknown as [string, Options];
  return { message, options };
}

async function clickUndo() {
  shown().options.action.onClick();
  await vi.waitFor(() => expect(mockedToast.error).toHaveBeenCalled());
}

beforeEach(() => {
  mockedToast.mockReset();
  mockedToast.error.mockReset();
});

describe("undoToast", () => {
  it("shows the message with an Urungkan action for 6 seconds", () => {
    undoToast({ message: "Transaksi dihapus", restore: vi.fn(async () => {}) });
    expect(shown().message).toBe("Transaksi dihapus");
    expect(shown().options.duration).toBe(6000);
    expect(shown().options.action.label).toBe("Urungkan");
  });

  it("restores on Urungkan without an error toast when it succeeds", async () => {
    const restore = vi.fn(async () => {});
    undoToast({ message: "Budget dihapus", restore });
    shown().options.action.onClick();
    await Promise.resolve();
    expect(restore).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("shows the fallback when the server refuses the restore", async () => {
    undoToast({
      message: "Budget dihapus",
      restore: () => Promise.reject(new ApiError(500, "INTERNAL", "x")),
    });
    await clickUndo();
    expect(mockedToast.error).toHaveBeenCalledWith("Gagal mengurungkan. Coba lagi.");
  });

  it("shows the offline message when the restore never reaches the server", async () => {
    undoToast({
      message: "Aturan diarsipkan",
      restore: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await clickUndo();
    expect(mockedToast.error).toHaveBeenCalledWith(OFFLINE_MUTATION_MESSAGE);
  });

  it("takes a custom fallback", async () => {
    undoToast({
      message: "x",
      restore: () => Promise.reject(new Error("x")),
      failure: "Gagal memulihkan.",
    });
    await clickUndo();
    expect(mockedToast.error).toHaveBeenCalledWith("Gagal memulihkan.");
  });
});
