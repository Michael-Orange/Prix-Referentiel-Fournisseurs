import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree, ArrowRight } from "lucide-react";
import type { Categorie } from "@shared/schema";

export default function Categories() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<{ categories: Categorie[] }>({
    queryKey: ["/api/referentiel/categories"],
  });

  const categories = data?.categories ?? [];

  if (isLoading) {
    return <LoadingState message="Chargement des catégories..." />;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Catégories"
        description="Catégories de produits extraites automatiquement du CSV"
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
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{category.nom}</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Catégorie #{category.id}
                  </p>
                  <Badge variant="outline">{category.ordreAffichage}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
