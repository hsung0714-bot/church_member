import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarCheck2, ClipboardList, TrendingUp, UserRoundPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function displayDate(value: string | null | undefined) {
  if (!value) return "아직 기록 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const hasData = Boolean(summary?.totalMembers);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-[#214e3b] px-6 py-7 text-white shadow-[0_16px_40px_rgba(33,78,59,0.18)] sm:px-9 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[0.18em] text-[#c9dbbd]">SUNDAY OFFICE</p>
            <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">한 주의 출석을, 함께 살핍니다.</h1>
            <p className="mt-3 text-sm leading-6 text-[#d7e3d2]">예배 중에는 빠르게 체크하고, 예배 후에는 흐름을 한눈에 확인하세요.</p>
          </div>
          <Button onClick={() => setLocation("/attendance")} className="h-12 rounded-xl bg-[#f2a76c] px-5 font-bold text-[#382415] hover:bg-[#f7bb87]">
            <CalendarCheck2 className="mr-2 h-5 w-5" />이번 주 출석 체크<ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="재적 인원" value={isLoading ? "—" : `${summary?.totalMembers ?? 0}명`} note="재적 + 새가족" icon={<UsersRound className="h-5 w-5" />} color="bg-[#e8f0e8] text-[#214e3b]" />
        <StatCard label="최근 출석" value={isLoading ? "—" : `${summary?.present ?? 0}명`} note={displayDate(summary?.serviceDate)} icon={<CalendarCheck2 className="h-5 w-5" />} color="bg-[#fff0df] text-[#b66b3d]" />
        <StatCard label="출석률" value={isLoading ? "—" : `${summary?.rate ?? 0}%`} note="재적 인원 기준" icon={<TrendingUp className="h-5 w-5" />} color="bg-[#e8eef6] text-[#426b94]" />
      </section>

      {!hasData && !isLoading ? (
        <section className="rounded-[1.7rem] border border-dashed border-[#cfcbbf] bg-[#fbfaf7] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-bold text-[#b66b3d]">첫 출석부를 시작해 보세요</p><h2 className="mt-1 text-xl font-bold tracking-tight text-stone-800">회원을 등록하면 준비가 끝납니다.</h2><p className="mt-2 text-sm text-stone-500">등록한 회원은 기수별로 자동 정리되어 출석 화면에 표시됩니다.</p></div>
            <Button onClick={() => setLocation("/members")} className="h-11 shrink-0 rounded-xl bg-[#214e3b] hover:bg-[#173a2b]"><UserRoundPlus className="mr-2 h-4 w-4" />회원 등록하기</Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[1.7rem] border border-[#e7e4dc] bg-white p-6 shadow-[0_8px_25px_rgba(68,62,48,0.05)]">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.12em] text-[#b66b3d]">QUICK ACTION</p><h2 className="mt-1 text-xl font-bold text-stone-800">출석부를 이어서 관리하세요</h2></div><ClipboardList className="h-6 w-6 text-[#86a17a]" /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><ActionButton icon={<CalendarCheck2 className="h-5 w-5" />} title="이번 주 출석 체크" description="탭으로 빠르게 체크하고 한 번에 저장" onClick={() => setLocation("/attendance")} /><ActionButton icon={<TrendingUp className="h-5 w-5" />} title="출석 통계 보기" description="주별 추이와 기수별 현황 확인" onClick={() => setLocation("/analytics")} /></div>
          </div>
          <div className="rounded-[1.7rem] border border-[#e7e4dc] bg-[#fffaf3] p-6"><p className="text-xs font-bold tracking-[0.12em] text-[#b66b3d]">NEXT PHASE</p><h2 className="mt-1 text-lg font-bold text-stone-800">서기 업무 지원</h2><p className="mt-2 text-sm leading-6 text-stone-500">연속 결석 감지, 새가족 정착 추적, 주간 리포트는 다음 단계에서 연결합니다.</p><button onClick={() => toast.info("다음 단계 기능으로 설계되어 있습니다.")} className="mt-4 text-sm font-bold text-[#214e3b]">계획 보기 →</button></div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, note, icon, color }: { label: string; value: string; note: string; icon: React.ReactNode; color: string }) {
  return <div className="rounded-[1.5rem] border border-[#e7e4dc] bg-white p-5 shadow-[0_6px_20px_rgba(68,62,48,0.04)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-stone-500">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}>{icon}</span></div><p className="mt-4 text-3xl font-extrabold tracking-tight text-stone-800">{value}</p><p className="mt-1 text-xs text-stone-400">{note}</p></div>;
}

function ActionButton({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="group flex items-start gap-3 rounded-2xl border border-[#ebe9e3] p-4 text-left transition hover:border-[#b7cbb2] hover:bg-[#f7faf5]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0e8] text-[#214e3b]">{icon}</span><span><span className="block text-sm font-bold text-stone-800">{title}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{description}</span></span><ArrowRight className="ml-auto mt-3 h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#214e3b]" /></button>;
}
