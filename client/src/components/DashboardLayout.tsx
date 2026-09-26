import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, CalendarCheck2, ChevronRight, LayoutDashboard, LogOut, PanelLeft, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "현황", path: "/" },
  { icon: CalendarCheck2, label: "출석 체크", path: "/attendance" },
  { icon: UsersRound, label: "회원 명단", path: "/members" },
  { icon: BarChart3, label: "출석 통계", path: "/analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f6f1] grid place-items-center px-5">
        <section className="max-w-sm rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_50px_rgba(69,65,53,0.12)]">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#214e3b] text-xl text-white">함</div>
          <p className="text-sm font-medium text-[#b66b3d]">서기 · 임원 전용</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">함께 출석관리</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">교회 회원과 예배 출석 정보를 안전하게 관리하려면 로그인해 주세요.</p>
          <Button onClick={() => startLogin()} className="mt-7 h-12 w-full rounded-xl bg-[#214e3b] hover:bg-[#173a2b]">관리자 로그인</Button>
        </section>
      </main>
    );
  }
  if (user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#f7f6f1] grid place-items-center px-5">
        <section className="max-w-sm rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_50px_rgba(69,65,53,0.12)]">
          <p className="text-sm font-bold text-[#b66b3d]">관리자 전용 서비스</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">접근 권한이 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">교회 서기 또는 임원 계정으로 권한을 받은 뒤 다시 로그인해 주세요.</p>
          <Button onClick={logout} variant="outline" className="mt-7 h-11 w-full rounded-xl">로그아웃</Button>
        </section>
      </main>
    );
  }
  return <SidebarProvider><DashboardLayoutContent>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const active = menuItems.find(item => item.path === location) ?? menuItems[0];

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-[#e7e4dc] bg-[#fbfaf7]">
        <SidebarHeader className="h-[74px] justify-center px-3">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#214e3b] text-white" aria-label="메뉴 열기 또는 닫기">
              {state === "collapsed" ? <PanelLeft className="h-4 w-4" /> : <span className="text-sm font-bold">함</span>}
            </button>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[15px] font-bold tracking-tight text-stone-900">함께 출석관리</p>
              <p className="text-[11px] font-medium text-[#b66b3d]">CHURCH OFFICE</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-3">
          <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-stone-400 group-data-[collapsible=icon]:hidden">WORKSPACE</p>
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
                  {location === item.path && <ChevronRight className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="mx-2 mt-8 rounded-2xl bg-[#f1efe8] p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-semibold text-stone-700">MVP 1단계</p>
            <p className="mt-1 text-[11px] leading-4 text-stone-500">회원 등록, 주차별 출석, 기수별 통계를 제공합니다.</p>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-[#e7e4dc] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-[#f1efe8] group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 shrink-0 border border-[#d7d4cc]">
                  <AvatarFallback className="bg-[#e8f0e8] text-xs font-bold text-[#214e3b]">{user?.name?.slice(0, 1) || "관"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold">{user?.name || "관리자"}</p><p className="text-[10px] text-stone-400">{user?.role === "admin" ? "관리자" : "권한 확인 필요"}</p></div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />로그아웃</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[#f7f6f1]">
        {isMobile && <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#e7e4dc] bg-[#fbfaf7]/95 px-3 backdrop-blur"><SidebarTrigger className="rounded-xl" /><span className="text-sm font-bold text-stone-800">{active.label}</span></header>}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
