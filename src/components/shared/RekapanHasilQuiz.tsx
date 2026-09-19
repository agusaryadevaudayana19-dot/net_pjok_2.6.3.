import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle,
  Download,
  Printer,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  HelpCircle,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { User, Quiz, JawabanQuiz, getTeacherAssignedClasses } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface RekapanHasilQuizProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigateQuiz?: () => void;
}

export const RekapanHasilQuiz: React.FC<RekapanHasilQuizProps> = ({
  db,
  currentUser,
  onNavigateQuiz,
}) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [selectedQuizId, setSelectedQuizId] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'SUDAH' | 'BELUM'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kkmScore, setKkmScore] = useState<number>(75);
  const [activeDetailJawaban, setActiveDetailJawaban] = useState<{
    jawaban: JawabanQuiz;
    quiz?: Quiz;
  } | null>(null);

  const selectedKelasObj = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  // Students in selected class
  const muridInKelas = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();

    return (db.users || [])
      .filter((u) => {
        if (u.role !== 'MURID') return false;
        const uKelas = (u.kelasId || '').toLowerCase().trim();
        return uKelas === targetId || (targetNama && uKelas === targetNama);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId, selectedKelasObj]);

  // Quizzes assigned to this class or all quizzes
  const classQuizzes = useMemo(() => {
    return (db.quiz || []).filter((q) => {
      if (!q.kelasIds || q.kelasIds.length === 0) return true;
      return q.kelasIds.includes(selectedKelasId);
    });
  }, [db.quiz, selectedKelasId]);

  // All student responses in DB
  const allJawaban = useMemo(() => {
    return db.jawabanQuiz || [];
  }, [db.jawabanQuiz]);

  // Computed matrix rows
  const studentRows = useMemo(() => {
    return muridInKelas.map((murid) => {
      // Find all answers by this student
      const studentAnswers = allJawaban.filter((j) => j.muridId === murid.id);

      // If specific quiz selected:
      let matchedJawaban: JawabanQuiz | undefined;
      let matchedQuiz: Quiz | undefined;

      if (selectedQuizId !== 'SEMUA') {
        matchedJawaban = studentAnswers.find((j) => j.quizId === selectedQuizId);
        matchedQuiz = (db.quiz || []).find((q) => q.id === selectedQuizId);
      } else {
        // Use most recent or primary submission
        matchedJawaban = studentAnswers[0];
        if (matchedJawaban) {
          matchedQuiz = (db.quiz || []).find((q) => q.id === matchedJawaban!.quizId);
        }
      }

      const hasSubmitted = !!matchedJawaban;
      const score = matchedJawaban?.nilai ?? 0;
      const isTuntas = hasSubmitted && score >= kkmScore;

      return {
        murid,
        matchedJawaban,
        matchedQuiz,
        hasSubmitted,
        score,
        isTuntas,
        totalCompletedQuizzes: studentAnswers.length,
      };
    });
  }, [muridInKelas, allJawaban, selectedQuizId, db.quiz, kkmScore]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return studentRows.filter((r) => {
      // Status filter
      if (filterStatus === 'SUDAH' && !r.hasSubmitted) return false;
      if (filterStatus === 'BELUM' && r.hasSubmitted) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.murid.name.toLowerCase().includes(q);
        const matchesNis = r.murid.nis && r.murid.nis.includes(q);
        if (!matchesName && !matchesNis) return false;
      }

      return true;
    });
  }, [studentRows, filterStatus, searchQuery]);

  // KPI Stats
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const submittedStudents = studentRows.filter((r) => r.hasSubmitted).length;
    const tuntasStudents = studentRows.filter((r) => r.hasSubmitted && r.isTuntas).length;
    const scores = studentRows.filter((r) => r.hasSubmitted).map((r) => r.score);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const participationRate =
      totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0;

    return {
      totalStudents,
      submittedStudents,
      tuntasStudents,
      avgScore,
      participationRate,
    };
  }, [studentRows]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Paket Quiz',
      'Waktu Pengerjaan',
      'Jumlah Benar',
      'Jumlah Salah',
      'Nilai Akhir',
      'Status Ketuntasan (KKM ' + kkmScore + ')',
    ];

    const rows = filteredRows.map((r, idx) => [
      idx + 1,
      `"${r.murid.nis || '-'}"`,
      `"${r.murid.name}"`,
      `"Kelas ${selectedKelasObj?.nama || selectedKelasId}"`,
      `"${r.matchedQuiz?.judul || (r.hasSubmitted ? 'Quiz PJOK' : '-')}"`,
      `"${r.matchedJawaban?.tanggalMengerjakan || '-'}"`,
      r.hasSubmitted ? (r.matchedJawaban?.jumlahBenar ?? '-') : '-',
      r.hasSubmitted ? (r.matchedJawaban?.jumlahSalah ?? '-') : '-',
      r.hasSubmitted ? r.score : '-',
      r.hasSubmitted ? (r.isTuntas ? 'TUNTAS' : 'REMEDIAL') : 'BELUM MENGERJAKAN',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Hasil_Quiz_Murid_${(selectedKelasObj?.nama || 'Kelas').replace(
        /\s+/g,
        '_'
      )}_${selectedQuizId.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-1 border border-white/20">
              <Award className="w-3.5 h-3.5" />
              <span>Rekapitulasi Asesmen Teori & Kuis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapan Hasil Quis Murid
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Daftar rekapitulasi nilai kuis, akurasi jawaban, waktu pengerjaan, dan ketuntasan KKM siswa per paket soal PJOK.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title="Cetak format cetak rekapan hasil kuis"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title="Ekspor ke format file CSV"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
            {onNavigateQuiz && (
              <button
                type="button"
                onClick={onNavigateQuiz}
                className="px-4 py-2 bg-white text-purple-950 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span>Kelola Kuis</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Siswa Terdata</span>
            <span className="text-xl font-black block mt-0.5">{stats.totalStudents} Siswa</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Partisipasi</span>
            <span className="text-xl font-black block mt-0.5">
              {stats.submittedStudents} ({stats.participationRate}%)
            </span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Rata-Rata Skor</span>
            <span className="text-xl font-black block mt-0.5">{stats.avgScore} / 100</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Tuntas (≥ {kkmScore})</span>
            <span className="text-xl font-black block mt-0.5 text-emerald-300">
              {stats.tuntasStudents} Siswa
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kelas Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Kelas:</span>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiz Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Paket Quiz:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden max-w-[220px] truncate"
              >
                <option value="SEMUA">🎯 Semua Paket Quiz (Aktivitas Terbaru)</option>
                {classQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.judul}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="SUDAH">Sudah Mengerjakan</option>
                <option value="BELUM">Belum Mengerjakan</option>
              </select>
            </div>

            {/* KKM Setting */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">KKM:</span>
              <select
                value={kkmScore}
                onChange={(e) => setKkmScore(Number(e.target.value))}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value={70}>70</option>
                <option value={75}>75 (Standar)</option>
                <option value={80}>80</option>
                <option value={85}>85</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau NIS..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Daftar Rekapan Hasil Quis Kelas {selectedKelasObj?.nama || selectedKelasId}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedQuizId === 'SEMUA'
                ? 'Menampilkan rekapitulasi status pengerjaan kuis terbaru siswa'
                : `Paket Kuis: ${
                    classQuizzes.find((q) => q.id === selectedQuizId)?.judul || selectedQuizId
                  }`}
            </p>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl self-start sm:self-auto">
            {filteredRows.length} Siswa Ditampilkan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-3.5 w-12 text-center">No</th>
                <th className="py-3.5 px-3.5 min-w-[180px]">Nama Siswa & NIS</th>
                <th className="py-3.5 px-3 min-w-[180px]">Paket Quiz</th>
                <th className="py-3.5 px-3 text-center min-w-[130px]">Waktu Selesai</th>
                <th className="py-3.5 px-3 text-center min-w-[130px]">Akurasi Jawaban</th>
                <th className="py-3.5 px-3 text-center w-24">Skor</th>
                <th className="py-3.5 px-3 text-center w-28">Status</th>
                <th className="py-3.5 px-3.5 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-sm text-slate-600">Tidak ada data hasil kuis</p>
                    <p className="text-xs text-slate-400">
                      Coba ganti filter paket kuis atau pilih kelas lain.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.murid.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-3.5">
                      <p className="font-extrabold text-slate-900 leading-tight">{row.murid.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">NIS: {row.murid.nis || '-'}</p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-semibold max-w-[200px] truncate">
                      {row.hasSubmitted ? (
                        row.matchedQuiz?.judul || row.matchedJawaban?.quizJudul || 'Kuis PJOK'
                      ) : (
                        <span className="text-slate-400 font-normal italic">Belum Mengerjakan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-500 text-[11px]">
                      {row.hasSubmitted && row.matchedJawaban?.tanggalMengerjakan ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{row.matchedJawaban.tanggalMengerjakan}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.hasSubmitted && row.matchedJawaban ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {row.matchedJawaban.jumlahBenar} Benar • {row.matchedJawaban.jumlahSalah} Salah
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.hasSubmitted ? (
                        <span
                          className={`inline-block px-3 py-1 rounded-xl font-black text-xs ${
                            row.score >= kkmScore
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.score}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.hasSubmitted ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.isTuntas
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.isTuntas ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{row.isTuntas ? 'Tuntas' : 'Remedial'}</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Belum Mulai
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      {row.hasSubmitted && row.matchedJawaban ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDetailJawaban({
                              jawaban: row.matchedJawaban!,
                              quiz: row.matchedQuiz,
                            })
                          }
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Jawaban Siswa */}
      {activeDetailJawaban && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Hasil Analisis Jawaban Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeDetailJawaban.jawaban.muridNama} • Skor:{' '}
                    <strong className="text-purple-700 font-black">
                      {activeDetailJawaban.jawaban.nilai}/100
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailJawaban(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Jawaban Benar</span>
                  <span className="text-base font-black text-emerald-600">
                    {activeDetailJawaban.jawaban.jumlahBenar} Soal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Jawaban Salah</span>
                  <span className="text-base font-black text-rose-600">
                    {activeDetailJawaban.jawaban.jumlahSalah} Soal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Nilai Akhir</span>
                  <span className="text-base font-black text-purple-700">
                    {activeDetailJawaban.jawaban.nilai}
                  </span>
                </div>
              </div>

              {/* Questions Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rincian Tiap Butir Soal:</span>
                </h4>

                {(() => {
                  const quiz = activeDetailJawaban.quiz;
                  const soalList = quiz?.soal || quiz?.soalList || [];

                  if (soalList.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        Butir soal detail tidak tersedia untuk paket kuis ini.
                      </p>
                    );
                  }

                  const jawabanMap = activeDetailJawaban.jawaban.jawaban || {};

                  return soalList.map((soal, sIdx) => {
                    const studentAns = jawabanMap[soal.id];
                    const isCorrect = studentAns === soal.kunciJawaban;

                    return (
                      <div
                        key={soal.id || sIdx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-rose-50/40 border-rose-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            Soal #{sIdx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? '✓ Benar' : '✗ Salah'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 mb-2 font-medium">
                          {soal.pertanyaan}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">
                              Jawaban Siswa:
                            </span>
                            <span
                              className={`font-semibold ${
                                isCorrect ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {studentAns !== undefined
                                ? `${studentAns}. ${soal.pilihan?.[studentAns] ?? ''}`
                                : 'Tidak dijawab'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">
                              Kunci Jawaban:
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {soal.kunciJawaban !== undefined
                                ? `${soal.kunciJawaban}. ${soal.pilihan?.[soal.kunciJawaban] ?? ''}`
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {soal.pembahasan && (
                          <div className="mt-2 p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
                            <strong>Pembahasan:</strong> {soal.pembahasan}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDetailJawaban(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
