import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { LayoutDashboard, FileText, Inbox, Settings, LogOut, Sun, Moon, Zap, CreditCard, Users, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config";

const navItems = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/templates", icon: FileText, label: "Templates" },
  { to: "/app/templates/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/app/submissions", icon: Inbox, label: "Submissions" },
  { to: "/app/clients", icon: Users, label: "Clients" },
  { to: "/app/reminders", icon: Bell, label: "Reminders" },
  { to: "/app/billing", icon: CreditCard, label: "Billing" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout() {
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={toggle}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-col flex-1">
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <nav className="md:hidden flex border-b border-border bg-card px-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
