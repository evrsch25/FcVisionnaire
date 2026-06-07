"use client";

import Image from "next/image";
import { useState } from "react";
import {
  badgeDisplayName,
  badgeImagePath,
  type BadgeTier,
  type BadgeType,
} from "@/lib/badges/definitions";

const TIER_RING: Record<BadgeTier, string> = {
  bronze: "ring-[#cd7f32]/60",
  silver: "ring-[#c0c0c0]/70",
  gold: "ring-[#ffd700]/80",
  legend: "ring-[#a855f7]/80",
};

const SIZES = {
  sm: { box: 32, img: 28 },
  md: { box: 44, img: 40 },
  lg: { box: 56, img: 52 },
} as const;

type Props = {
  type: BadgeType;
  tier: BadgeTier;
  size?: keyof typeof SIZES;
  showTooltip?: boolean;
};

export default function BadgeIcon({
  type,
  tier,
  size = "md",
  showTooltip = true,
}: Props) {
  const [broken, setBroken] = useState(false);
  const dim = SIZES[size];
  const label = badgeDisplayName(type, tier);
  const src = badgeImagePath(type, tier);

  return (
    <span
      className="relative inline-flex group"
      title={showTooltip ? label : undefined}
    >
      <span
        className={`inline-flex items-center justify-center rounded-xl bg-bg-elevated ring-2 ${TIER_RING[tier]} overflow-hidden`}
        style={{ width: dim.box, height: dim.box }}
      >
        {!broken ? (
          <Image
            src={src}
            alt={label}
            width={dim.img}
            height={dim.img}
            className="object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <span
            className="text-[9px] font-black uppercase text-center leading-tight px-0.5 text-text-muted"
            aria-label={label}
          >
            {tier.slice(0, 2)}
          </span>
        )}
      </span>
      {showTooltip && (
        <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-panel border border-border-subtle px-2 py-1 text-[10px] font-bold text-text-base opacity-0 group-hover:opacity-100 transition z-20">
          {label}
        </span>
      )}
    </span>
  );
}
