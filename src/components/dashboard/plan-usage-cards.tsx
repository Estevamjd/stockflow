"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Package, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
}

function UsageItem({ label, current, limit, percentage, icon, color }: UsageItemProps) {
  const isHigh = percentage >= 80;
  const isFull = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <div className={cn("p-1.5 rounded-md", color)}>{icon}</div>
          {label}
        </div>
        <span className={cn(
          "font-bold",
          isFull ? "text-destructive" : isHigh ? "text-orange-500" : "text-foreground"
        )}>
          {current} / {limit >= 999999 ? "∞" : limit}
        </span>
      </div>
      <Progress 
        value={Math.min(percentage, 100)} 
        className={cn(
          "h-2 bg-secondary",
          isFull ? "bg-destructive/20" : ""
        )}
        // progressClassName={cn(
        //   isFull ? "bg-destructive" : isHigh ? "bg-orange-500" : "bg-primary"
        // )}
      />
    </div>
  );
}

interface PlanUsageStats {
  plan: string;
  products: { current: number; limit: number; percentage: number };
  users: { current: number; limit: number; percentage: number };
  salesThisMonth: { current: number; limit: number; percentage: number };
}

export function PlanUsageCards({ stats }: { stats: PlanUsageStats | null }) {
  if (!stats) return null;

  const { plan, products, users, salesThisMonth } = stats;

  return (
    <Card className="border-none bg-gradient-to-br from-indigo-50/50 to-white shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4">
        <Badge variant={plan === "FREE" ? "secondary" : "default"} className="font-bold tracking-wider">
          PLANO {plan}
        </Badge>
      </div>
      
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          Uso do Plano
        </CardTitle>
        <CardDescription>
          Acompanhe os limites de consumo do seu tenant.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <UsageItem 
          label="Produtos" 
          current={products.current} 
          limit={products.limit} 
          percentage={products.percentage}
          icon={<Package className="h-4 w-4 text-indigo-600" />}
          color="bg-indigo-100"
        />
        
        <UsageItem 
          label="Vendas (Mês)" 
          current={salesThisMonth.current} 
          limit={salesThisMonth.limit} 
          percentage={salesThisMonth.percentage}
          icon={<ShoppingBag className="h-4 w-4 text-emerald-600" />}
          color="bg-emerald-100"
        />

        <UsageItem 
          label="Usuários" 
          current={users.current} 
          limit={users.limit} 
          percentage={users.percentage}
          icon={<Users className="h-4 w-4 text-violet-600" />}
          color="bg-violet-100"
        />

        {stats.products.percentage >= 80 && (
          <div className="pt-2">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md group transition-all">
              <Zap className="mr-2 h-4 w-4 group-hover:animate-pulse" />
              Fazer Upgrade Agora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
