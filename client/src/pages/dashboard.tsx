import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { formatFCFA, formatDate } from "@/lib/utils";
import { Package, Users, FolderTree, TrendingUp, Activity } from "lucide-react";
import type { ModificationLog } from "@shared/schema";

interface DashboardStats {
  totalProduits: number;
  totalFournisseurs: number;
  totalCategories: number;
  prixMoyenHT: number;
  recentModifications: ModificationLog[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return <LoadingState message="Chargement du tableau de bord..." />;
  }

  const statCards = [
    {
      title: "Produits",
      value: stats?.totalProduits ?? 0,
      description: "produits référencés",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Fournisseurs",
      value: stats?.totalFournisseurs ?? 0,
      description: "fournisseurs actifs",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Catégories",
      value: stats?.totalCategories ?? 0,
      description: "catégories de produits",
      icon: FolderTree,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Prix moyen HT",
      value: formatFCFA(stats?.prixMoyenHT ?? 0),
      description: "tous produits confondus",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      isPrice: true,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du référentiel prix Filtreplante"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.isPrice ? "text-lg" : ""}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Activité récente</CardTitle>
          </div>
          <CardDescription>
            Dernières modifications dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentModifications && stats.recentModifications.length > 0 ? (
            <div className="space-y-3">
              {stats.recentModifications.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`log-item-${log.id}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {log.action} sur {log.tableName}
                      {log.champModifie && (
                        <span className="text-muted-foreground">
                          {" "}({log.champModifie})
                        </span>
                      )}
                    </p>
                    {log.ancienneValeur && log.nouvelleValeur && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.ancienneValeur} → {log.nouvelleValeur}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.dateModification)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune activité récente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
