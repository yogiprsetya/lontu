import { permanentRedirect } from "next/navigation";

// Keeps old bookmarks and service-worker-cached links working after the rename.
export default function GoalsPage() {
  permanentRedirect("/net-worth");
}
