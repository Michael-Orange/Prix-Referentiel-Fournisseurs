import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Info } from "lucide-react";

export default function Historique() {
  return (
    <div className="p-6">
      <PageHeader
        title="Historique des prix"
        description="Suivi automatique des modifications de prix via trigger PostgreSQL"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Historique automatique</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            L'historique des prix est géré automatiquement par un trigger PostgreSQL. 
            Chaque modification de prix (prix HT ou régime fiscal) est enregistrée dans la table 
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-sm">prix.historique_prix</code>.
          </p>
          <p className="text-muted-foreground mt-3">
            Pour consulter l'historique d'un prix spécifique, ouvrez le détail d'un produit 
            dans la page "Produits & Prix" et cliquez sur l'icône historique à côté du prix fournisseur.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start gap-3">
            <History className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Informations enregistrées :</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Prix HT ancien et nouveau</li>
                <li>Régime fiscal ancien et nouveau</li>
                <li>Date de modification</li>
                <li>Utilisateur ayant effectué la modification</li>
                <li>Raison de la modification (si renseignée)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
