import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, CalendarCheck2, ChevronRight, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "현황", path: "/" },
  { icon: CalendarCheck2, label: "출석 체크", path: "/attendance" },
  { icon: UsersRound, label: "회원 명단", path: "/members" },
  { icon: BarChart3, label: "출석 통계", path: "/analytics" },
];

function LoginScreen() {
  const utils = trpc.useUtils();
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f1] px-5">
      <section className="w-full max-w-sm rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_50px_rgba(69,65,53,0.12)]">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#214e3b] text-xl text-white">함</div>
        <p className="text-sm font-medium text-[#b66b3d]">서기 · 임원 전용</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">함께 출석관리</h1>
        <form
          className="mt-7 space-y-3 text-left"
          onSubmit={e => {
            e.preventDefault();
            login.mutate({ password });
          }}
        >
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            autoComplete="current-password"
            autoFocus
            className="h-12 rounded-xl"
            required
          />
          {login.error && <p className="text-sm text-destructive">{login.error.message}</p>}
          <Button type="submit" disabled={login.isPending} className="h-12 w-full rounded-xl bg-[#214e3b] hover:bg-[#173a2b]">
            {login.isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  if (me.isLoading) return <main className="min-h-screen bg-[#f7f6f1]" />;
  if (!me.data?.authed) return <LoginScreen />;
  return <SidebarProvider><DashboardLayoutContent>{children}</DashboardLayoutContent></SidebarProvider>;
}

function LogoutButton() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.auth.me.setData(undefined, { authed: false });
      await utils.invalidate();
    },
  });
  return (
    <button
      onClick={() => logout.mutate()}
      className="mt-1 flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-stone-500 hover:text-stone-800"
    >
      <LogOut className="h-3.5 w-3.5" />
      로그아웃
    </button>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const active = menuItems.find(item => item.path === location) ?? menuItems[0];
  const showTopBar = isMobile || state === "collapsed";

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r border-[#e7e4dc] bg-[#fbfaf7]">
        <SidebarHeader className="h-[74px] justify-center px-3">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#214e3b] text-white" aria-label="메뉴 닫기">
              <span className="text-sm font-bold">함</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-stone-900">함께 출석관리</p>
              <p className="text-[11px] font-medium text-[#b66b3d]">CHURCH OFFICE</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-3">
          <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-stone-400">WORKSPACE</p>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={location === item.path}
                  onClick={() => setLocation(item.path)}
                  tooltip={item.label}
                  className="h-11 rounded-xl px-3 text-stone-600 data-[active=true]:bg-[#e8f0e8] data-[active=true]:font-semibold data-[active=true]:text-[#214e3b]"
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                  {location === item.path && <ChevronRight className="ml-auto h-4 w-4" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="mx-2 mt-8 rounded-2xl bg-[#f1efe8] p-3">
            <p className="text-xs font-semibold text-stone-700">MVP 1단계</p>
            <p className="mt-1 text-[11px] leading-4 text-stone-500">회원 등록, 주차별 출석, 기수별 통계를 제공합니다.</p>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-[#e7e4dc] p-3">
          <p className="px-1.5 text-[11px] text-stone-400">교회 서기·임원 전용 도구</p>
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[#f7f6f1]">
        {showTopBar && <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#e7e4dc] bg-[#fbfaf7]/95 px-3 backdrop-blur"><SidebarTrigger className="rounded-xl" /><span className="text-sm font-bold text-stone-800">{active.label}</span></header>}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
