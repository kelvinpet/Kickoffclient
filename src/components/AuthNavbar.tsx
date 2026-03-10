import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function AuthNavbar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-foreground">KickoffClient</span>
      </Link>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggle}>
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <Link to="/">
          <Button variant="ghost" size="sm">Home</Button>
        </Link>
        <Link to="/pricing">
          <Button variant="ghost" size="sm">Pricing</Button>
        </Link>
        <Link to="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
        <Link to="/signup">
          <Button size="sm">Get Started</Button>
        </Link>
      </div>
    </header>
  );
}
