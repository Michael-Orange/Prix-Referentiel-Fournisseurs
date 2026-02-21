import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FolderTree, ArrowRight, Plus } from "lucide-react";
import type { Categorie, SousSectionDynamic } from "@shared/schema";

type CategorieWithCount = Categorie & { count: number };

export default function Categories() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [isAddCatDialogOpen, setIsAddCatDialogOpen] = useState(false);
  const [newCategorieName, setNewCategorieName] = useState("");

  const { data, isLoading } = useQuery<{ categories: CategorieWithCount[] }>({
    queryKey: ["/api/referentiel/categories"],
  });
  const categories = data?.categories ?? [];

  const { data: sousSectionsData } = useQuery<SousSectionDynamic[]>({
    queryKey: ["/api/referentiel/sous-sections"],
  });
  const sousSections = sousSectionsData ?? [];

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

  const createCategorieMutation = useMutation({
    mutationFn: async (nom: string) => {
      return apiRequest("POST", "/api/referentiel/categories", { nom });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/categories"] });
      toast({ title: "Catégorie créée avec succès" });
      setIsAddCatDialogOpen(false);
      setNewCategorieName("");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la catégorie",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingState message="Chargement des catégories..." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Catégories"
          description={`${categories.length} catégories de produits`}
        />
        <Button
          onClick={() => setIsAddCatDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-add-categorie"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une catégorie
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          description="Cliquez sur 'Ajouter une catégorie' pour commencer"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const catSousSections = sousSections.filter(ss => ss.categorie === category.nom);
            return (
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

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
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

                      {catSousSections.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {catSousSections.map(ss => (
                            <Badge key={ss.id} variant="outline" className="text-xs" data-testid={`badge-ss-${ss.id}`}>
                              {ss.nom}
                            </Badge>
                          ))}
                        </div>
                      )}
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
            );
          })}
        </div>
      )}

      <Dialog open={isAddCatDialogOpen} onOpenChange={setIsAddCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle catégorie de produits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nom-categorie">Nom de la catégorie *</Label>
              <Input
                id="nom-categorie"
                placeholder="Ex: Plomberie et Irrigation"
                value={newCategorieName}
                onChange={(e) => setNewCategorieName(e.target.value)}
                autoFocus
                data-testid="input-new-categorie-nom"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCatDialogOpen(false);
                setNewCategorieName("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => createCategorieMutation.mutate(newCategorieName.trim())}
              disabled={!newCategorieName.trim() || createCategorieMutation.isPending}
              data-testid="button-submit-categorie"
            >
              {createCategorieMutation.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
