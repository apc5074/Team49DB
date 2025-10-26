import { headers } from "next/headers";
import Navigation from "@/components/Navigation";
import ExploreClient from "@/components/explore/ExploreClient";

export const dynamic = "force-dynamic";

function buildBaseUrl(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export default async function ExplorePage() {
  const h = await headers();
  const cookieHeader = h.get("cookie") ?? "";
  const base = buildBaseUrl(h);

  const qs = new URLSearchParams(h.get("x-search-params") ?? "");
  const res = await fetch(`${base}/api/explore?${qs.toString()}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  const initial = res.ok
    ? await res.json()
    : { total: 0, page: 1, pageSize: 20, items: [] };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <ExploreClient initial={initial} />
      </main>
    </>
  );
}
