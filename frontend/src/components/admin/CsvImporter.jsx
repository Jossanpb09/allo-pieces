import { useState, useRef } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { adminApi, API } from "@/lib/adminApi";

const CsvImporter = ({ onImported }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/admin/products/csv-template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-produits-allopieces76.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur téléchargement modèle");
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setPreview(null);
    try {
      const res = await adminApi.post("/admin/products/csv-preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPreview(res.data);
      toast.success(`${res.data.valid_count} ligne(s) prête(s) à importer`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la lecture du CSV");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!preview?.rows?.length) return;
    setImporting(true);
    try {
      const res = await adminApi.post("/admin/products/csv-import-confirm", { rows: preview.rows });
      toast.success(`Import terminé: ${res.data.inserted} créés, ${res.data.updated} mis à jour, ${res.data.failed} échecs`);
      setPreview(null);
      onImported?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = async () => {
    if (!preview?.errors?.length) return;
    try {
      const res = await adminApi.post("/admin/products/csv-error-report", preview.errors, {
        responseType: "blob"
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rapport-erreurs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur téléchargement rapport");
    }
  };

  return (
    <Card data-testid="csv-importer">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-red-600" />
          Importer des produits depuis un fichier CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-bold text-blue-900 mb-2">Aide : comment importer ?</p>
          <ol className="list-decimal pl-5 space-y-1 text-blue-800">
            <li>Téléchargez le modèle CSV ci-dessous (colonnes attendues)</li>
            <li>Remplissez vos produits dans Excel/LibreOffice puis enregistrez en CSV</li>
            <li>Importez le fichier et vérifiez le rapport avant validation</li>
          </ol>
          <p className="text-blue-700 mt-2 text-xs">Colonnes : reference, name, price, stock, category, vehicle. Séparateur : virgule ou point-virgule.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} data-testid="download-template-btn">
            <Download className="h-4 w-4 mr-2" /> Télécharger le modèle CSV
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="upload-csv-btn">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Choisir un fichier CSV
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            data-testid="csv-file-input"
          />
        </div>

        {preview && (
          <div className="space-y-4 mt-4" data-testid="csv-preview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{preview.valid_count}</p>
                <p className="text-xs text-green-800">Lignes valides</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{preview.existing_count}</p>
                <p className="text-xs text-amber-800">Mises à jour (réf. existante)</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{preview.error_count}</p>
                <p className="text-xs text-red-800">Lignes en erreur</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{preview.total_lines}</p>
                <p className="text-xs text-gray-600">Total lignes</p>
              </div>
            </div>

            <div className="text-xs bg-gray-50 rounded p-3 border">
              <strong>Mapping détecté :</strong>{" "}
              {Object.entries(preview.mapping).map(([k, v]) => (
                <Badge key={k} variant="outline" className="ml-1">{k} ← {v}</Badge>
              ))}
            </div>

            {preview.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {preview.errors.length} erreur(s) détectée(s)
                  </p>
                  <Button size="sm" variant="outline" onClick={downloadErrorReport} data-testid="download-errors-btn">
                    <Download className="h-3 w-3 mr-1" /> Rapport erreurs
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto text-xs">
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <div key={i} className="py-1 border-b border-red-200 last:border-0">
                      <span className="font-mono">Ligne {e.row}</span> · <span className="font-bold">{e.field}</span> : {e.message}
                    </div>
                  ))}
                  {preview.errors.length > 20 && <p className="text-red-700 italic mt-1">... et {preview.errors.length - 20} autres erreurs</p>}
                </div>
              </div>
            )}

            {preview.valid_count > 0 && (
              <>
                <p className="font-bold text-sm">Aperçu (10 premières lignes) :</p>
                <div className="overflow-x-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Réf.</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Véhicule</TableHead>
                        <TableHead>État</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.slice(0, 10).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{r.name}</TableCell>
                          <TableCell>{Number(r.price).toFixed(2)} €</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.stock}</Badge></TableCell>
                          <TableCell className="text-xs">{r.category || "-"}</TableCell>
                          <TableCell className="text-xs">{r.vehicle || "-"}</TableCell>
                          <TableCell>
                            {r.already_exists ? (
                              <Badge className="bg-amber-500 text-xs"><RefreshCw className="h-3 w-3 mr-1" />MAJ</Badge>
                            ) : (
                              <Badge className="bg-green-500 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Nouveau</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setPreview(null)}>Annuler</Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={confirmImport} disabled={importing} data-testid="confirm-import-btn">
                    {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Valider l'import de {preview.valid_count} ligne(s)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CsvImporter;
