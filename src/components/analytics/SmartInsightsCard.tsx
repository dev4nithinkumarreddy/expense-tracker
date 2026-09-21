import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Sparkles } from 'lucide-react';
import type { SmartInsight } from '../../lib/analytics';

interface SmartInsightsCardProps {
  smartInsights: SmartInsight[];
}

export function SmartInsightsCard({ smartInsights }: SmartInsightsCardProps) {
  if (smartInsights.length === 0) return null;

  return (
    <Card className="rounded-3xl border-primary/25 bg-primary/5 dark:bg-primary/10 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Smart Financial Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-1">
        {smartInsights.map(insight => (
          <div 
            key={insight.id} 
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              insight.type === 'warning' 
                ? 'bg-destructive/10 border-destructive/20 text-foreground'
                : insight.type === 'positive'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-foreground'
                  : 'bg-card/80 border-border/60 text-foreground'
            }`}
          >
            <span className="text-xl shrink-0 mt-0.5">{insight.icon}</span>
            <div>
              <p className="text-xs font-bold">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
