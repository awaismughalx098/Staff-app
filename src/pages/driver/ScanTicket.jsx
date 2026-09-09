import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import {
  AlertCircle,
  ArrowLeft,
  BusFront,
  Camera,
  QrCode,
  RefreshCw,
} from "lucide-react";

import { verifyTicket } from "../../services/bookingService";

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
      <span className="text-sm text-content-muted">{label}</span>
      <span
        className={`truncate text-base font-semibold text-content ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ScanTicket() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const scanningRef = useRef(false);

  const [cameraError, setCameraError] = useState("");
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [ticketError, setTicketError] = useState("");

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleDecoded = useCallback(async (bookingId) => {
    stopCamera();
    setLoadingTicket(true);
    setTicketError("");
    try {
      const res = await verifyTicket(bookingId);
      setTicket(res?.data || null);
    } catch (err) {
      setTicketError(err?.response?.data?.message || "Couldn't load this ticket");
    } finally {
      setLoadingTicket(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plain function (not useCallback) — deliberately, so its own recursive
  // requestAnimationFrame call can reference it by name without a lint
  // complaint about self-referencing inside a hook's own initializer.
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
        handleDecoded(code.data.trim());
        return;
      }
    }

    frameRef.current = requestAnimationFrame(scanLoop);
  }

  const startCamera = useCallback(async () => {
    setCameraError("");
    setTicket(null);
    setTicketError("");
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
      setCameraError("Camera access is required to scan a ticket QR code.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDecoded]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanAnother = () => {
    startCamera();
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/driver")}
          className="glass-surface mb-5 flex h-11 items-center gap-2 rounded-input px-4 text-sm font-bold text-content transition-colors duration-300 ease-in-out hover:bg-white/60"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="glass-surface rounded-card p-5 text-content shadow-glass">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent">
            <QrCode className="h-4 w-4" />
            Scan Ticket
          </p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight">
            Verify a passenger
          </h1>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Point the camera at the QR code on the passenger&apos;s ticket.
          </p>
        </div>

        {!ticket && !loadingTicket && !ticketError && (
          <div className="glass-surface mt-5 overflow-hidden rounded-card">
            {cameraError ? (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-danger" />
                <p className="mt-3 text-sm font-bold text-content">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-input bg-accent text-sm font-bold text-white"
                >
                  <Camera className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : (
              <div className="relative aspect-square w-full bg-black">
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-accent/70" />
              </div>
            )}
          </div>
        )}

        {loadingTicket && (
          <div className="glass-surface mt-5 flex items-center justify-center gap-2 rounded-card p-8 text-content-muted">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-bold">Verifying ticket...</span>
          </div>
        )}

        {ticketError && (
          <div className="glass-surface mt-5 rounded-card p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-danger" />
            <p className="mt-3 text-sm font-bold text-content">{ticketError}</p>
            <button
              type="button"
              onClick={scanAnother}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-input bg-accent text-sm font-bold text-white"
            >
              <QrCode className="h-4 w-4" />
              Scan another
            </button>
          </div>
        )}

        {ticket && (
          <div className="glass-surface mt-5 overflow-hidden rounded-card shadow-glass">
            <div
              className="p-5 text-white"
              style={{
                background:
                  "linear-gradient(120deg, var(--accent) 0%, var(--secondary) 60%, var(--route-blue) 100%)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-display text-lg font-bold">
                    <BusFront className="h-5 w-5" />
                    {ticket.bus?.busNo || "Bus"}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/80">
                    {ticket.isPrimary ? "Primary Passenger" : "Passenger"} Ticket
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl font-black leading-none">
                    {ticket.seatNumber}
                  </p>
                  <p className="mt-1 text-2xs font-bold uppercase tracking-wide text-white/80">
                    {ticket.gender}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              <Row label="Status" value={ticket.status} />
              <Row label="Passenger" value={ticket.passengerName} />
              {ticket.cnic && <Row label="CNIC" value={ticket.cnic} mono />}
              <Row label="Phone" value={ticket.phone} />
              <Row label="Company" value={ticket.company?.name || "—"} />
              <Row label="Route" value={`${ticket.fromCity} → ${ticket.toCity}`} />
              <Row label="Travel date" value={formatDate(ticket.travelDate)} />
              <Row label="Fare" value={`Rs ${ticket.fare}`} />
              <Row label="Booking ref" value={ticket._id} mono />
            </div>

            <div className="border-t border-line p-5">
              <button
                type="button"
                onClick={scanAnother}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-display text-base font-bold text-white transition-transform active:scale-[0.98]"
              >
                <QrCode className="h-4 w-4" />
                Scan another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default ScanTicket;
