import { StarIcon } from "@/components/icons";

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[2px] text-gold" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          half={value >= i - 0.75 && value < i}
          className={value >= i || (value >= i - 0.75 && value < i) ? "" : "opacity-25"}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
