import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Order QR code. Encodes an absolute tracking URL that carries the order id, so
 * scanning it from a printed invoice opens that order's tracking page.
 */
export function OrderQr({ orderId, size = 116 }: { orderId: string; size?: number }) {
  const [src, setSrc] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/track-order?order=${encodeURIComponent(orderId)}`;
    setValue(url);
    let alive = true;
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1C1A18", light: "#FFFFFF" },
    })
      .then((data) => {
        if (alive) setSrc(data);
      })
      .catch(() => {
        if (alive) setSrc("");
      });
    return () => {
      alive = false;
    };
  }, [orderId, size]);

  return (
    <figure className="w-fit">
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          alt={`QR code for order ${orderId}. Scan to open tracking at ${value}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="grid place-items-center border border-border text-[10px] text-muted-foreground"
          style={{ width: size, height: size }}
        >
          QR
        </div>
      )}
      <figcaption className="mt-1.5 max-w-[140px] text-[10px] leading-snug text-muted-foreground">
        Scan to track order {orderId}
      </figcaption>
    </figure>
  );
}
