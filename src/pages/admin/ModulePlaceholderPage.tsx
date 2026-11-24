import { Link } from 'react-router-dom';

interface ModulePlaceholderPageProps {
  title: string;
  stage: string;
  description: string;
  addNewLabel?: string;
}

export function ModulePlaceholderPage({
  title,
  stage,
  description,
  addNewLabel,
}: ModulePlaceholderPageProps) {
  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-[23px] font-normal text-[#1d2327]">{title}</h1>
        {addNewLabel && (
          <span className="px-2.5 py-1 text-[12px] font-medium text-[#2271b1] bg-[#f6f7f7] border border-[#2271b1] rounded-[3px]">
            {addNewLabel}
          </span>
        )}
      </div>

      <div className="bg-white border border-[#c3c4c7] p-6 shadow-[0_1px_1px_rgba(0,0,0,0.04)] text-[13px] max-w-3xl">
        <p className="text-[14px] font-semibold text-[#1d2327] mb-1">
          Kerangka Modul Siap — Dijadwalkan pada {stage}
        </p>
        <p className="text-[#50575e] leading-relaxed mb-4">{description}</p>
        <p className="text-[#50575e] mb-4">
          Pada <strong>Tahap 1</strong> saat ini, rute, tata letak wp-admin, skema tabel Supabase, dan pembatasan hak akses berdasarkan peran telah aktif sepenuhnya.
        </p>
        <Link
          to="/admin"
          className="inline-block px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-medium rounded-[3px]"
        >
          Kembali ke Dasbor
        </Link>
      </div>
    </div>
  );
}
