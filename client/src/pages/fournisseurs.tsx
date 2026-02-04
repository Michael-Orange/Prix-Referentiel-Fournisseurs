import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { TVABadge } from "@/components/tva-badge";
import { StatusBadge } from "@/components/status-badge";
import { SearchInput } from "@/components/search-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { FournisseurWithStats, InsertFournisseur } from "@shared/schema";

export default function Fournisseurs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterTVA, setFilterTVA] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<FournisseurWithStats | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FournisseurWithStats | null>(null);

  const [formData, setFormData] = useState({
    nom: "",
    tvaApplicable: true,
    actif: true,
  });

  const { data: fournisseurs = [], isLoading } = useQuery<FournisseurWithStats[]>({
    queryKey: ["/api/fournisseurs"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertFournisseur) => apiRequest("POST", "/api/fournisseurs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fournisseurs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Fournisseur créé", description: "Le fournisseur a été ajouté avec succès" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le fournisseur", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertFournisseur> }) =>
      apiRequest("PATCH", `/api/fournisseurs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fournisseurs"] });
      toast({ title: "Fournisseur modifié", description: "Les modifications ont été enregistrées" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le fournisseur", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/fournisseurs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fournisseurs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Fournisseur supprimé", description: "Le fournisseur a été supprimé" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingFournisseur(null);
    setFormData({ nom: "", tvaApplicable: true, actif: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (fournisseur: FournisseurWithStats) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom,
      tvaApplicable: fournisseur.tvaApplicable,
      actif: fournisseur.actif,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingFournisseur(null);
    setFormData({ nom: "", tvaApplicable: true, actif: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) return;

    if (editingFournisseur) {
      updateMutation.mutate({ id: editingFournisseur.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredFournisseurs = fournisseurs.filter((f) => {
    const matchSearch = f.nom.toLowerCase().includes(search.toLowerCase());
    const matchTVA =
      filterTVA === "all" ||
      (filterTVA === "tva" && f.tvaApplicable) ||
      (filterTVA === "no-tva" && !f.tvaApplicable);
    return matchSearch && matchTVA;
  });

  const columns = [
    {
      key: "nom",
      header: "Nom",
      render: (f: FournisseurWithStats) => (
        <span className="font-medium">{f.nom}</span>
      ),
    },
    {
      key: "tva",
      header: "TVA",
      render: (f: FournisseurWithStats) => <TVABadge tvaApplicable={f.tvaApplicable} />,
    },
    {
      key: "produits",
      header: "Produits",
      render: (f: FournisseurWithStats) => (
        <span className="text-muted-foreground">{f.produitsCount ?? 0}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (f: FournisseurWithStats) => <StatusBadge actif={f.actif} />,
    },
    {
      key: "dateCreation",
      header: "Date création",
      render: (f: FournisseurWithStats) => (
        <span className="text-muted-foreground text-sm">{formatDate(f.dateCreation)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (f: FournisseurWithStats) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(f);
            }}
            data-testid={`button-edit-${f.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(f);
            }}
            data-testid={`button-delete-${f.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Fournisseurs"
        description="Gérez vos fournisseurs et leur statut TVA"
      >
        <Button onClick={openCreateDialog} data-testid="button-add-fournisseur">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un fournisseur
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un fournisseur..."
          className="flex-1 max-w-sm"
        />
        <Select value={filterTVA} onValueChange={setFilterTVA}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-tva">
            <SelectValue placeholder="Filtrer par TVA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="tva">Avec TVA</SelectItem>
            <SelectItem value="no-tva">Sans TVA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredFournisseurs}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="Aucun fournisseur"
        emptyDescription="Commencez par ajouter votre premier fournisseur"
        emptyActionLabel="Ajouter un fournisseur"
        onEmptyAction={openCreateDialog}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </DialogTitle>
            <DialogDescription>
              {editingFournisseur
                ? "Modifiez les informations du fournisseur"
                : "Ajoutez un nouveau fournisseur à votre référentiel"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du fournisseur *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: ABC Matériaux"
                data-testid="input-nom"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="tva">Assujetti à la TVA</Label>
                <p className="text-xs text-muted-foreground">
                  Les fournisseurs informels ne sont pas assujettis à la TVA
                </p>
              </div>
              <Switch
                id="tva"
                checked={formData.tvaApplicable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, tvaApplicable: checked })
                }
                data-testid="switch-tva"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="actif">Statut actif</Label>
              <Switch
                id="actif"
                checked={formData.actif}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, actif: checked })
                }
                data-testid="switch-actif"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.nom.trim() ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                data-testid="button-submit"
              >
                {editingFournisseur ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Supprimer le fournisseur"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
        variant="destructive"
      />
    </div>
  );
}
