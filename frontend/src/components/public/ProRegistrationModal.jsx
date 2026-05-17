import { useState } from "react";
import axios from "axios";
import { Briefcase, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyForm = {
  garage_name: "",
  contact_name: "",
  phone: "",
  email: "",
  siret: "",
  activity: "",
  address: "",
  delivery_address: "",
  notes: ""
};

const ProRegistrationModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waUrl, setWaUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ["garage_name", "contact_name", "phone", "email"];
    if (required.some((k) => !formData[k].trim())) {
      toast.error("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/pro-registrations`, formData);
      setSuccess(true);
      setWaUrl(res.data.whatsapp_notification_url);
      toast.success("Demande envoyée !");
      setTimeout(() => {
        setFormData(emptyForm);
      }, 200);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi");
    } finally { setLoading(false); }
  };

  const close = () => {
    setSuccess(false);
    setWaUrl(null);
    setFormData(emptyForm);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="pro-registration-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-red-600" />
            Espace Pro / Garage
          </DialogTitle>
          <DialogDescription>
            Garagistes, carrossiers ou revendeurs : bénéficiez de tarifs préférentiels et d'un accompagnement dédié. Remplissez ce formulaire et nous reviendrons vers vous rapidement.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Demande envoyée !</h3>
            <p className="text-gray-500 mb-4">Notre équipe vous contactera très rapidement par téléphone ou email.</p>
            {waUrl && (
              <Button asChild className="btn-whatsapp text-white">
                <a href={waUrl} target="_blank" rel="noopener noreferrer" data-testid="pro-whatsapp-notify">
                  📱 Notifier l'équipe via WhatsApp
                </a>
              </Button>
            )}
            <div className="mt-4">
              <Button variant="outline" onClick={close}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nom du garage *</Label>
                <Input value={formData.garage_name} onChange={(e) => setFormData({ ...formData, garage_name: e.target.value })} required data-testid="pro-garage-input" />
              </div>
              <div>
                <Label>Personne contact *</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} required data-testid="pro-contact-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Téléphone *</Label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="06 12 34 56 78" required data-testid="pro-phone-input" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required data-testid="pro-email-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>SIRET (optionnel)</Label>
                <Input value={formData.siret} onChange={(e) => setFormData({ ...formData, siret: e.target.value })} placeholder="14 chiffres" />
              </div>
              <div>
                <Label>Activité</Label>
                <Input value={formData.activity} onChange={(e) => setFormData({ ...formData, activity: e.target.value })} placeholder="Carrossier, garagiste, revendeur..." />
              </div>
            </div>
            <div>
              <Label>Adresse du garage</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="N° rue, ville, CP" />
            </div>
            <div>
              <Label>Adresse de livraison (si différente)</Label>
              <Input value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} />
            </div>
            <div>
              <Label>Message (optionnel)</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Type de véhicules travaillés, fréquence de commande, etc."
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-bold"
              data-testid="pro-submit-btn"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              {loading ? "Envoi en cours..." : "Envoyer ma demande Pro"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              📧 Réponse rapide par téléphone ou email. Vos données restent confidentielles.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProRegistrationModal;
