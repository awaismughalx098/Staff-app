import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import jsQR from "jsqr";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Keyboard,
  QrCode,
  RefreshCw,
  XCircle,
} from "lucide-react";

import AdminLayout from "../../components/admin/AdminLayout";
import { scanEventTicket } from "../../services/eventService";

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

function EventScan() {
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const scanningRef = useRef(false);

  const [cameraError, setCameraError] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const submitCode = useCallback(
    async (code) => {
      stopCamera();
      setChecking(true);
      try {
        const res = await scanEventTicket(code);
        setResult({ ok: true, message: res.message, ticket: res.data });
      } catch (err) {
        const data = err?.response?.data;
        setResult({
          ok: false,
          message: data?.message || "Couldn't verify this ticket",
          ticket: data?.data || null,
          alreadyUsed: data?.alreadyUsed,
        });
      } finally {
        setChecking(false);
      }
    },
    [stopCamera]
  );

  /* Plain function so its own recursive requestAnimationFrame call can
     reference it by name — same shape as the driver's scanner. */
  function scanLoop() {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code?.data) {
        submitCode(code.data.trim());
        return;
      }
    }

    frameRef.current = requestAnimationFrame(scanLoop);
  }

  const startCamera = useCallback(async () => {
    setCameraError("");
    setResult(null);
    setShowManual(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      frameRef.current = requestAnimationFrame(scanLoop);
    } catch {
      setCameraError("Camera access is required to scan ticket QR codes.");
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [submitCode]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    submitCode(code);
    setManualCode("");
  };

  const idle = !result && !checking;

  return (
    <AdminLayout
      requireEventAdmin
      title="Scan Tickets"
      subtitle="Check attendees in at the gate"
    >
      <div className="mx-auto w-full max-w-md">
        {idle && (
          <>
            <div className="glass-surface overflow-hidden rounded-card shadow-glass">
              {cameraError ? (
                <div className="p-8 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-danger" />
                  <p className="mt-3 text-sm font-bold text-content">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-white"
                  >
                    <Camera className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              ) : (
                <div className="relative aspect-square w-full bg-black">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-accent/70" />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-accent"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="glass-surface mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[13px] font-bold text-accent transition-transform active:scale-[0.98]"
            >
              <Keyboard className="h-4 w-4" />
              Enter code manually
            </button>

            {showManual && (
              <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="EVT-XXXXXXXX"
                  aria-label="Ticket code"
                  className="glass-surface h-11 min-w-0 flex-1 rounded-full px-4 font-mono text-[13px] uppercase text-content outline-none placeholder:text-content-muted"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 cursor-pointer rounded-full bg-accent px-5 text-[13px] font-bold text-white"
                >
                  Check
                </button>
              </form>
            )}
          </>
        )}

        {checking && (
          <div className="glass-surface flex items-center justify-center gap-2 rounded-card p-10 text-content-muted shadow-glass">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-bold">Checking ticket...</span>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-surface overflow-hidden rounded-card shadow-glass"
          >
            <div
              className="flex flex-col items-center p-6 text-white"
              style={{
                background: result.ok
                  ? "linear-gradient(120deg, #16a34a 0%, #4ade80 100%)"
                  : result.alreadyUsed
                  ? "linear-gradient(120deg, #d97706 0%, #fbbf24 100%)"
                  : "linear-gradient(120deg, #dc2626 0%, #f87171 100%)",
              }}
            >
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {result.ok ? (
                  <CheckCircle2 className="h-14 w-14" />
                ) : (
                  <XCircle className="h-14 w-14" />
                )}
              </motion.span>
              <p className="mt-3 font-display text-xl font-black">
                {result.message}
              </p>
              {result.ticket?.attendeeName && (
                <p className="mt-1 text-[12.5px] text-white/85">
                  {result.ticket.attendeeName} · {result.ticket.quantity} ticket
                  {result.ticket.quantity === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {result.ticket && (
              <div className="space-y-2.5 p-5">
                <Row label="Ticket code" value={result.ticket.ticketCode} mono />
                <Row label="Attendee" value={result.ticket.attendeeName} />
                <Row label="Phone" value={result.ticket.phone} />
                <Row
                  label="Tickets"
                  value={String(result.ticket.quantity)}
                />
                <Row label="Paid" value={`Rs ${result.ticket.totalAmount}`} />
                {result.ticket.event?.eventDate && (
                  <Row
                    label="Event date"
                    value={formatDate(result.ticket.event.eventDate)}
                  />
                )}
                {result.ticket.checkedInAt && (
                  <Row
                    label="Checked in"
                    value={new Date(result.ticket.checkedInAt).toLocaleString(
                      [],
                      {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  />
                )}
              </div>
            )}

            <div className="border-t border-line p-5">
              <button
                type="button"
                onClick={startCamera}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                <QrCode className="h-4 w-4" />
                Scan another
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}

export default EventScan;
