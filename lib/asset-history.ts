import type {
  AssetHistoryMonth,
  AssetHistoryPoint,
  AssetHistoryValue,
} from "@/lib/schemas/asset-history";

/** Each month's change against the one before it; the first against `opening`. */
export function withChanges(
  opening: AssetHistoryValue,
  points: AssetHistoryPoint[],
): AssetHistoryMonth[] {
  return points.map((point, i) => {
    const prev = i === 0 ? opening : points[i - 1];
    return {
      ...point,
      contributionChange: point.contributed - prev.contributed,
      marketChange: point.marketGain - prev.marketGain,
    };
  });
}
