"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRetailer } from "@/features/retailers/retailers";

export function CreateAlertDialog({ productId, productName, currentPrice, retailers }: { productId: string; productName: string; currentPrice: number | null; retailers: string[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const suggested = currentPrice ? Math.round((currentPrice * 0.9) / 10) * 10 : "";
  const [target, setTarget] = useState(String(suggested));
  const [retailer, setRetailer] = useState("any");
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      api<{ id: string; updated: boolean; triggered: boolean }>("/api/alerts", {
        method: "POST",
        json: { productId, targetPrice: Number(target), retailer: retailer === "any" ? null : retailer, notifyEmail: email, notifyPush: push },
      }),
    onSuccess: (res) => {
      const verb = res.updated ? "Alert updated" : "Alert created";
      toast.success(res.triggered ? `${verb} – the price is already at your target! Check notifications.` : `${verb}: we'll notify you at ${formatINR(Number(target))}`);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create alert"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><BellPlus /> Price alert</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a price alert</DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!Number(target) || Number(target) <= 0) return toast.error("Enter a valid target price");
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="target">Notify me when price drops to</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-muted-foreground">₹</span>
              <Input id="target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))} className="pl-8 text-lg font-semibold" />
            </div>
            {currentPrice && <p className="text-xs text-muted-foreground">Current best price: {formatINR(currentPrice)}</p>}
          </div>
          <div className="space-y-2">
            <Label>Store</Label>
            <Select value={retailer} onValueChange={setRetailer}>
              <SelectTrigger className="w-full rounded-xl" aria-label="Store"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any store</SelectItem>
                {retailers.map((r) => <SelectItem key={r} value={r}>{getRetailer(r)?.name ?? r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
            <Label htmlFor="n-email">Email notification</Label>
            <Switch id="n-email" checked={email} onCheckedChange={setEmail} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
            <Label htmlFor="n-push">Browser push notification</Label>
            <Switch id="n-push" checked={push} onCheckedChange={setPush} />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />} Create alert
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
