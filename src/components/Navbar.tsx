import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  BookOpen,
  Award,
  Sparkles,
  Users,
  UserCheck,
  Cloud,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  CloudOff,
  AlertTriangle,
  Clock,
  UploadCloud,
  DownloadCloud,
  X,
  Megaphone,
  ClipboardList,
  CheckCircle,
  CalendarCheck,
} from 'lucide-react';
import { User, UserRole, PengaturanSekolah, resolveKelasId, APP_VERSION_LABEL } from '../types';
import { dataStorage, LMSDatabase, FirestoreSyncStatus } from '../services/dataStorage';
import { getStudentUrgentDeadlines } from '../utils/deadlineNotification';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface NavbarProps {
  currentUser: User;
  onOpenSidebar?: () => void;
  onToggleSidebar?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenProfileModal?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onSelectMenuItem?: (menuId: string, param?: string) => void;
  settings?: PengaturanSekolah;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSidebar,
  onToggleSidebar,
  onOpenLoginModal,
  onLogout,
  onOpenProfileModal,
  onSwitchRole,
  onSelectMenuItem,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FirestoreSyncStatus>(dataStorage.getSyncStatus());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(dataStorage.getLastSyncTime());
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLDivElement>(null);

  const [db, setDb] = useState<LMSDatabase>(dataStorage.getDatabase());

  useEffect(() => {
    return dataStorage.subscribe((updatedDb) => {
      setDb(updatedDb);
    });
  }, []);

  // Compute urgent deadlines (< 24 hours) for student
  const urgentDeadlines = useMemo(() => {
    if (currentUser.role !== 'MURID') return [];
    return getStudentUrgentDeadlines(db, currentUser);
  }, [db, currentUser]);

  // Filter notifications relevant to current user
  const userNotifikasi = useMemo(() => {
    const list = db.notifikasi || [];
    if (currentUser.role === 'MURID') {
      const myKelasId = currentUser.kelasId || '';
      return list.filter((n) => {
        if (n.targetRole && n.targetRole !== 'MURID' && n.targetRole !== 'ALL') return false;
        if (n.targetMuridId && n.targetMuridId !== currentUser.id) return false;
        if (n.targetKelasId && n.targetKelasId !== 'ALL' && myKelasId && n.targetKelasId !== myKelasId) {
          return false;
        }
        return true;
      });
    }
    return list;
  }, [db.notifikasi, currentUser]);

  const unreadCount =
    userNotifikasi.filter((n) => !n.dibaca).length + (urgentDeadlines.length > 0 ? 1 : 0);

  useEffect(() => {
    return dataStorage.onSyncStatusChange((status, lastSync) => {
      setSyncStatus(status);
      if (lastSync) setLastSyncTime(lastSync);
    });
  }, []);

  const handleSidebarClick = () => {
    if (onOpenSidebar) onOpenSidebar();
    else if (onToggleSidebar) onToggleSidebar();
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (syncRef.current && !syncRef.current.contains(e.target as Node)) {
        setShowSyncDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkNotifRead = (id: string) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      notifikasi: (prev.notifikasi || []).map((n) => (n.id === id ? { ...n, dibaca: true } : n)),
    }));
  };

  const handleNotificationClick = (item: any) => {
    handleMarkNotifRead(item.id);
    setShowNotifMenu(false);
    if (!onSelectMenuItem) return;

    const isMurid = currentUser.role === 'MURID';
    const isGuru = currentUser.role === 'GURU';
    const isAdmin = currentUser.role === 'ADMIN';
    const tipe = (item.tipe || '').toLowerCase().trim();
    const judul = (item.judul || '').toLowerCase();
    const pesan = (item.pesan || '').toLowerCase();
    const targetId = item.targetId;

    // 1. Explicit Tipe Routing
    if (tipe === 'pengumuman' || tipe === 'informasi') {
      onSelectMenuItem('pengumuman', targetId);
      return;
    }

    if (tipe === 'tugas') {
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    if (tipe === 'quiz' || tipe === 'kuis' || tipe === 'asesmen') {
      onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
      return;
    }

    if (tipe === 'materi' || tipe === 'modul') {
      onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
      return;
    }

    if (tipe === 'presensi' || tipe === 'kehadiran' || tipe === 'absensi') {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'presensi', targetId);
      return;
    }

    if (tipe === 'izin' || tipe === 'surat-izin' || tipe === 'pengajuan-izin') {
      onSelectMenuItem(isMurid ? 'presensi-saya' : (isGuru || isAdmin ? 'surat-izin' : 'presensi'), targetId);
      return;
    }

    if (tipe === 'nilai' || tipe === 'rapor') {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'nilai', targetId);
      return;
    }

    if (tipe === 'sikap' || tipe === 'penilaian-sikap') {
      onSelectMenuItem(isMurid ? 'sikap-saya' : 'penilaian-sikap', targetId);
      return;
    }

    if (tipe === 'penilaian-teman' || tipe === 'teman-sejawat') {
      onSelectMenuItem(isMurid ? 'penilaian-teman-saya' : 'penilaian-teman', targetId);
      return;
    }

    if (tipe === 'refleksi') {
      onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
      return;
    }

    if (tipe === 'praktik' || tipe === 'penilaian-praktik') {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'praktik', targetId);
      return;
    }

    if (tipe === 'deadline') {
      if (targetId && db.quiz?.some((q) => q.id === targetId)) {
        onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
        return;
      }
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    // 2. Target ID entity matching
    if (targetId) {
      if (db.pengumuman?.some((p) => p.id === targetId)) {
        onSelectMenuItem('pengumuman', targetId);
        return;
      }
      if (db.tugas?.some((t) => t.id === targetId)) {
        onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
        return;
      }
      if (db.quiz?.some((q) => q.id === targetId)) {
        onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
        return;
      }
      if (db.materi?.some((m) => m.id === targetId)) {
        onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
        return;
      }
      if (db.refleksi?.some((r) => r.id === targetId)) {
        onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
        return;
      }
    }

    // 3. Keyword heuristic on Judul & Pesan
    if (judul.includes('pengumuman') || pesan.includes('pengumuman') || judul.includes('informasi')) {
      onSelectMenuItem('pengumuman', targetId);
      return;
    }

    if (judul.includes('tugas') || pesan.includes('tugas')) {
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    if (judul.includes('quiz') || judul.includes('kuis') || pesan.includes('quiz') || pesan.includes('kuis')) {
      onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
      return;
    }

    if (judul.includes('materi') || pesan.includes('materi') || judul.includes('modul')) {
      onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
      return;
    }

    if (judul.includes('absen') || judul.includes('presensi') || judul.includes('kehadiran') || pesan.includes('presensi')) {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'presensi', targetId);
      return;
    }

    if (judul.includes('izin') || pesan.includes('izin')) {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'surat-izin', targetId);
      return;
    }

    if (judul.includes('nilai') || pesan.includes('nilai') || judul.includes('rapor')) {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'nilai', targetId);
      return;
    }

    if (judul.includes('sikap') || pesan.includes('sikap')) {
      onSelectMenuItem(isMurid ? 'sikap-saya' : 'penilaian-sikap', targetId);
      return;
    }

    if (judul.includes('teman') || pesan.includes('teman sejawat')) {
      onSelectMenuItem(isMurid ? 'penilaian-teman-saya' : 'penilaian-teman', targetId);
      return;
    }

    if (judul.includes('refleksi') || pesan.includes('refleksi')) {
      onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
      return;
    }

    // Default Fallback
    onSelectMenuItem(isMurid ? 'pengumuman' : 'dashboard', targetId);
  };

  // Search filtering
  const query = searchQuery.trim().toLowerCase();
  const filteredMateri = query
    ? db.materi.filter(
        (m) =>
          m.judul.toLowerCase().includes(query) ||
          m.kategori.toLowerCase().includes(query) ||
          m.deskripsi.toLowerCase().includes(query)
      )
    : [];
  const filteredTugas = query
    ? db.tugas.filter((t) => t.judul.toLowerCase().includes(query) || t.instruksi.toLowerCase().includes(query))
    : [];
  const filteredQuiz = query ? db.quiz.filter((q) => q.judul.toLowerCase().includes(query)) : [];
  const filteredMurid = query
    ? db.users.filter(
        (u) =>
          u.role === 'MURID' &&
          (u.name.toLowerCase().includes(query) || (u.nis && u.nis.includes(query)))
      )
    : [];
  const filteredGuru = query
    ? db.users.filter((u) => u.role === 'GURU' && u.name.toLowerCase().includes(query))
    : [];

  const hasResults =
    filteredMateri.length > 0 ||
    filteredTugas.length > 0 ||
    filteredQuiz.length > 0 ||
    filteredMurid.length > 0 ||
    filteredGuru.length > 0;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator Utama';
      case 'GURU':
        return 'Guru Pengampu PJOK';
      case 'MURID': {
        const dbData = dataStorage.getDatabase();
        const kName = currentUser.kelasId ? resolveKelasId(currentUser.kelasId, dbData.kelas || []).nama : '';
        return kName ? `Siswa Kelas ${kName}` : 'Murid PJOK';
      }
      default:
        return 'Pengguna';
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'PJ';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.trim().slice(0, 2) || 'PJ').toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={handleSidebarClick}
          id="btn-sidebar-toggle"
          aria-label="Buka Menu Sidebar"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-colors focus:outline-hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Header Brand & Name */}
        <div className="lg:hidden flex items-center gap-2 mr-1 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white overflow-hidden shadow-xs shrink-0">
            {db.settings?.logoSekolah ? (
              <img src={db.settings.logoSekolah} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-xs">PJ</span>
            )}
          </div>
          <div className="leading-tight max-w-[100px] sm:max-w-[130px] truncate">
            <span className="font-black text-[11px] text-slate-800 block leading-none">NET PJOK</span>
            <span className="text-[10px] text-emerald-600 font-bold block truncate leading-none mt-0.5" title={currentUser.name}>
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Mobile Search Toggle Button (Screen < sm) */}
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="sm:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg shrink-0 cursor-pointer"
          title="Cari"
          aria-label="Cari"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Search Bar - Responsive Pill Style (Hidden on small mobile unless toggled) */}
        <div
          ref={searchRef}
          className={`${
            isMobileSearchOpen
              ? 'absolute left-2 right-2 top-2 z-50 bg-white p-2 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-2'
              : 'hidden sm:block relative w-48 sm:w-64 md:w-80 lg:w-96'
          }`}
        >
          <div className="flex items-center bg-gray-100 rounded-full px-3.5 py-1.5 w-full border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              id="input-global-search"
              placeholder="Cari guru, murid, materi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none text-xs sm:text-sm focus:outline-none w-full text-gray-700 placeholder-gray-400"
            />
          </div>

          {isMobileSearchOpen && (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg shrink-0"
              aria-label="Tutup pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Dropdown Results */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50 max-h-80 overflow-y-auto space-y-2 text-xs">
              {!hasResults ? (
                <div className="p-4 text-center text-slate-400">
                  Tidak ditemukan hasil untuk "{searchQuery}"
                </div>
              ) : (
                <>
                  {filteredMateri.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Materi Pembelajaran
                      </div>
                      {filteredMateri.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectMenuItem) {
                              onSelectMenuItem(currentUser.role === 'MURID' ? 'materi-saya' : 'materi', m.id);
                            }
                          }}
                          className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
                        >
                          <span className="font-medium truncate">{m.judul}</span>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                            {m.kategori}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredTugas.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
                        Tugas PJOK
                      </div>
                      {filteredTugas.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectMenuItem) {
                              onSelectMenuItem(currentUser.role === 'MURID' ? 'tugas-saya' : 'tugas', t.id);
                            }
                          }}
                          className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
                        >
                          <span className="font-medium truncate">{t.judul}</span>
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                            Tugas
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredQuiz.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
                        Quiz
                      </div>
                      {filteredQuiz.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectMenuItem) {
                              onSelectMenuItem(currentUser.role === 'MURID' ? 'quiz-saya' : 'quiz', q.id);
                            }
                          }}
                          className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
                        >
                          <span className="font-medium truncate">{q.judul}</span>
                          <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                            Quiz
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredMurid.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
                        Siswa / Murid
                      </div>
                      {filteredMurid.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectMenuItem) {
                              onSelectMenuItem(currentUser.role === 'ADMIN' ? 'users' : 'data-murid', s.id);
                            }
                          }}
                          className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="text-[10px] text-slate-400">NIS: {s.nis}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Version Pill Badge - Visible across every menu */}
      <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 border border-slate-200/90 rounded-full text-[11px] font-extrabold text-blue-950 tracking-wider shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>{APP_VERSION_LABEL}</span>
      </div>

      {/* Right: Actions, Notifications, & User Info */}
      <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
        {/* Firestore Real-Time Sync Indicator */}
        <div ref={syncRef} className="relative">
          <button
            onClick={() => setShowSyncDetails(!showSyncDetails)}
            id="btn-firestore-sync-status"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs focus:outline-hidden ${
              syncStatus === 'synced'
                ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800'
                : syncStatus === 'syncing' || isManualSyncing
                ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-800'
                : syncStatus === 'connecting'
                ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-800'
                : 'border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-900'
            }`}
            title="Cloud Firestore Real-Time & Otomatis Sinkron Semua Perangkat (Standby / Offline)"
          >
            {syncStatus === 'synced' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline font-bold text-[11px]">Firestore Real-Time</span>
              </>
            ) : syncStatus === 'syncing' || isManualSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span className="hidden sm:inline font-semibold text-[11px]">Sinkronisasi...</span>
              </>
            ) : syncStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="hidden sm:inline font-semibold text-[11px]">Menghubungkan...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline font-bold text-[11px]">Standby / Offline</span>
              </>
            )}
          </button>

          {/* Sync Details Popover - Ringkas & Bersih Sesuai Instruksi (Tanpa teks penjelasan panjang) */}
          {showSyncDetails && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-4 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-700'
                      : syncStatus === 'syncing' || isManualSyncing
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {syncStatus === 'synced' ? (
                      <Cloud className="w-5 h-5" />
                    ) : syncStatus === 'syncing' || isManualSyncing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CloudOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">Cloud Firestore</h4>
                    <p className="text-[10px] text-slate-500">
                      Terakhir sinkron:{' '}
                      <span className="font-bold text-slate-700">
                        {lastSyncTime
                          ? lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : 'Baru saja'}
                      </span>
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase shrink-0 ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : syncStatus === 'syncing' || isManualSyncing
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : syncStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {syncStatus === 'synced'
                    ? '🟢 Real-Time'
                    : syncStatus === 'syncing' || isManualSyncing
                    ? '🔄 Menyinkron'
                    : syncStatus === 'connecting'
                    ? '🟡 Menghubungkan'
                    : '🟠 Standby'}
                </span>
              </div>

              {/* Feedback Notifikasi */}
              {syncFeedbackMsg && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncFeedbackMsg}</span>
                </div>
              )}

              {/* Dua Tombol Utama Sesuai Permintaan: Unggah ke Cloud & Tarik Data Terbaru */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-upload-to-cloud"
                  onClick={async () => {
                    setIsManualSyncing(true);
                    setSyncFeedbackMsg(null);
                    try {
                      await dataStorage.seedAllToFirestore();
                      setSyncFeedbackMsg('Data berhasil diunggah ke Cloud Firestore');
                      setTimeout(() => setSyncFeedbackMsg(null), 3500);
                    } catch (e: any) {
                      setSyncFeedbackMsg('Gagal mengunggah data');
                      setTimeout(() => setSyncFeedbackMsg(null), 3500);
                    } finally {
                      setIsManualSyncing(false);
                    }
                  }}
                  disabled={isManualSyncing}
                  className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer"
                >
                  <UploadCloud className={`w-4 h-4 ${isManualSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isManualSyncing ? 'Sedang Memproses...' : 'Unggah ke Cloud'}</span>
                </button>

                <button
                  type="button"
                  id="btn-pull-latest-data"
                  onClick={async () => {
                    setIsManualSyncing(true);
                    setSyncFeedbackMsg(null);
                    try {
                      await dataStorage.forceRefreshFromFirestore();
                      setSyncFeedbackMsg('Data terbaru berhasil ditarik dari Cloud');
                      setTimeout(() => setSyncFeedbackMsg(null), 3500);
                    } catch (e: any) {
                      setSyncFeedbackMsg('Gagal menarik data terbaru');
                      setTimeout(() => setSyncFeedbackMsg(null), 3500);
                    } finally {
                      setIsManualSyncing(false);
                    }
                  }}
                  disabled={isManualSyncing}
                  className="w-full py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs border border-slate-200 cursor-pointer"
                >
                  <DownloadCloud className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'Sedang Menarik Data...' : 'Tarik Data Terbaru'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton variant="compact" />

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            id="btn-notifications"
            className="relative text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {urgentDeadlines.length > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[10px] items-center justify-center font-black">
                  {urgentDeadlines.length}
                </span>
              </span>
            ) : unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 text-xs overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-slate-50/70">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900">Notifikasi</span>
                  {urgentDeadlines.length > 0 && (
                    <span className="text-[10px] text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {urgentDeadlines.length} Urgent
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} Baru
                </span>
              </div>

              {/* Urgent Deadline Warnings (< 24 Jam) Section */}
              {urgentDeadlines.length > 0 && (
                <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-2.5 border-b border-rose-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Tenggat Kritis (&lt; 24 Jam)
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-full">
                      Peringatan Aktif
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {urgentDeadlines.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (onSelectMenuItem) {
                            onSelectMenuItem(item.tipe === 'tugas' ? 'tugas-saya' : 'quiz-saya', item.targetId);
                          }
                        }}
                        className="p-2 bg-white/95 hover:bg-white border border-rose-200 rounded-xl cursor-pointer transition shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-black uppercase">
                              {item.tipe}
                            </span>
                            <p className="font-bold text-slate-900 text-[11px] truncate">
                              {item.judul}
                            </p>
                          </div>
                          <p className="text-[10px] text-rose-600 font-black flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-rose-500" /> Sisa {item.timeRemainingFormatted}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black shrink-0 transition cursor-pointer"
                        >
                          Kerjakan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Notifications List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {userNotifikasi && userNotifikasi.length > 0 ? (
                  userNotifikasi.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-2.5 ${
                        !item.dibaca ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.isUrgentDeadline ? (
                          <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : item.tipe === 'pengumuman' ? (
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Megaphone className="w-3.5 h-3.5" />
                          </div>
                        ) : item.tipe === 'tugas' ? (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ClipboardList className="w-3.5 h-3.5" />
                          </div>
                        ) : item.tipe === 'quiz' || item.tipe === 'kuis' ? (
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        ) : item.tipe === 'materi' ? (
                          <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                        ) : item.tipe === 'presensi' || item.tipe === 'izin' ? (
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-[11px] truncate">{item.judul}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{item.waktu}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.pesan}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">Belum ada notifikasi</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Widget - Professional Polish Style */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            id="btn-user-profile-menu"
            className="flex items-center space-x-3 border-l pl-3 sm:pl-5 border-gray-200 focus:outline-hidden text-left"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none text-slate-900 truncate max-w-[140px]">
                {currentUser.name}
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1">
                {getRoleLabel(currentUser.role)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-2xs flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(currentUser.name)}</span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2 text-xs divide-y divide-gray-100">
              <div className="px-3 py-2.5">
                <p className="font-bold text-slate-900 text-sm">{currentUser.name}</p>
                <p className="text-slate-500 text-[11px] truncate">{currentUser.email || currentUser.username}</p>
                <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenProfileModal) {
                      onOpenProfileModal();
                    } else if (onSelectMenuItem) {
                      onSelectMenuItem('profil-saya');
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-slate-800 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <span>Profil & Foto Saya</span>
                </button>
              </div>

              <div className="pt-1 space-y-0.5">
                {onOpenLoginModal && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenLoginModal();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 font-medium transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Masuk Akun Lain / Dialog Login</span>
                  </button>
                )}

                {(onLogout || onOpenLoginModal) && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else if (onOpenLoginModal) {
                        onOpenLoginModal();
                      }
                    }}
                    id="btn-navbar-logout"
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Sistem</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
