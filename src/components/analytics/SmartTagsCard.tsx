import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '../../lib/formatCurrency';

interface SmartTagsCardProps {
  tagData: [string, number][];
  currency: string;
}

export function SmartTagsCard({ tagData, currency }: SmartTagsCardProps) {
  if (tagData.length === 0) return null;

  return (
    <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Hashtag Breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">Spending organized by custom tags</p>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-1">
        {tagData.slice(0, 6).map(([tag, amount]) => (
          <div key={tag} className="flex justify-between items-center p-2.5 rounded-2xl bg-secondary/40 border border-border/40">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
              {tag}
            </span>
            <span className="text-xs font-semibold">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
