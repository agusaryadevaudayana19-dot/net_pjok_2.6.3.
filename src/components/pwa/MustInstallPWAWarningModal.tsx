import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { User } from '../../types';

interface MustInstallPWAWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  onBypassOrInstalled: () => void;
}

export const MustInstallPWAWarningModal: React.FC<MustInstallPWAWarningModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onBypassOrInstalled,
}) => {
  const { isInstallable, isIOS, isAndroid, install, confirmInstalled } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        confirmInstalled();
        onBypassOrInstalled();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleConfirmInstalled = () => {
    confirmInstalled();
    onBypassOrInstalled();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 my-8">
        {/* Close / Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
              Wajib Instal Aplikasi
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              Instal Aplikasi PJOK di Layar Utama HP
            </h3>
          </div>
        </div>

        {/* Student Notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed space-y-1">
          <p className="font-bold text-amber-300">
            {targetUser?.name ? `Halo, ${targetUser.name}!` : 'Perhatian untuk Siswa!'}
          </p>
          <p>
            Sesuai ketentuan pembelajaran PJOK, <strong>murid tidak dapat login</strong> melalui browser biasa sebelum menginstal aplikasi ke layar utama HP Android atau iPhone/iPad.
          </p>
        </div>

        {/* Device Selection Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📱 HP Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🍏 iPhone / iPad (iOS)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'android' ? (
            <div className="space-y-3">
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Memproses Pemasangan...' : 'Klik Di Sini Untuk Instal Otomatis'}</span>
                </button>
              )}

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
                <p className="font-bold text-slate-300">Cara Instal Manual di Google Chrome Android:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-300">
                    Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Google Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-300">
                    Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-300">
                    Tekan <strong>"Instal"</strong>. Ikon LMS PJOK akan otomatis muncul di layar utama smartphone Anda.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
              <p className="font-bold text-slate-300">Cara Instal di iPhone / iPad (Safari):</p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-slate-300">
                  Buka link ini di browser <strong>Safari</strong>, lalu ketuk tombol <strong>Bagikan / Share</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" />) di bilah bawah layar.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-slate-300">
                  Geser ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-slate-300">
                  Ketuk <strong>"Tambah" (Add)</strong> di pojok kanan atas. Buka aplikasi LMS PJOK langsung dari ikon layar depan.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Verification and Action Buttons */}
        <div className="mt-5 space-y-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleConfirmInstalled}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Saya Sudah Menginstal di Layar Utama HP (Lanjutkan Masuk)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Kembali ke Halaman Login
          </button>
        </div>

        {/* Desktop Browser Bypass for Testing */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleConfirmInstalled}
            className="text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
          >
            Mode Komputer / Pengujian Browser (Bypass Instalasi)
          </button>
        </div>
      </div>
    </div>
  );
};
