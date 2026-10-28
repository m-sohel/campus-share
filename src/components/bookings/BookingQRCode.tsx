"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingQRCodeProps {
  bookingId: string;
  resourceName: string;
  checkInUrl?: string;
}

export function BookingQRCode({ bookingId, resourceName, checkInUrl }: BookingQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Generate target check-in URL
  const targetUrl =
    checkInUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/bookings/${bookingId}/check-in`
      : `/bookings/${bookingId}/check-in`);

  useEffect(() => {
    let isMounted = true;

    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1e1b4b", // deep indigo
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
          <QrCode className="w-4 h-4 text-indigo-600" />
          <span>Handover Digital Pass</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3 h-3" /> Approved
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`Check-in QR code for ${resourceName}`}
              className="w-36 h-36 rounded-lg"
            />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs animate-pulse">
              Generating pass...
            </div>
          )}
        </div>

        <div className="space-y-2.5 text-center sm:text-left">
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              Scan at Facility Desk
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Show this QR code to the station technician or lab manager at <strong>{resourceName}</strong> to perform the Step 7 physical check-in inspection.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Link Copied" : "Copy Direct Link"}
            </Button>

            <a href={`/bookings/${bookingId}/check-in`}>
              <Button size="sm" className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Check-in
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-500 font-mono break-all border border-slate-200">
        <span className="font-semibold text-slate-700">Direct Pass Target:</span> {targetUrl}
      </div>
    </div>
  );
}
