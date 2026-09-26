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
import { BarChart3, CalendarCheck2, ChevronRight, LayoutDashboard, PanelLeft, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "현황", path: "/" },
  { icon: CalendarCheck2, label: "출석 체크", path: "/attendance" },
  { icon: UsersRound, label: "회원 명단", path: "/members" },
  { icon: BarChart3, label: "출석 통계", path: "/analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider><DashboardLayoutContent>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
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
        <SidebarFooter className="border-t border-[#e7e4dc] p-3 group-data-[collapsible=icon]:hidden">
          <p className="px-1.5 text-[11px] text-stone-400">교회 서기·임원 전용 도구</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[#f7f6f1]">
        {isMobile && <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#e7e4dc] bg-[#fbfaf7]/95 px-3 backdrop-blur"><SidebarTrigger className="rounded-xl" /><span className="text-sm font-bold text-stone-800">{active.label}</span></header>}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
