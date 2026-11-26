import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { getProductAnalytics } from "@/server/admin/analytics";
import { formatINR } from "@/lib/utils";

type Row = Awaited<ReturnType<typeof getProductAnalytics>>["popular"][number];

function ProductTable({ title, rows, metric }: { title: string; rows: Row[]; metric: (r: Row) => string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5 text-sm">
              <span className="bg-brand-gradient grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white">{i + 1}</span>
              <Link href={`/product/${p.slug}`} className="line-clamp-1 flex-1 font-medium hover:text-primary">{p.name}</Link>
              {p.offers[0] && <><RetailerLogo retailer={p.offers[0].retailer} size="sm" /><span className="font-semibold">{formatINR(Number(p.offers[0].price))}</span></>}
              <span className="w-24 text-right text-xs text-muted-foreground">{metric(p)}</span>
            </li>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">No data yet.</p>}
        </ol>
      </CardContent>
    </Card>
  );
}

export default async function AdminProducts() {
  const { popular, compared, watched } = await getProductAnalytics();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ProductTable title="Most viewed products" rows={popular} metric={(p) => `${p.viewCount} views`} />
      <ProductTable title="Most compared products" rows={compared} metric={(p) => `${p.compareCount} compares`} />
      <ProductTable title="Most watched (alerts)" rows={watched} metric={(p) => `${p._count.alerts} alerts · ${p._count.wishlist} ♥`} />
    </div>
  );
}
