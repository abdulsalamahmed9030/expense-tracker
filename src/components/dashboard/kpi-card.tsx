import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="min-w-0 w-full rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground sm:text-base">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold leading-tight sm:text-2xl">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
