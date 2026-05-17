import { useState, useEffect } from "react";
import { Eye, Trash2, Loader2, Briefcase, Phone, Mail, MapPin, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: "En attente", cls: "bg-amber-500 text-white" },
    approved: { label: "Approuvée", cls: "bg-green-500 text-white" },
    rejected: { label: "Rejetée", cls: "bg-red-500 text-white" }
  };
  const cfg = map[status] || map.pending;
  return <Badge className={cfg.cls}>{cfg.label}</Badge>;
};

const ProRegistrationsManagement = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/admin/pro-registrations");
      setList(res.data);
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const openDetail = (r) => {
    setSelected(r);
    setStatus(r.status);
    setNotes(r.admin_notes || "");
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.put(`/admin/pro-registrations/${selected.id}`, { status, admin_notes: notes });
      toast.success("Mis à jour");
      setOpen(false);
      fetchList();
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  };

  const remove = async (r) => {
    if (!window.confirm(`Supprimer la demande de "${r.garage_name}" ?`)) return;
    try { await adminApi.delete(`/admin/pro-registrations/${r.id}`); toast.success("Supprimée"); fetchList(); }
    catch { toast.error("Erreur"); }
  };

  const pending = list.filter((r) => r.status === "pending").length;

  return (
    <div data-testid="pro-registrations">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5" /> Demandes d'inscription Pro</h2>
        {pending > 0 && <Badge className="bg-amber-500 text-white">{pending} en attente</Badge>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Date</TableHead>
                <TableHead>Garage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Aucune demande pour le moment.</TableCell></TableRow>
              ) : list.map((r) => (
                <TableRow key={r.id} className={r.status === "pending" ? "bg-amber-50" : ""} data-testid={`pro-row-${r.id}`}>
                  <TableCell className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{r.garage_name}</TableCell>
                  <TableCell>{r.contact_name}</TableCell>
                  <TableCell><a href={`tel:${r.phone}`} className="text-blue-600 hover:underline">{r.phone}</a></TableCell>
                  <TableCell><a href={`mailto:${r.email}`} className="text-blue-600 hover:underline text-xs">{r.email}</a></TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(r)} data-testid={`view-pro-${r.id}`}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="pro-detail-dialog">
          <DialogHeader><DialogTitle>Demande d'inscription Pro</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-gray-500">Garage</Label><p className="font-bold">{selected.garage_name}</p></div>
                <div><Label className="text-xs text-gray-500">Contact</Label><p>{selected.contact_name}</p></div>
                <div><Label className="text-xs text-gray-500">Téléphone</Label><a href={`tel:${selected.phone}`} className="text-blue-600 flex items-center gap-1"><Phone className="h-3 w-3" />{selected.phone}</a></div>
                <div><Label className="text-xs text-gray-500">Email</Label><a href={`mailto:${selected.email}`} className="text-blue-600 flex items-center gap-1"><Mail className="h-3 w-3" />{selected.email}</a></div>
              </div>
              {selected.siret && <div><Label className="text-xs text-gray-500">SIRET</Label><p className="font-mono">{selected.siret}</p></div>}
              {selected.activity && <div><Label className="text-xs text-gray-500">Activité</Label><p>{selected.activity}</p></div>}
              {selected.address && <div><Label className="text-xs text-gray-500">Adresse</Label><p className="flex items-start gap-1"><MapPin className="h-3 w-3 mt-1 flex-shrink-0" />{selected.address}</p></div>}
              {selected.delivery_address && <div><Label className="text-xs text-gray-500">Adresse livraison</Label><p>{selected.delivery_address}</p></div>}
              {selected.notes && <div><Label className="text-xs text-gray-500">Message</Label><p className="bg-gray-50 p-2 rounded text-xs">{selected.notes}</p></div>}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvée</SelectItem>
                      <SelectItem value="rejected">Rejetée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <a href={`https://wa.me/${selected.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${selected.contact_name}, votre demande Pro chez ALLO PIECES 76 a été reçue.`)}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3 w-3 mr-1 text-green-600" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
              <div>
                <Label>Notes internes</Label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[60px] p-2 border rounded text-sm" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving} data-testid="pro-save-btn">{saving ? "..." : "Sauvegarder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProRegistrationsManagement;
