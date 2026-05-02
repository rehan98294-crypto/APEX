import { useLocation, Link } from "wouter";
import { clearAuthToken } from "@/lib/api";
import {
  LayoutDashboard,
  ArrowDownToLine,
  Users,
  ClipboardList,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { href: "/users", label: "Users", icon: Users },
  { href: "/activity", label: "Activity Log", icon: ClipboardList },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  function handleLogout() {
    clearAuthToken();
    setLocation("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5CBFFE] to-[#2BD9A8] flex items-center justify-center shrink-0">
            <span className="text-black font-black text-xs">A</span>
          </div>
          <div>
            <div className="text-sm font-bold text-sidebar-foreground leading-none">Apex</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Admin</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <a
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
          <button
            data-testid="button-logout"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
