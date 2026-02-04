import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";
import { History, Download, ArrowRight } from "lucide-react";
import type { ModificationLog } from "@shared/schema";

const tableNames = [
  { value: "all", label: "Toutes les tables" },
  { value: "fournisseurs", label: "Fournisseurs" },
  { value: "categories", label: "Catégories" },
  { value: "sous_sections", label: "Sous-sections" },
  { value: "produits", label: "Produits" },
  { value: "prix_fournisseurs", label: "Prix" },
];

const actionTypes = [
  { value: "all", label: "Toutes les actions" },
  { value: "CREATE", label: "Création" },
  { value: "UPDATE", label: "Modification" },
  { value: "DELETE", label: "Suppression" },
];

export default function Historique() {
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs = [], isLoading } = useQuery<ModificationLog[]>({
    queryKey: ["/api/logs", filterTable, filterAction, dateFrom, dateTo],
  });

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      search === "" ||
      log.tableName.toLowerCase().includes(search.toLowerCase()) ||
      log.champModifie?.toLowerCase().includes(search.toLowerCase()) ||
      log.ancienneValeur?.toLowerCase().includes(search.toLowerCase()) ||
      log.nouvelleValeur?.toLowerCase().includes(search.toLowerCase());
    const matchTable = filterTable === "all" || log.tableName === filterTable;
    const matchAction = filterAction === "all" || log.action === filterAction;
    return matchSearch && matchTable && matchAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-600">Création</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-600">Modification</Badge>;
      case "DELETE":
        return <Badge className="bg-red-600">Suppression</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getTableLabel = (tableName: string) => {
    const table = tableNames.find((t) => t.value === tableName);
    return table?.label || tableName;
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Table", "Action", "Champ", "Ancienne valeur", "Nouvelle valeur"];
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.dateModification),
      getTableLabel(log.tableName),
      log.action,
      log.champModifie || "",
      log.ancienneValeur || "",
      log.nouvelleValeur || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historique_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (log: ModificationLog) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDateTime(log.dateModification)}
        </span>
      ),
    },
    {
      key: "table",
      header: "Table",
      render: (log: ModificationLog) => (
        <Badge variant="outline">{getTableLabel(log.tableName)}</Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (log: ModificationLog) => getActionBadge(log.action),
    },
    {
      key: "champ",
      header: "Champ",
      render: (log: ModificationLog) => (
        <span className="text-sm">{log.champModifie || "-"}</span>
      ),
    },
    {
      key: "valeurs",
      header: "Modification",
      render: (log: ModificationLog) => {
        if (!log.ancienneValeur && !log.nouvelleValeur) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            {log.ancienneValeur && (
              <span className="text-muted-foreground line-through max-w-[120px] truncate">
                {log.ancienneValeur}
              </span>
            )}
            {log.ancienneValeur && log.nouvelleValeur && (
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {log.nouvelleValeur && (
              <span className="font-medium max-w-[120px] truncate">{log.nouvelleValeur}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Historique"
        description="Consultez l'historique des modifications"
      >
        <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher..."
            className="flex-1 max-w-sm"
          />
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-table">
              <SelectValue placeholder="Table" />
            </SelectTrigger>
            <SelectContent>
              {tableNames.map((table) => (
                <SelectItem key={table.value} value={table.value}>
                  {table.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-action">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-from" className="whitespace-nowrap">
              Du
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
              data-testid="input-date-from"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="date-to" className="whitespace-nowrap">
              Au
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
              data-testid="input-date-to"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        isLoading={isLoading}
        emptyIcon={History}
        emptyTitle="Aucune modification"
        emptyDescription="L'historique des modifications apparaîtra ici"
      />
    </div>
  );
}
