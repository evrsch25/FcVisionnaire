import BadgeIcon from "./BadgeIcon";
import {
  parseBadgeRow,
  type BadgeTier,
  type BadgeType,
} from "@/lib/badges/definitions";

export type BadgeRow = {
  badge_type?: string | null;
  tier?: string | null;
  badge_name?: string | null;
};

type Props = {
  badges: BadgeRow[] | null | undefined;
  size?: "sm" | "md" | "lg";
  emptyMessage?: string;
};

export default function BadgeList({
  badges,
  size = "md",
  emptyMessage = "Aucun badge",
}: Props) {
  const parsed = (badges ?? [])
    .map(parseBadgeRow)
    .filter((b): b is { type: BadgeType; tier: BadgeTier } => b !== null);

  if (parsed.length === 0) {
    return (
      <span className="text-text-muted text-sm italic">{emptyMessage}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {parsed.map((b, i) => (
        <BadgeIcon key={`${b.type}-${b.tier}-${i}`} type={b.type} tier={b.tier} size={size} />
      ))}
    </div>
  );
}
