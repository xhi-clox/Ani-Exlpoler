import { Link, useLocation } from "wouter";
import { Search, Sparkles, PenLine, BookOpen, Clock, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:h-16 md:py-0">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/90 text-primary-foreground shadow-[0_0_24px_rgba(76,211,240,0.25)] transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="hidden font-display text-xl font-bold uppercase tracking-[0.14em] text-foreground sm:inline">
            AniExplorer
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/analyses">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <BookOpen className="w-4 h-4" />
              Analyses
            </Button>
          </Link>
          {isAuthenticated && (
            <Link href="/write">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                <PenLine className="w-4 h-4" />
                Write
              </Button>
            </Link>
          )}
        </div>

        <div className="hidden max-w-md flex-1 md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search anime..." 
              className="w-full rounded-full border-border/80 bg-card/80 pl-9 shadow-sm focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden" onClick={() => setLocation('/search')}>
            <Search className="w-5 h-5" />
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,100vw)] border-border/80 bg-card/95 p-6">
              <div className="flex flex-col gap-4 mt-8">
                {isAuthenticated && (
                  <Link href={user ? `/users/${user.username}` : "/settings"} onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl border border-transparent text-base text-foreground hover:border-primary/30 hover:bg-secondary/70" size="lg">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/90 text-sm font-medium text-primary-foreground">
                        {user?.username?.[0].toUpperCase()}
                      </span>
                      {user?.username ?? "Profile"}
                    </Button>
                  </Link>
                )}
                <Link href="/analyses" onClick={closeMenu}>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl border border-transparent text-base text-foreground hover:border-primary/30 hover:bg-secondary/70" size="lg">
                    <BookOpen className="w-5 h-5" />
                    Analyses
                  </Button>
                </Link>
                {isAuthenticated && (
                  <>
                    <Link href="/write" onClick={closeMenu}>
                      <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl border border-transparent text-base text-foreground hover:border-primary/30 hover:bg-secondary/70" size="lg">
                        <PenLine className="w-5 h-5" />
                        Write
                      </Button>
                    </Link>
                    <Link href="/watch-history" onClick={closeMenu}>
                      <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl border border-transparent text-base text-foreground hover:border-primary/30 hover:bg-secondary/70" size="lg">
                        <Clock className="w-5 h-5" />
                        History
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 rounded-xl border border-transparent text-base text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      size="lg"
                      onClick={() => { logout(); setLocation("/"); closeMenu(); }}
                    >
                      <LogOut className="w-5 h-5" />
                      Log out
                    </Button>
                  </>
                )}
                {!isAuthenticated && (
                  <>
                    <Link href="/login" onClick={closeMenu}>
                      <Button variant="ghost" className="w-full justify-start rounded-xl border border-transparent text-base text-foreground hover:border-primary/30 hover:bg-secondary/70" size="lg">Log in</Button>
                    </Link>
                    <Link href="/signup" onClick={closeMenu}>
                      <Button className="w-full justify-start rounded-xl text-base" size="lg">Sign up</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {isAuthenticated ? (
            <>
              <Link href="/watch-history">
                <Button variant="ghost" size="sm" className="hidden gap-1 text-muted-foreground hover:text-foreground md:inline-flex">
                  <Clock className="w-4 h-4" />
                  <span>History</span>
                </Button>
              </Link>
              <Link href={user ? `/users/${user.username}` : "/settings"}>
                <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground md:inline-flex">
                  {user?.username ?? "Profile"}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="hidden gap-1 text-muted-foreground hover:text-destructive md:inline-flex" onClick={() => { logout(); setLocation("/"); }}>
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground md:inline-flex">Log in</Button></Link>
              <Link href="/signup"><Button size="sm" className="hidden md:inline-flex">Sign up</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
