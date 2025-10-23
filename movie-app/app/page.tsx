import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Search, Film, Folder, Star } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative h-[620px] md:h-[680px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            {/* Place /public/hero-banner.jpg */}
            <Image
              src="/hero-banner.jpg"
              alt="Hero"
              fill
              priority
              className="object-cover object-center"
            />
            {/* Darker overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            <h1
              className="
                text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6
                text-white
                drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]
              "
            >
              Your Movie Universe
            </h1>

            <p className="text-lg md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              Discover, search, and organize your favorite films in custom
              collections
            </p>

            <Link href="/search">
              <Button
                size="lg"
                className="
                  gap-2 shadow-glow
                  px-6 py-6 rounded-full
                  hover:shadow-lg transition-all
                "
              >
                <Search className="w-5 h-5" />
                Start Exploring
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-primary/60 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">Search Movies</h3>
              <p className="text-muted-foreground">
                Access a vast database of films with detailed information,
                ratings, and cast details
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-primary/60 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/15 ring-1 ring-accent/25 flex items-center justify-center mb-4">
                <Folder className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                Custom Collections
              </h3>
              <p className="text-muted-foreground">
                Create and organize your own movie collections for any occasion
                or theme
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-2xl border border-border hover:border-primary/60 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary-glow/15 ring-1 ring-primary/25 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">Track Favorites</h3>
              <p className="text-muted-foreground">
                Keep all your favorite movies organized and easily accessible in
                one place
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="bg-gradient-primary rounded-3xl p-10 md:p-12 text-center border border-white/10">
            <Film className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Your Collection?
            </h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of movie enthusiasts organizing their favorite
              films
            </p>
            <Link href="/search">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 rounded-full px-6 py-6"
              >
                <Search className="w-5 h-5" />
                Browse Movies Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 CineVault. Powered by TMDB.</p>
        </div>
      </footer>
    </div>
  );
}