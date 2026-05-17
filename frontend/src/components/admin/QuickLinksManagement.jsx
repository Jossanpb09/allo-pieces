import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, ArrowUp, ArrowDown, Phone, MessageCircle, Mail, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";

const ICON_OPTIONS = [
  { value: "phone", label: "Téléphone", Icon: Phone },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "mail", label: "Email", Icon: Mail },
  { value: "leboncoin", label: "Leboncoin", Icon: ExternalLink },
  { value: "instagram", label: "Instagram", Icon: ExternalLink },
  { value: "facebook", label: "Facebook", Icon: ExternalLink },
  { value: "link", label: "Lien externe", Icon: LinkIcon }
];

const TYPE_OPTIONS = [
  { value: "phone", label: "Téléphone (tel:)" },
  { value: "whatsapp", label: "WhatsApp (wa.me/)" },
  { value: "mail", label: "Email (mailto:)" },
  { value: "url", label: "URL externe" }
];

const empty = { label: "", icon: "link", url: "", link_type: "url", active: true, order: 0 };

const QuickLinksManagement = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/admin/quicklinks");
      setList(res.data);
    } catch { toast.error("Erreur chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const openCreate = () => { setEditing(null); setFormData({ ...empty, order: list.length }); setOpen(true); };
  const openEdit = (l) => {
    setEditing(l);
    setFormData({ label: l.label, icon: l.icon, url: l.url, link_type: l.link_type, active: l.active, order: l.order });
    setOpen(true);
  };

  const save = async () => {
    if (!formData.label.trim() || !formData.url.trim()) { toast.error("Libellé et URL requis"); return; }
    setSaving(true);
    try {
      const payload = { ...formData, order: Number(formData.order) || 0 };
      if (editing) { await adminApi.put(`/admin/quicklinks/${editing.id}`, payload); toast.success("Modifié"); }
      else { await adminApi.post("/admin/quicklinks", payload); toast.success("Ajouté"); }
      setOpen(false);
      fetchList();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (l) => {
    try { await adminApi.put(`/admin/quicklinks/${l.id}`, { active: !l.active }); fetchList(); }
    catch { toast.error("Erreur"); }
  };

  const remove = async (l) => {
    if (!window.confirm(`Supprimer le lien "${l.label}" ?`)) return;
    try { await adminApi.delete(`/admin/quicklinks/${l.id}`); toast.success("Supprimé"); fetchList(); }
    catch { toast.error("Erreur"); }
  };

  const move = async (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setList(reordered);
    try {
      await adminApi.post("/admin/quicklinks/reorder", { ids: reordered.map((l) => l.id) });
    } catch { toast.error("Erreur réordonnancement"); fetchList(); }
  };

  return (
    <div data-testid="quicklinks-management">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl font-bold">Liens rapides (boutons contact)</h2>
        <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate} data-testid="add-quicklink-btn">
          <Plus className="h-4 w-4 mr-2" /> Nouveau lien
        </Button>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Ces liens apparaissent dans l'en-tête et le pied du site. Vous pouvez les activer/désactiver ou les réordonner.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-20">Ordre</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URL/Numéro</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Aucun lien</TableCell></TableRow>
              ) : list.map((l, idx) => (
                <TableRow key={l.id} data-testid={`quicklink-row-${l.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" disabled={idx === list.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{l.label}</TableCell>
                  <TableCell><span className="text-xs">{TYPE_OPTIONS.find((t) => t.value === l.link_type)?.label}</span></TableCell>
                  <TableCell className="font-mono text-xs">{l.url}</TableCell>
                  <TableCell><Switch checked={l.active} onCheckedChange={() => toggleActive(l)} data-testid={`quicklink-toggle-${l.id}`} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(l)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="quicklink-dialog">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau"} lien rapide</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Libellé visible *</Label>
              <Input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} placeholder="Ex: WhatsApp Pro" data-testid="quicklink-label-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type de lien</Label>
                <Select value={formData.link_type} onValueChange={(v) => setFormData({ ...formData, link_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icône</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ICON_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>URL / Numéro *</Label>
              <Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="Ex: +33686721372, https://..., contact@..." data-testid="quicklink-url-input" />
              <p className="text-xs text-gray-500 mt-1">
                Téléphone/WhatsApp: format international (+33...). Email: adresse complète. URL: https://...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.active} onCheckedChange={(v) => setFormData({ ...formData, active: v })} />
              <Label>Actif (visible sur le site)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving} data-testid="quicklink-save-btn">
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickLinksManagement;
