import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, CheckCheck, ChevronDown, RotateCcw, Save, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function nearestSunday() {
  const date = new Date();
  const diff = (7 - date.getDay()) % 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
function displayDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00`)); }

type AttendanceMember = { id: number; name: string; phone: string | null; attended: boolean; status: string; cohort: number };

export default function Attendance() {
  const [serviceDate, setServiceDate] = useState(nearestSunday);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<number, boolean>>({});
  const loadedFor = useRef("");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.attendance.getWeek.useQuery({ serviceDate });
  const saveAttendance = trpc.attendance.save.useMutation({
    onSuccess: async result => { await utils.attendance.getWeek.invalidate({ serviceDate }); toast.success(`${result.updated}명의 출석부를 저장했습니다.`); },
    onError: error => toast.error(error.message || "저장하지 못했습니다."),
  });

  useEffect(() => {
    if (!data || loadedFor.current === serviceDate) return;
    setDraft(Object.fromEntries(data.members.map(member => [member.id, member.attended])));
    loadedFor.current = serviceDate;
  }, [data, serviceDate]);

  const visibleMembers = useMemo(
    () => (data?.members ?? []).filter(member => `${member.name} ${member.cohort}기`.toLowerCase().includes(search.trim().toLowerCase())),
    [data?.members, search],
  );
  const grouped = useMemo(() => {
    const map = new Map<number, AttendanceMember[]>();
    for (const member of visibleMembers) map.set(member.cohort, [...(map.get(member.cohort) ?? []), member]);
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [visibleMembers]);
  const presentCount = (data?.members ?? []).filter(member => draft[member.id] ?? member.attended).length;
  const total = data?.members.length ?? 0;

  const markVisible = (attended: boolean) => setDraft(current => ({ ...current, ...Object.fromEntries(visibleMembers.map(member => [member.id, attended])) }));
  const save = () => {
    if (!data?.members.length) return toast.info("먼저 회원 명단을 등록해 주세요.");
    saveAttendance.mutate({ serviceDate, records: data.members.map(member => ({ memberId: member.id, attended: draft[member.id] ?? member.attended })) });
  };

  return (
    <div className="pb-24 sm:pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold tracking-[0.14em] text-[#b66b3d]">WEEKLY ATTENDANCE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-800 sm:text-3xl">주차별 출석 체크</h1><p className="mt-2 text-sm text-stone-500">이름 칩을 눌러 출석 상태를 바꾸고, 저장 버튼으로 한 번에 반영하세요.</p></div>
        <label className="flex h-12 items-center gap-3 rounded-xl border border-[#dcd8ce] bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm"><span className="text-stone-400">예배일</span><input aria-label="예배일 선택" type="date" value={serviceDate} onChange={event => { loadedFor.current = ""; setServiceDate(event.target.value); }} className="bg-transparent outline-none" /></label>
      </header>

      <section className="mt-6 overflow-hidden rounded-[1.6rem] bg-[#214e3b] text-white"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm font-semibold text-[#c9dbbd]">{displayDate(serviceDate)}</p><p className="mt-1 text-3xl font-extrabold">{isLoading ? "불러오는 중" : `${presentCount} / ${total}명`}</p><p className="mt-1 text-xs text-[#d7e3d2]">현재 체크 기준 출석 인원</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => markVisible(true)} disabled={!visibleMembers.length} className="h-10 rounded-xl bg-white/15 px-4 text-white hover:bg-white/25"><CheckCheck className="mr-2 h-4 w-4" />전체 출석</Button><Button variant="secondary" onClick={() => markVisible(false)} disabled={!visibleMembers.length} className="h-10 rounded-xl bg-white/15 px-4 text-white hover:bg-white/25"><RotateCcw className="mr-2 h-4 w-4" />전체 해제</Button></div></div></section>

      <section className="mt-5 rounded-[1.6rem] border border-[#e7e4dc] bg-white shadow-[0_8px_25px_rgba(68,62,48,0.04)]"><div className="border-b border-[#efede7] p-4 sm:p-5"><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="이름 또는 기수 검색" className="h-12 w-full rounded-xl bg-[#f7f6f1] pl-11 pr-4 text-sm outline-none ring-[#214e3b] placeholder:text-stone-400 focus:ring-2" /></div></div>
        {isLoading ? <div className="p-10 text-center text-sm text-stone-400">출석부를 불러오는 중입니다.</div> : !data?.members.length ? <EmptyAttendance /> : <div className="divide-y divide-[#efede7]">{grouped.length ? grouped.map(([cohort, members]) => <CohortChips key={cohort} cohort={cohort} members={members} draft={draft} onToggle={memberId => setDraft(current => ({ ...current, [memberId]: !(current[memberId] ?? false) }))} />) : <div className="p-10 text-center text-sm text-stone-400">검색 결과가 없습니다.</div>}</div>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e7e4dc] bg-[#fbfaf7]/95 p-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0"><div className="mx-auto flex max-w-[1440px] justify-end"><Button onClick={save} disabled={saveAttendance.isPending || !data?.members.length} className="h-12 w-full rounded-xl bg-[#214e3b] px-6 font-bold hover:bg-[#173a2b] sm:w-auto"><Save className="mr-2 h-4 w-4" />{saveAttendance.isPending ? "저장 중…" : `${presentCount}명 출석 저장`}</Button></div></div>
    </div>
  );
}

function CohortChips({ cohort, members, draft, onToggle }: { cohort: number; members: AttendanceMember[]; draft: Record<number, boolean>; onToggle: (memberId: number) => void }) {
  const [open, setOpen] = useState(true);
  const count = members.filter(member => draft[member.id] ?? member.attended).length;
  return (
    <section>
      <button onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between bg-[#fcfbf8] px-5 py-3.5 text-left">
        <span className="font-bold text-stone-700">{cohort}기 <span className="ml-1 text-xs font-medium text-stone-400">{count}/{members.length} 출석</span></span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          {members.map(member => {
            const attended = draft[member.id] ?? member.attended;
            return (
              <button
                key={member.id}
                onClick={() => onToggle(member.id)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition active:scale-95 ${
                  attended
                    ? "border-[#2d6a4f] bg-[#e8f0e8] text-[#214e3b]"
                    : "border-[#e0ddd3] bg-white text-stone-500 hover:border-[#c9c4b6]"
                }`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${attended ? "bg-[#2d6a4f] text-white" : "border border-[#c9c4b6] bg-transparent"}`}>
                  {attended && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {member.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyAttendance() { return <div className="p-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0e8] text-[#214e3b]"><UsersRound className="h-6 w-6" /></span><p className="mt-4 font-bold text-stone-700">등록된 회원이 없습니다</p><p className="mt-1 text-sm text-stone-400">회원 명단에서 회원을 먼저 등록해 주세요.</p></div>; }
