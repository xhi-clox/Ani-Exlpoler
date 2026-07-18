import { Navbar } from "./navbar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
      <footer className="mt-auto border-t border-border/80 bg-card/70 py-8 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2 font-display text-lg font-semibold uppercase tracking-[0.18em] text-foreground">
            Analithe
          </p>
          <p className="mx-auto max-w-xl">
            © {new Date().getFullYear()} Analithe. Discover your next favorite anime without sacrificing readability on any screen.
          </p>
        </div>
      </footer>
    </div>
  );
}
