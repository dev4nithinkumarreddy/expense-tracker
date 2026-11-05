import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';
import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import type { SmartInsight } from '../../lib/analytics';

function getInsightIcon(id: string, type: string) {
  switch (id) {
    case 'savings-great':
      return <SavingsOutlined className="w-5 h-5 text-emerald-500" fontSize="inherit" />;
    case 'savings-deficit':
      return <WarningAmberOutlined className="w-5 h-5 text-rose-500" fontSize="inherit" />;
    case 'top-category':
      return <BarChartOutlined className="w-5 h-5 text-blue-500" fontSize="inherit" />;
    case 'over-budget':
      return <ErrorOutlineOutlined className="w-5 h-5 text-rose-500" fontSize="inherit" />;
    case 'near-budget':
      return <HourglassEmptyOutlined className="w-5 h-5 text-amber-500" fontSize="inherit" />;
    case 'mom-improved':
      return <TrendingDownOutlined className="w-5 h-5 text-emerald-500" fontSize="inherit" />;
    case 'mom-increased':
      return <TrendingUpOutlined className="w-5 h-5 text-amber-500" fontSize="inherit" />;
    case 'largest-spend':
      return <LocalOfferOutlined className="w-5 h-5 text-purple-500" fontSize="inherit" />;
    default:
      return type === 'positive' 
        ? <SavingsOutlined className="w-5 h-5 text-emerald-500" fontSize="inherit" />
        : type === 'warning'
        ? <WarningAmberOutlined className="w-5 h-5 text-amber-500" fontSize="inherit" />
        : <AutoAwesomeOutlined className="w-5 h-5 text-primary" fontSize="inherit" />;
  }
}

interface SmartInsightsCardProps {
  smartInsights: SmartInsight[];
}

export function SmartInsightsCard({ smartInsights }: SmartInsightsCardProps) {
  if (smartInsights.length === 0) return null;

  return (
    <Card className="rounded-3xl border-primary/25 bg-primary/5 dark:bg-primary/10 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AutoAwesomeOutlined className="w-4 h-4 text-primary" fontSize="inherit" />
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
            <div className="w-8 h-8 rounded-xl bg-background/60 flex items-center justify-center shrink-0 border border-border/40">
              {getInsightIcon(insight.id, insight.type)}
            </div>
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
