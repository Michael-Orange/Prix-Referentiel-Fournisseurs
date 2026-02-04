import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import type { CategorieWithSousSections, InsertCategorie, InsertSousSection, SousSection } from "@shared/schema";

type DialogMode = "category" | "subsection" | null;

export default function Categories() {
  const { toast } = useToast();
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingCategory, setEditingCategory] = useState<CategorieWithSousSections | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<SousSection | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "subsection"; item: any } | null>(null);

  const [categoryForm, setCategoryForm] = useState({ nom: "", description: "" });
  const [subsectionForm, setSubsectionForm] = useState({ nom: "", description: "", categorieId: 0 });

  const { data: categories = [], isLoading } = useQuery<CategorieWithSousSections[]>({
    queryKey: ["/api/categories"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: InsertCategorie) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Catégorie créée", description: "La catégorie a été ajoutée avec succès" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la catégorie", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCategorie> }) =>
      apiRequest("PATCH", `/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Catégorie modifiée" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier la catégorie", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Catégorie supprimée" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer la catégorie", variant: "destructive" });
    },
  });

  const createSubsectionMutation = useMutation({
    mutationFn: (data: InsertSousSection) => apiRequest("POST", "/api/sous-sections", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Sous-section créée" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la sous-section", variant: "destructive" });
    },
  });

  const updateSubsectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSousSection> }) =>
      apiRequest("PATCH", `/api/sous-sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Sous-section modifiée" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier la sous-section", variant: "destructive" });
    },
  });

  const deleteSubsectionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sous-sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Sous-section supprimée" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer la sous-section", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ type, id, direction }: { type: "category" | "subsection"; id: number; direction: "up" | "down" }) =>
      apiRequest("POST", `/api/${type === "category" ? "categories" : "sous-sections"}/${id}/reorder`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const toggleCategory = (id: number) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenCategories(newOpen);
  };

  const openCategoryDialog = (category?: CategorieWithSousSections) => {
    setDialogMode("category");
    setEditingCategory(category || null);
    setCategoryForm({
      nom: category?.nom || "",
      description: category?.description || "",
    });
  };

  const openSubsectionDialog = (categorieId: number, subsection?: SousSection) => {
    setDialogMode("subsection");
    setSelectedCategoryId(categorieId);
    setEditingSubsection(subsection || null);
    setSubsectionForm({
      nom: subsection?.nom || "",
      description: subsection?.description || "",
      categorieId: categorieId,
    });
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingCategory(null);
    setEditingSubsection(null);
    setSelectedCategoryId(null);
    setCategoryForm({ nom: "", description: "" });
    setSubsectionForm({ nom: "", description: "", categorieId: 0 });
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nom.trim()) return;

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate({ ...categoryForm, ordre: categories.length });
    }
  };

  const handleSubsectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subsectionForm.nom.trim() || !selectedCategoryId) return;

    const category = categories.find((c) => c.id === selectedCategoryId);
    const ordre = category?.sousSections?.length || 0;

    if (editingSubsection) {
      updateSubsectionMutation.mutate({ id: editingSubsection.id, data: subsectionForm });
    } else {
      createSubsectionMutation.mutate({ ...subsectionForm, categorieId: selectedCategoryId, ordre });
    }
  };

  if (isLoading) {
    return <LoadingState message="Chargement des catégories..." />;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Catégories & Sous-sections"
        description="Organisez vos produits par catégories"
      >
        <Button onClick={() => openCategoryDialog()} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une catégorie
        </Button>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          description="Commencez par créer vos catégories de produits"
          actionLabel="Ajouter une catégorie"
          onAction={() => openCategoryDialog()}
        />
      ) : (
        <div className="space-y-4">
          {categories.map((category, catIndex) => (
            <Card key={category.id} data-testid={`card-category-${category.id}`}>
              <Collapsible
                open={openCategories.has(category.id)}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                      {openCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-base">{category.nom}</CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {category.produitsCount} produits
                      </Badge>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={catIndex === 0}
                        onClick={() => reorderMutation.mutate({ type: "category", id: category.id, direction: "up" })}
                        data-testid={`button-category-up-${category.id}`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={catIndex === categories.length - 1}
                        onClick={() => reorderMutation.mutate({ type: "category", id: category.id, direction: "down" })}
                        data-testid={`button-category-down-${category.id}`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCategoryDialog(category)}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm({ type: "category", item: category })}
                        data-testid={`button-delete-category-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground pl-6">{category.description}</p>
                  )}
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                      {category.sousSections?.map((subsection, subIndex) => (
                        <div
                          key={subsection.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50"
                          data-testid={`subsection-${subsection.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span>{subsection.nom}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={subIndex === 0}
                              onClick={() => reorderMutation.mutate({ type: "subsection", id: subsection.id, direction: "up" })}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={subIndex === (category.sousSections?.length || 0) - 1}
                              onClick={() => reorderMutation.mutate({ type: "subsection", id: subsection.id, direction: "down" })}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openSubsectionDialog(category.id, subsection)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteConfirm({ type: "subsection", item: subsection })}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => openSubsectionDialog(category.id)}
                        data-testid={`button-add-subsection-${category.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une sous-section
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogMode === "category"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifiez les informations de la catégorie"
                : "Créez une nouvelle catégorie de produits"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-nom">Nom *</Label>
              <Input
                id="cat-nom"
                value={categoryForm.nom}
                onChange={(e) => setCategoryForm({ ...categoryForm, nom: e.target.value })}
                placeholder="Ex: Plomberie et Irrigation"
                data-testid="input-category-nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Description optionnelle..."
                data-testid="input-category-description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!categoryForm.nom.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                data-testid="button-submit-category"
              >
                {editingCategory ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "subsection"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubsection ? "Modifier la sous-section" : "Nouvelle sous-section"}
            </DialogTitle>
            <DialogDescription>
              {editingSubsection
                ? "Modifiez les informations de la sous-section"
                : "Ajoutez une sous-section à la catégorie"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubsectionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-nom">Nom *</Label>
              <Input
                id="sub-nom"
                value={subsectionForm.nom}
                onChange={(e) => setSubsectionForm({ ...subsectionForm, nom: e.target.value })}
                placeholder="Ex: Tubes & tuyaux"
                data-testid="input-subsection-nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-desc">Description</Label>
              <Textarea
                id="sub-desc"
                value={subsectionForm.description}
                onChange={(e) => setSubsectionForm({ ...subsectionForm, description: e.target.value })}
                placeholder="Description optionnelle..."
                data-testid="input-subsection-description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!subsectionForm.nom.trim() || createSubsectionMutation.isPending || updateSubsectionMutation.isPending}
                data-testid="button-submit-subsection"
              >
                {editingSubsection ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={deleteConfirm?.type === "category" ? "Supprimer la catégorie" : "Supprimer la sous-section"}
        description={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.item?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (deleteConfirm?.type === "category") {
            deleteCategoryMutation.mutate(deleteConfirm.item.id);
          } else if (deleteConfirm?.type === "subsection") {
            deleteSubsectionMutation.mutate(deleteConfirm.item.id);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}
