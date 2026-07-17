import { Link } from "wouter";
import { Ghost, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <Ghost className="w-32 h-32 text-primary relative z-10 animate-bounce" />
      </div>
      
      <h1 className="text-6xl md:text-8xl font-display font-bold mb-4 tracking-tighter">
        4<span className="text-primary">0</span>4
      </h1>
      
      <p className="text-xl md:text-2xl text-muted-foreground font-light mb-8 max-w-md">
        This page seems to be missing from the archives. The void has claimed it.
      </p>
      
      <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/25">
        <Link href="/">
          <Home className="w-5 h-5 mr-2" />
          Return to Base
        </Link>
      </Button>
    </div>
  );
}
