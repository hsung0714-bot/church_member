import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Plus, Search, Trash2, UserRoundPlus, UsersRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const statusLabels = { active: "재적", new: "새가족", dormant: "휴면", transferred: "전출" } as const;
type Status = keyof typeof statusLabels;
const genderLabels = { male: "남", female: "여" } as const;
type Gender = keyof typeof genderLabels;
type Member = { id: number; name: string; phone: string | null; status: Status; cohort: number | null; gender: Gender | null };
const cohortLabel = (cohort: number | null) => (cohort === null ? "미배정" : `${cohort}기`);

export default function Members() {
  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.members.list.useQuery();
  const [search, setSearch] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [cohort, setCohort] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const refresh = async () => {
    await Promise.all([
      utils.members.list.invalidate(),
      utils.dashboard.summary.invalidate(),
      utils.analytics.overview.invalidate(),
    ]);
  };
  const createMember = trpc.members.create.useMutation({
    onSuccess: async () => {
      setMemberName("");
      setPhone("");
      setStatus("active");
      setCohort("");
      setGender("");
      setShowMemberForm(false);
      await refresh();
      toast.success("회원이 등록되었습니다.");
    },
    onError: error => toast.error(error.message),
  });

  const filtered = useMemo(
    () => members.filter(member => `${member.name} ${cohortLabel(member.cohort)}`.toLowerCase().includes(search.toLowerCase())),
    [members, search],
  );
  const grouped = useMemo(() => {
    const map = new Map<number | null, typeof filtered>();
    for (const member of filtered) map.set(member.cohort, [...(map.get(member.cohort) ?? []), member]);
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return a[0] - b[0];
    });
  }, [filtered]);

  const submitMember = (event: FormEvent) => {
    event.preventDefault();
    const cohortNumber = Number(cohort);
    if (!memberName.trim()) return toast.error("이름을 입력해 주세요.");
    if (!cohort || !Number.isInteger(cohortNumber) || cohortNumber < 1) return toast.error("기수를 숫자로 입력해 주세요.");
    createMember.mutate({
      name: memberName.trim(),
      phone: phone.trim() || null,
      status,
      cohort: cohortNumber,
      gender: gender || null,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#b66b3d]">MEMBER DIRECTORY</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-800 sm:text-3xl">회원 명단</h1>
          <p className="mt-2 text-sm text-stone-500">기수별로 회원을 관리합니다. 이름을 누르면 상세 정보를 수정할 수 있습니다.</p>
        </div>
        <Button onClick={() => setShowMemberForm(value => !value)} className="h-11 rounded-xl bg-[#214e3b] hover:bg-[#173a2b]">
          <UserRoundPlus className="mr-2 h-4 w-4" />회원 등록
        </Button>
      </header>

      {showMemberForm && (
        <form onSubmit={submitMember} className="rounded-[1.5rem] border border-[#e9dacb] bg-[#fffaf3] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-800">새 회원 등록</p>
              <p className="mt-1 text-xs text-stone-500">기수는 숫자로 입력하세요 (예: 7).</p>
            </div>
            <button type="button" onClick={() => setShowMemberForm(false)} className="text-xs font-semibold text-stone-400">닫기</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input required value={memberName} onChange={event => setMemberName(event.target.value)} placeholder="이름 *" className="h-11 rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
            <input
              required
              type="number"
              min={1}
              max={99}
              value={cohort}
              onChange={event => setCohort(event.target.value)}
              placeholder="기수 *"
              className="h-11 rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]"
            />
            <select aria-label="성별 선택" value={gender} onChange={event => setGender(event.target.value as Gender | "")} className="h-11 rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]">
              <option value="">성별 (선택)</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
            <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="연락처 (선택)" className="h-11 rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
            <select aria-label="상태 선택" value={status} onChange={event => setStatus(event.target.value as Status)} className="h-11 rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]">
              <option value="active">재적</option>
              <option value="new">새가족</option>
              <option value="dormant">휴면</option>
              <option value="transferred">전출</option>
            </select>
            <Button disabled={createMember.isPending} className="h-11 rounded-xl bg-[#214e3b] hover:bg-[#173a2b]"><Plus className="mr-1 h-4 w-4" />{createMember.isPending ? "등록 중" : "등록"}</Button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-[1.6rem] border border-[#e7e4dc] bg-white shadow-[0_8px_25px_rgba(68,62,48,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#efede7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="이름 또는 기수 검색" className="h-11 w-full rounded-xl bg-[#f7f6f1] pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
          </div>
          <p className="text-sm font-semibold text-stone-500">총 <span className="text-[#214e3b]">{members.length}</span>명</p>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-stone-400">회원 명단을 불러오는 중입니다.</div>
        ) : !members.length ? (
          <EmptyMembers onAdd={() => setShowMemberForm(true)} />
        ) : (
          <div className="divide-y divide-[#efede7]">
            {grouped.map(([cohort, list]) => <CohortGroup key={cohort} cohort={cohort} members={list} onSelect={setEditingMember} />)}
            {!grouped.length && <div className="p-10 text-center text-sm text-stone-400">검색 결과가 없습니다.</div>}
          </div>
        )}
      </section>

      {editingMember && (
        <MemberDetailDialog
          key={editingMember.id}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={async () => { setEditingMember(null); await refresh(); }}
        />
      )}
    </div>
  );
}

function CohortGroup({
  cohort,
  members,
  onSelect,
}: {
  cohort: number | null;
  members: Member[];
  onSelect: (member: Member) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between bg-[#fcfbf8] px-5 py-3.5 text-left">
        <span className="font-bold text-stone-700">{cohortLabel(cohort)} <span className="ml-1 text-xs font-medium text-stone-400">{members.length}명</span></span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="divide-y divide-[#f0eee9] px-5">
          {members.map(member => (
            <button key={member.id} onClick={() => onSelect(member)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left transition hover:bg-[#f7f6f1]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1efe8] text-xs font-bold text-[#214e3b]">{member.name.slice(0, 1)}</span>
              <div className="min-w-0">
                <p className="font-bold text-stone-800">{member.name}{member.gender && <span className="ml-1.5 text-xs font-medium text-stone-400">{genderLabels[member.gender]}</span>}</p>
                {member.phone && <p className="mt-0.5 text-xs text-stone-400">{member.phone}</p>}
              </div>
              <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${member.status === "new" ? "bg-[#fff0df] text-[#b66b3d]" : member.status === "active" ? "bg-[#e8f0e8] text-[#2d6a4f]" : "bg-stone-100 text-stone-500"}`}>{statusLabels[member.status]}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MemberDetailDialog({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(member.name);
  const [cohort, setCohort] = useState(member.cohort !== null ? String(member.cohort) : "");
  const [gender, setGender] = useState<Gender | "">(member.gender ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [status, setStatus] = useState<Status>(member.status);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateMember = trpc.members.update.useMutation({
    onSuccess: () => { toast.success("회원 정보를 수정했습니다."); onSaved(); },
    onError: error => toast.error(error.message),
  });
  const deleteMember = trpc.members.delete.useMutation({
    onSuccess: () => { toast.success(`${member.name} 회원을 삭제했습니다.`); onSaved(); },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("이름을 입력해 주세요.");
    const cohortNumber = cohort.trim() ? Number(cohort) : null;
    if (cohortNumber !== null && (!Number.isInteger(cohortNumber) || cohortNumber < 1)) return toast.error("기수를 숫자로 입력해 주세요.");
    updateMember.mutate({ id: member.id, name: name.trim(), phone: phone.trim() || null, status, cohort: cohortNumber, gender: gender || null });
  };

  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>회원 정보 수정</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500">이름</label>
            <input required value={name} onChange={event => setName(event.target.value)} className="h-11 w-full rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500">기수</label>
              <input type="number" min={1} max={99} value={cohort} onChange={event => setCohort(event.target.value)} placeholder="미배정" className="h-11 w-full rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500">성별</label>
              <select aria-label="성별 선택" value={gender} onChange={event => setGender(event.target.value as Gender | "")} className="h-11 w-full rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]">
                <option value="">선택 안 함</option>
                <option value="male">남</option>
                <option value="female">여</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500">연락처</label>
            <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="선택" className="h-11 w-full rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500">상태</label>
            <select aria-label="상태 선택" value={status} onChange={event => setStatus(event.target.value as Status)} className="h-11 w-full rounded-xl border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#214e3b]">
              <option value="active">재적</option>
              <option value="new">새가족</option>
              <option value="dormant">휴면</option>
              <option value="transferred">전출</option>
            </select>
          </div>
          {confirmingDelete ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">{member.name} 회원을 삭제할까요? 출석 기록도 함께 삭제되며 되돌릴 수 없습니다.</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)} className="h-9 rounded-lg">취소</Button>
                <Button type="button" onClick={() => deleteMember.mutate({ id: member.id })} disabled={deleteMember.isPending} className="h-9 rounded-lg bg-red-600 hover:bg-red-700">{deleteMember.isPending ? "삭제 중" : "삭제"}</Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setConfirmingDelete(true)} className="h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="mr-2 h-4 w-4" />삭제</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl">취소</Button>
                <Button type="submit" disabled={updateMember.isPending} className="h-11 rounded-xl bg-[#214e3b] hover:bg-[#173a2b]">{updateMember.isPending ? "저장 중" : "저장"}</Button>
              </div>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyMembers({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0e8] text-[#214e3b]"><UsersRound className="h-6 w-6" /></span>
      <p className="mt-4 font-bold text-stone-700">회원 명단이 비어 있습니다</p>
      <p className="mt-1 text-sm text-stone-400">회원을 등록하면 기수별로 자동 정리됩니다.</p>
      <Button onClick={onAdd} className="mt-5 h-10 rounded-xl bg-[#214e3b] hover:bg-[#173a2b]"><UserRoundPlus className="mr-2 h-4 w-4" />첫 회원 등록</Button>
    </div>
  );
}
