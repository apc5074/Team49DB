"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Film, Folder, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useSession } from "@/app/hooks/useSession";

export default function Page() {
  const { signedIn, loading } = useSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main>
        <section className="relative h-[620px] md:h-[680px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            {/* /public/hero-banner.jpg (keep it, we'll mask it to B/W with overlay) */}
            {/* <Image
              src="/hero-banner.jpg"
              alt="Hero"
              fill
              priority
              className="object-cover object-center"
            /> */}
            {/* black gradient wash */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/70 to-black" />
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            <h1
              className="
                text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6
                text-foreground
              "
            >
              Your Movie Universe
            </h1>

            <p className="text-lg md:text-2xl text-foreground/70 mb-10 max-w-2xl mx-auto">
              Discover, search, and organize your favorite films in custom
              collections
            </p>

            {!loading && (
              signedIn ? (
                <Link href="/search">
                  <Button
                    size="lg"
                    className="
                      gap-2 px-6 py-6 rounded-full
                      bg-foreground text-background
                      hover:opacity-90 transition-opacity
                    "
                  >
                    <Search className="w-5 h-5" />
                    Start Exploring
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    className="
                      gap-2 px-6 py-6 rounded-full
                      bg-foreground text-background
                      hover:opacity-90 transition-opacity
                    "
                  >
                    Sign In to Start
                  </Button>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-foreground/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 ring-1 ring-white/15 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                Search Movies
              </h3>
              <p className="text-foreground/70">
                Access a vast database of films with detailed information,
                ratings, and cast details
              </p>
            </div>

            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-foreground/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 ring-1 ring-white/15 flex items-center justify-center mb-4">
                <Folder className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                Custom Collections
              </h3>
              <p className="text-foreground/70">
                Create and organize your own movie collections for any occasion
                or theme
              </p>
            </div>

            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-foreground/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 ring-1 ring-white/15 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                Track Favorites
              </h3>
              <p className="text-foreground/70">
                Keep all your favorite movies organized and easily accessible in
                one place
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="rounded-3xl p-10 md:p-12 text-center border border-border bg-card/70 backdrop-blur-sm">
            <Film className="w-16 h-16 mx-auto mb-6 text-foreground" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ready to Start Your Collection?
            </h2>
            <p className="text-lg md:text-xl mb-8 text-foreground/80 max-w-2xl mx-auto">
              Join thousands of movie enthusiasts organizing their favorite
              films
            </p>
            {!loading && (
              signedIn ? (
                <Link href="/search">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 rounded-full px-6 py-6 border border-foreground/30 bg-transparent text-foreground hover:bg-white hover:text-black transition-colors"
                  >
                    <Search className="w-5 h-5" />
                    Browse Movies Now
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 rounded-full px-6 py-6 border border-foreground/30 bg-transparent text-foreground hover:bg-white hover:text-black transition-colors"
                  >
                    Sign In to Browse
                  </Button>
                </Link>
              )
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-foreground/60">
          <p>&copy; 2025 CineVault. Powered by TMDB.</p>
        </div>
      </footer>
    </div>
  );
}