import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FolderTree, ArrowRight } from "lucide-react";
import type { Categorie } from "@shared/schema";

type CategorieWithCount = Categorie & { count: number };

export default function Categories() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ categories: CategorieWithCount[] }>({
    queryKey: ["/api/referentiel/categories"],
  });

  const categories = data?.categories ?? [];

  const toggleStockableMutation = useMutation({
    mutationFn: async ({ id, estStockable }: { id: number; estStockable: boolean }) => {
      return apiRequest("PATCH", `/api/referentiel/categories/${id}/stockable`, { est_stockable: estStockable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      toast({ title: "Statut stockage mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <LoadingState message="Chargement des catégories..." />;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Catégories"
        description={`${categories.length} catégories de produits`}
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          description="Les catégories sont créées automatiquement lors de l'import"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary hover:-translate-y-0.5 group"
              role="button"
              tabIndex={0}
              aria-label={`Voir les produits de la catégorie ${category.nom}`}
              onClick={() => navigate(`/produits?categorie=${encodeURIComponent(category.nom)}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/produits?categorie=${encodeURIComponent(category.nom)}`);
                }
              }}
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors" data-testid={`text-category-nom-${category.id}`}>
                      {category.nom}
                    </h3>
                    <p className="text-sm text-gray-500">Catégorie #{category.ordreAffichage}</p>

                    <div className="mt-2">
                      <Badge
                        variant={category.estStockable ? "default" : "destructive"}
                        className={`cursor-pointer select-none ${
                          category.estStockable
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newValue = !category.estStockable;
                          const message = newValue
                            ? "Rendre cette catégorie stockable ? Les produits seront visibles dans l'app Stock."
                            : "Marquer cette catégorie comme NON stockable ? Les produits ne seront plus visibles dans l'app Stock.";

                          if (confirm(message)) {
                            toggleStockableMutation.mutate({ id: category.id, estStockable: newValue });
                          }
                        }}
                        data-testid={`badge-stockage-${category.id}`}
                      >
                        {category.estStockable ? "✓ Stockage" : "✗ Non stockage"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg font-semibold" data-testid={`badge-count-${category.id}`}>
                      {category.count}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
