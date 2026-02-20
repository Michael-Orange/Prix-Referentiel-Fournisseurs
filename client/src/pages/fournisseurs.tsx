import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { RegimeBadge } from "@/components/tva-badge";
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
import type { FournisseurWithStats } from "@shared/schema";

export default function Fournisseurs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRegime, setFilterRegime] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<FournisseurWithStats | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FournisseurWithStats | null>(null);

  const [formData, setFormData] = useState({
    nom: "",
    contact: "",
    telephone: "",
    email: "",
    adresse: "",
    statutTva: "tva_18",
    actif: true,
  });

  const { data: fournisseurs = [], isLoading } = useQuery<FournisseurWithStats[]>({
    queryKey: ["/api/fournisseurs"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/fournisseurs", data),
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
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
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
      toast({ title: "Fournisseur supprimé" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingFournisseur(null);
    setFormData({ nom: "", contact: "", telephone: "", email: "", adresse: "", statutTva: "tva_18", actif: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (f: FournisseurWithStats) => {
    setEditingFournisseur(f);
    setFormData({
      nom: f.nom,
      contact: f.contact || "",
      telephone: f.telephone || "",
      email: f.email || "",
      adresse: f.adresse || "",
      statutTva: f.statutTva,
      actif: f.actif,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingFournisseur(null);
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
    const matchRegime = filterRegime === "all" || f.statutTva === filterRegime;
    return matchSearch && matchRegime;
  });

  const columns = [
    {
      key: "nom",
      header: "Nom",
      render: (f: FournisseurWithStats) => <span className="font-medium" data-testid={`text-fournisseur-${f.id}`}>{f.nom}</span>,
    },
    {
      key: "regime",
      header: "Régime fiscal",
      render: (f: FournisseurWithStats) => <RegimeBadge regime={f.statutTva} />,
    },
    {
      key: "produits",
      header: "Produits",
      render: (f: FournisseurWithStats) => (
        <span className="text-muted-foreground">{f.produitsCount ?? 0}</span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (f: FournisseurWithStats) => (
        <span className="text-sm text-muted-foreground">{f.telephone || f.email || "-"}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (f: FournisseurWithStats) => <StatusBadge actif={f.actif} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (f: FournisseurWithStats) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(f); }} data-testid={`button-edit-${f.id}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(f); }} data-testid={`button-delete-${f.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Fournisseurs" description="Gérez vos fournisseurs et leur régime fiscal">
        <Button onClick={openCreateDialog} data-testid="button-add-fournisseur">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un fournisseur
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un fournisseur..." className="flex-1 max-w-sm" />
        <Select value={filterRegime} onValueChange={setFilterRegime}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-regime">
            <SelectValue placeholder="Régime fiscal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les régimes</SelectItem>
            <SelectItem value="tva_18">TVA 18%</SelectItem>
            <SelectItem value="sans_tva">Sans TVA</SelectItem>
            <SelectItem value="brs_5">BRS 5%</SelectItem>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
            <DialogDescription>
              {editingFournisseur ? "Modifiez les informations du fournisseur" : "Ajoutez un nouveau fournisseur à votre référentiel"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du fournisseur *</Label>
              <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="Ex: ABC Matériaux" data-testid="input-nom" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regime">Régime fiscal *</Label>
              <Select value={formData.statutTva} onValueChange={(v) => setFormData({ ...formData, statutTva: v })}>
                <SelectTrigger data-testid="select-regime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tva_18">TVA 18% - Fournisseur officiel</SelectItem>
                  <SelectItem value="sans_tva">Sans TVA - Fournisseur informel</SelectItem>
                  <SelectItem value="brs_5">BRS 5% - Bénéfice Réel Simplifié</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Input id="contact" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Nom contact" data-testid="input-contact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} placeholder="+221 ..." data-testid="input-telephone" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemple.com" data-testid="input-email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} placeholder="Adresse" data-testid="input-adresse" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="actif">Statut actif</Label>
              <Switch id="actif" checked={formData.actif} onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })} data-testid="switch-actif" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
              <Button type="submit" disabled={!formData.nom.trim() || createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
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
