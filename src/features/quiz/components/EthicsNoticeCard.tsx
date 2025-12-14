import { Icon } from "./Icon";

export function EthicsNoticeCard() {
  const noticeTexts = [
    "آزمون «ذهن وراج» بخشی از برنامه‌ی علمی افران است که با هدف افزایش «سواد روانی» و ارتقای آگاهی هیجانی طراحی شده.",
    "این آزمون بر پایه‌ی مطالعات معتبر جهانی در زمینه‌ی نشخوار فکری، فراشناخت و ذهن‌آگاهی ساخته شده و تمام اصول اخلاقی و حرفه‌ای روان‌شناسی در ساخت و اجرای آن رعایت شده است.",
    "داده‌های این آزمون محرمانه‌اند و صرفاً برای خودشناسی و رشد فردی استفاده می‌شوند.",
    "افران هیچ‌گونه تشخیص بالینی صادر نمی‌کند؛ هدف ما آگاهی، نه برچسب‌گذاری است.",
  ];

  return (
    <div className="relative rounded-3xl border border-amber-300/30 bg-amber-500/15 backdrop-blur-xl shadow-[0_14px_40px_rgba(245,158,11,0.25)] overflow-hidden">
      {/* Inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/15 to-slate-900/10 pointer-events-none" />
      
      <div className="relative p-4 sm:p-5 md:p-6 text-right">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2">
            <Icon name="recommendation" className="w-5 h-5 text-white shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-white">بیانیه علمی و اخلاقی افران</h3>
          </div>
          <span className="inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium bg-amber-400/20 border border-amber-300/30 text-white backdrop-blur-sm shrink-0">
            اطلاعیه
          </span>
        </div>

        {/* Text Rows */}
        <div className="space-y-3 sm:space-y-4">
          {noticeTexts.map((text, index) => (
            <p key={index} className="text-sm leading-7 text-white/85">
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
