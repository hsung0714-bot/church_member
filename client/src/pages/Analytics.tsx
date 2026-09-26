import DatePicker from "@/components/DatePicker";
import { trpc } from "@/lib/trpc";
import { CalendarDays, LineChart as LineChartIcon, RotateCcw, UsersRound } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SERIES = {
  total: { key: "total", label: "전체", color: "#2a78d6" },
  male: { key: "male", label: "남", color: "#eb6834" },
  female: { key: "female", label: "여", color: "#1baf7a" },
} as const;

function dateLabel(value: string | null | undefined) { return value ? new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00`)) : "아직 출석 기록 없음"; }

export default function Analytics() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const hasRange = Boolean(from || to);
  const { data, isLoading } = trpc.analytics.overview.useQuery(
    hasRange ? { from: from || undefined, to: to || undefined } : undefined,
    { retry: false },
  );
  const hasData = Boolean(data?.trend.length);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-[#b66b3d]">ATTENDANCE INSIGHTS</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-800 sm:text-3xl">출석 통계</h1>
        <p className="mt-2 text-sm text-stone-500">주별 전체·남·여 출석 흐름을 비교합니다.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="출석 대상" value={isLoading ? "—" : `${data?.totalMembers ?? 0}명`} icon={<UsersRound className="h-5 w-5" />} />
        <Summary label="분석 기준" value={isLoading ? "—" : dateLabel(data?.latestDate)} icon={<CalendarDays className="h-5 w-5" />} compact />
        <Summary label="표시 주차" value={isLoading ? "—" : `${data?.trend.length ?? 0}주`} icon={<LineChartIcon className="h-5 w-5" />} />
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-[1.6rem] border border-[#e7e4dc] bg-white p-4 sm:p-5">
        <DatePicker label="시작일" value={from} onChange={setFrom} max={to || undefined} placeholder="전체 기간" />
        <DatePicker label="종료일" value={to} onChange={setTo} min={from || undefined} placeholder="오늘까지" />
        {hasRange && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-stone-500 hover:bg-[#f7f6f1]">
            <RotateCcw className="h-4 w-4" />최근 8주로
          </button>
        )}
        <p className="ml-auto text-xs text-stone-400">{hasRange ? "지정한 기간의 모든 예배 주차" : "날짜를 지정하지 않으면 최근 8주가 표시됩니다"}</p>
      </section>

      {!hasData && !isLoading ? (
        <EmptyAnalytics />
      ) : (
        <ChartCard title="주별 출석 추이" subtitle={hasRange ? `${from || "처음"} ~ ${to || "지금"}` : "최근 8주 · 출석 인원 기준"} icon={<LineChartIcon className="h-5 w-5" />}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data?.trend ?? []} margin={{ top: 12, left: -18, right: 12, bottom: 0 }}>
              <CartesianGrid stroke="#eeeae1" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#8c877d", fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8c877d", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: "1px solid #e7e4dc", boxShadow: "0 10px 24px rgba(50,50,40,.1)" }}
                labelFormatter={(_, items) => items?.[0]?.payload?.fullDate ?? ""}
                formatter={(value: number, name: string) => [`${value}명`, name]}
              />
              <Legend formatter={(value: string) => <span className="text-xs font-semibold text-stone-600">{value}</span>} />
              <Line type="monotone" dataKey={SERIES.total.key} name={SERIES.total.label} stroke={SERIES.total.color} strokeWidth={3} dot={{ r: 4, fill: SERIES.total.color, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey={SERIES.male.key} name={SERIES.male.label} stroke={SERIES.male.color} strokeWidth={2} dot={{ r: 3, fill: SERIES.male.color, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey={SERIES.female.key} name={SERIES.female.label} stroke={SERIES.female.color} strokeWidth={2} dot={{ r: 3, fill: SERIES.female.color, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function Summary({ label, value, icon, compact }: { label: string; value: string; icon: React.ReactNode; compact?: boolean }) { return <div className="rounded-[1.5rem] border border-[#e7e4dc] bg-white p-5 shadow-[0_6px_20px_rgba(68,62,48,0.04)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f0e8] text-[#214e3b]">{icon}</span><p className={`mt-4 font-extrabold tracking-tight text-stone-800 ${compact ? "text-lg" : "text-3xl"}`}>{value}</p><p className="mt-1 text-xs font-semibold text-stone-500">{label}</p></div>; }
function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[1.6rem] border border-[#e7e4dc] bg-white p-5 shadow-[0_8px_25px_rgba(68,62,48,0.04)] sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-bold text-stone-800">{title}</h2><p className="mt-1 text-xs text-stone-500">{subtitle}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0df] text-[#b66b3d]">{icon}</span></div><div className="mt-5">{children}</div></section>; }
function EmptyAnalytics() { return <section className="rounded-[1.6rem] border border-dashed border-[#cfcbbf] bg-[#fbfaf7] p-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0e8] text-[#214e3b]"><LineChartIcon className="h-6 w-6" /></span><p className="mt-4 font-bold text-stone-700">아직 분석할 출석 기록이 없습니다</p><p className="mt-1 text-sm text-stone-400">출석 체크 화면에서 한 주차를 저장하면 추이가 표시됩니다.</p></section>; }
