"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  QrCode, 
  Camera, 
  X, 
  Search, 
  ArrowRight, 
  Check, 
  AlertCircle,
  FileText
} from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setErrorMsg("");
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Камера не поддерживается в этом браузере.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);

      // Проверка BarcodeDetector
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "ean_13"],
        });

        const interval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              clearInterval(interval);
              stopCamera();
              handleScannedValue(rawVal);
            }
          } catch (e) {
            // Frame detection pass
          }
        }, 300);
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setErrorMsg("Не удалось открыть камеру: " + (err.message || "проверьте разрешения"));
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setManualCode("");
      setErrorMsg("");
    }
    return () => stopCamera();
  }, [isOpen]);

  const handleScannedValue = (val: string) => {
    onClose();
    // Проверяем, это URL (например, https://.../orders/3 или https://.../track/3)
    if (val.includes("/orders/")) {
      const match = val.match(/\/orders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        router.push(`/orders/${match[1]}`);
        return;
      }
    }
    if (val.includes("/track/")) {
      const match = val.match(/\/track\/([a-zA-Z0-9_-]+)/);
      if (match) {
        router.push(`/track/${match[1]}`);
        return;
      }
    }
    // Если это номер наряда, например ORD-101 или 101
    const cleaned = val.replace(/[^0-9]/g, "");
    if (cleaned) {
      router.push(`/orders/${cleaned}`);
    } else {
      router.push(`/orders?query=${encodeURIComponent(val)}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScannedValue(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Заголовок */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Сканер QR-кода наряда
              </h3>
              <p className="text-[11px] text-slate-500">
                Наведите камеру на печатный бланк наряда цеха
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Окно камеры */}
          <div className="relative aspect-square max-h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-teal-500/50">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Рамка прицела QR */}
            <div className="absolute inset-8 border-2 border-teal-400 rounded-xl pointer-events-none shadow-lg animate-pulse" />

            {!isScanning && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <Camera className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-300">
                  {errorMsg || "Камера отключена"}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold shadow"
                >
                  Включить камеру
                </button>
              </div>
            )}
          </div>

          {/* Ручной ввод номера наряда (для любого устройства) */}
          <div className="pt-2 border-t border-slate-100">
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Или введите номер наряда / ID вручную:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Например: ORD-101 или 3"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-teal-600 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0"
                >
                  <span>Открыть</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Альберт и Абзал могут быстро открывать заказы с бумажных бланков
        </div>
      </div>
    </div>
  );
}
