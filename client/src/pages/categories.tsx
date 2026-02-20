import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree } from "lucide-react";
import type { Categorie } from "@shared/schema";

export default function Categories() {
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
            <Card key={category.id} data-testid={`card-category-${category.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{category.nom}</CardTitle>
                  <Badge variant="outline">{category.ordreAffichage}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Catégorie #{category.id}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
