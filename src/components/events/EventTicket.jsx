import { useEffect, useState } from "react";
import { CheckCircle2, Download, XCircle } from "lucide-react";
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

/* Mirrors the bus Receipt canvas so a saved event ticket looks like it came
   from the same app — the QR encodes the ticketCode the gate scanner reads. */
async function drawTicketToCanvas(ticket) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  const pad = 40;

  ctx.fillStyle = "#eef5ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);

  const headerHeight = 150;
  const gradient = ctx.createLinearGradient(
    pad,
    pad,
    canvas.width - pad,
    pad + headerHeight
  );
  gradient.addColorStop(0, "#3b82f6");
  gradient.addColorStop(1, "#60a5fa");
  ctx.fillStyle = gradient;
  ctx.fillRect(pad, pad, canvas.width - pad * 2, headerHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("Let's Goo Events", pad + 30, pad + 55);
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("Entry Ticket", pad + 30, pad + 85);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`x${ticket.quantity}`, canvas.width - pad - 30, pad + 60);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(
    ticket.quantity === 1 ? "ticket" : "tickets",
    canvas.width - pad - 30,
    pad + 85
  );
  ctx.textAlign = "left";

  const rows = [
    ["Event", ticket.event?.title || "—"],
    ["Venue", ticket.event?.venue || "—"],
    ["City", ticket.event?.city || "—"],
    ["Date", ticket.event?.eventDate ? formatDate(ticket.event.eventDate) : "—"],
    ...(ticket.event?.startTime ? [["Starts", ticket.event.startTime]] : []),
    ["Attendee", ticket.attendeeName],
    ["Phone", ticket.phone],
    ["Tickets", String(ticket.quantity)],
    ["Paid", `Rs ${ticket.totalAmount}`],
  ];

  let y = pad + headerHeight + 50;
  rows.forEach(([label, value]) => {
    ctx.fillStyle = "#6b7280";
    ctx.font = "16px sans-serif";
    ctx.fillText(label, pad + 30, y);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(String(value), pad + 260, y);
    y += 40;
  });

  y += 10;
  ctx.strokeStyle = "#d1d9e6";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(pad + 20, y);
  ctx.lineTo(canvas.width - pad - 20, y);
  ctx.stroke();
  ctx.setLineDash([]);

  try {
    const qrDataUrl = await QRCode.toDataURL(ticket.ticketCode, {
      margin: 1,
      width: 220,
      color: { dark: "#111827", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, (canvas.width - 220) / 2, y + 25, 220, 220);
    y += 260;
  } catch {
    y += 30;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px monospace";
  ctx.fillText(ticket.ticketCode, canvas.width / 2, y + 20);
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px sans-serif";
  ctx.fillText("Show this QR at the gate", canvas.width / 2, y + 45);
  ctx.textAlign = "left";

  return canvas;
}

export async function saveEventTicketAsImage(ticket) {
  const canvas = await drawTicketToCanvas(ticket);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `event-ticket-${ticket.ticketCode}.png`;
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

function EventTicket({ ticket }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!ticket?.ticketCode) return;
    let cancelled = false;

    QRCode.toDataURL(ticket.ticketCode, { margin: 1, width: 200 })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [ticket?.ticketCode]);

  if (!ticket) return null;

  const cancelled = ticket.status === "Cancelled";
  const used = ticket.checkedIn;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-line bg-surface shadow-glass backdrop-blur-2xl">
      <div
        className="p-5 text-white"
        style={{
          background: cancelled
            ? "linear-gradient(120deg, #94a3b8 0%, #cbd5e1 100%)"
            : "linear-gradient(120deg, var(--accent) 0%, var(--secondary) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">
              {ticket.event?.title || "Event"}
            </p>
            <p className="mt-1 truncate text-[11px] text-white/80">
              {ticket.event?.venue}
              {ticket.event?.city ? `, ${ticket.event.city}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-black leading-none">
              x{ticket.quantity}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
              {ticket.quantity === 1 ? "ticket" : "tickets"}
            </p>
          </div>
        </div>
      </div>

      <Perforation />

      <div className="space-y-2.5 p-5">
        <Row label="Attendee" value={ticket.attendeeName} />
        <Row label="Phone" value={ticket.phone} />
        {ticket.event?.eventDate && (
          <Row label="Date" value={formatDate(ticket.event.eventDate)} />
        )}
        {ticket.event?.startTime && (
          <Row label="Starts" value={ticket.event.startTime} />
        )}
        <Row label="Paid" value={`Rs ${ticket.totalAmount}`} />
      </div>

      <Perforation />

      <div className="flex flex-col items-center gap-2 p-5">
        {cancelled || used ? (
          <div className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-elevated text-center">
            {cancelled ? (
              <XCircle className="h-8 w-8 text-danger" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-success" />
            )}
            <span className="px-2 text-[11px] font-bold text-content-muted">
              {cancelled ? "Cancelled" : "Already used"}
            </span>
          </div>
        ) : qrUrl ? (
          <img
              loading="lazy"
              decoding="async"
            src={qrUrl}
            alt="Event ticket QR code"
            className="h-32 w-32 rounded-lg border border-line"
          />
        ) : (
          <div className="h-32 w-32 animate-pulse rounded-lg bg-elevated" />
        )}
        <p className="font-mono text-[11px] font-bold text-content">
          {ticket.ticketCode}
        </p>
        {!cancelled && !used && (
          <p className="text-[10.5px] text-content-muted">
            Show this at the gate
          </p>
        )}
      </div>

      {!cancelled && (
        <div className="border-t border-line p-5">
          <button
            type="button"
            onClick={() => saveEventTicketAsImage(ticket)}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Save to Photos
          </button>
        </div>
      )}
    </div>
  );
}

export default EventTicket;
