import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { Package, Users, FolderTree, TrendingUp, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalProduits: number;
  totalFournisseurs: number;
  totalCategories: number;
  produitsAvecPrix: number;
  produitsSansPrix: number;
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
      title: "Avec prix",
      value: stats?.produitsAvecPrix ?? 0,
      description: "produits avec tarification",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Sans prix",
      value: stats?.produitsSansPrix ?? 0,
      description: "produits à tarifer",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du référentiel prix Filtreplante"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
              <div className="text-2xl font-bold" data-testid={`text-stat-${card.title.toLowerCase().replace(/\s/g, "-")}`}>
                {card.value.toLocaleString("fr-FR")}
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
          <CardTitle className="text-lg">Régimes fiscaux sénégalais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="font-semibold text-blue-800">TVA 18%</div>
              <div className="text-sm text-blue-600 mt-1">Fournisseurs officiels avec TVA</div>
              <div className="text-xs text-blue-500 mt-2">Prix TTC = Prix HT × 1,18</div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="font-semibold text-green-800">Sans TVA</div>
              <div className="text-sm text-green-600 mt-1">Fournisseurs informels</div>
              <div className="text-xs text-green-500 mt-2">Prix TTC = Prix HT (pas de taxe)</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="font-semibold text-purple-800">BRS 5%</div>
              <div className="text-sm text-purple-600 mt-1">Bénéfice Réel Simplifié</div>
              <div className="text-xs text-purple-500 mt-2">Prix BRS = Prix HT / 0,95</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
