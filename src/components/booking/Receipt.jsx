import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, MapPinned } from "lucide-react";
import QRCode from "qrcode";

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawReceiptToCanvas(booking) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1040;
  const ctx = canvas.getContext("2d");
  const pad = 40;

  ctx.fillStyle = "#eef5ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);

  const headerHeight = 150;
  const gradient = ctx.createLinearGradient(pad, pad, canvas.width - pad, pad + headerHeight);
  gradient.addColorStop(0, "#3b82f6");
  gradient.addColorStop(1, "#60a5fa");
  ctx.fillStyle = gradient;
  ctx.fillRect(pad, pad, canvas.width - pad * 2, headerHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("Let's Goo Transit", pad + 30, pad + 55);
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(
    booking.isPrimary ? "Primary Passenger Ticket" : "Passenger Ticket",
    pad + 30,
    pad + 85
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(String(booking.seatNumber), canvas.width - pad - 30, pad + 60);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(booking.gender, canvas.width - pad - 30, pad + 85);
  ctx.textAlign = "left";

  const rows = [
    ["Passenger", booking.passengerName],
    ...(booking.cnic ? [["CNIC", booking.cnic]] : []),
    ["Phone", booking.phone],
    ["Bus", booking.bus?.busNo || "—"],
    ["Company", booking.company?.name || "—"],
    ["Route", `${booking.fromCity} -> ${booking.toCity}`],
    ["Travel Date", formatDate(booking.travelDate)],
    ["Fare", `Rs ${booking.fare}`],
    ...(booking.serviceFee ? [["Service Fee", `Rs ${booking.serviceFee}`]] : []),
  ];

  let y = pad + headerHeight + 50;
  rows.forEach(([label, value]) => {
    ctx.fillStyle = "#6b7280";
    ctx.font = "16px sans-serif";
    ctx.fillText(label, pad + 30, y);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(String(value), pad + 260, y);
    y += 42;
  });

  y += 15;
  ctx.strokeStyle = "#d1d9e6";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(pad + 20, y);
  ctx.lineTo(canvas.width - pad - 20, y);
  ctx.stroke();
  ctx.setLineDash([]);

  try {
    const qrDataUrl = await QRCode.toDataURL(String(booking._id), {
      margin: 1,
      width: 220,
      color: { dark: "#111827", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, (canvas.width - 220) / 2, y + 30, 220, 220);
    y += 270;
  } catch {
    y += 30;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Payment Confirmed", canvas.width / 2, y + 20);
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px monospace";
  ctx.fillText(String(booking._id).slice(-12).toUpperCase(), canvas.width / 2, y + 45);
  ctx.textAlign = "left";

  return canvas;
}

export async function saveReceiptAsImage(booking) {
  const canvas = await drawReceiptToCanvas(booking);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-${booking.seatNumber}-${booking._id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-content-muted">{label}</span>
      <span
        className={`truncate text-[13px] font-semibold text-content ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Perforation() {
  return (
    <div className="relative flex items-center px-4" aria-hidden="true">
      <span className="absolute -left-2.5 h-5 w-5 rounded-full bg-bg" />
      <span className="h-px w-full border-t border-dashed border-line" />
      <span className="absolute -right-2.5 h-5 w-5 rounded-full bg-bg" />
    </div>
  );
}

function Receipt({ booking }) {
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!booking?._id) return;
    let cancelled = false;

    QRCode.toDataURL(String(booking._id), { margin: 1, width: 200 })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [booking?._id]);

  if (!booking) return null;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-line bg-surface shadow-glass backdrop-blur-2xl">
      <div
        className="p-5 text-white"
        style={{
          background: "linear-gradient(120deg, var(--accent) 0%, var(--secondary) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">Let&apos;s Goo Transit</p>
            <p className="mt-1 truncate text-[11px] text-white/80">
              {booking.isPrimary ? "Primary Passenger" : "Passenger"} Ticket
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-black leading-none">
              {booking.seatNumber}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
              {booking.gender}
            </p>
          </div>
        </div>
      </div>

      <Perforation />

      <div className="space-y-2.5 p-5">
        <Row label="Passenger" value={booking.passengerName} />
        {booking.cnic && <Row label="CNIC" value={booking.cnic} mono />}
        <Row label="Phone" value={booking.phone} />
        <Row label="Bus" value={booking.bus?.busNo || "—"} />
        <Row label="Company" value={booking.company?.name || "—"} />
        <Row label="Route" value={`${booking.fromCity} → ${booking.toCity}`} />
        <Row label="Travel date" value={formatDate(booking.travelDate)} />
        <Row label="Fare" value={`Rs ${booking.fare}`} />
        {booking.serviceFee > 0 && (
          <Row label="Service fee" value={`Rs ${booking.serviceFee}`} />
        )}
      </div>

      <Perforation />

      <div className="flex flex-col items-center gap-2 p-5">
        {qrUrl ? (
          <img
              loading="lazy"
              decoding="async"
            src={qrUrl}
            alt="Ticket QR code"
            className="h-32 w-32 rounded-lg border border-line"
          />
        ) : (
          <div className="h-32 w-32 animate-pulse rounded-lg bg-elevated" />
        )}
        <p className="font-mono text-[10px] text-content-muted">
          {String(booking._id).slice(-12).toUpperCase()}
        </p>
      </div>

      <div className="space-y-2 border-t border-line p-5">
        <button
          type="button"
          onClick={() => saveReceiptAsImage(booking)}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Save to Photos
        </button>
        {booking.bus?.busNo && (
          <button
            type="button"
            onClick={() =>
              navigate("/family-tracking", { state: { busNo: booking.bus.busNo } })
            }
            className="glass-surface flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full font-display text-[13px] font-bold text-accent transition-transform active:scale-[0.98]"
          >
            <MapPinned className="h-4 w-4" />
            Track This Bus Live
          </button>
        )}
      </div>
    </div>
  );
}

export default Receipt;
