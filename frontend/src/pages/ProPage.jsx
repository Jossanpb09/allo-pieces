import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Car, Lock, ArrowLeft, FileText, Users, Star, Phone, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo component
const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="bg-red-600 rounded-md p-2">
      <Car className="h-6 w-6 text-white" />
    </div>
    <div className="font-heading font-bold text-xl uppercase tracking-tight">
      <span className="text-red-600">ALLO</span>
      <span className="text-white"> PIECES </span>
      <span className="text-red-600">76</span>
    </div>
  </div>
);

// Gatekeeper - Code entry
const ProGatekeeper = ({ onAccessGranted }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/pro/validate`, { code });
      if (response.data.valid) {
        toast.success("Accès autorisé");
        onAccessGranted();
      } else {
        setError("Code incorrect");
        toast.error("Code incorrect");
      }
    } catch (error) {
      setError("Erreur de validation");
      toast.error("Erreur de validation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pro-gatekeeper flex items-center justify-center p-4" data-testid="pro-gatekeeper">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-zinc-800 rounded-full p-4">
              <Lock className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-white font-heading text-2xl">Accès Privé</CardTitle>
          <p className="text-gray-400 text-sm mt-2">Entrez le code d'accès pour continuer</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code d'accès"
                className="bg-zinc-800 border-zinc-700 text-white text-center text-xl tracking-widest"
                required
                data-testid="pro-code-input"
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading} data-testid="pro-validate-btn">
              {loading ? "Vérification..." : "Valider"}
            </Button>
          </form>
          <Button variant="ghost" className="w-full mt-4 text-gray-400 hover:text-white" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour au site
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Pro Dashboard - Internal info
const ProDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950" data-testid="pro-dashboard">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase">Espace Pro</span>
          </div>
          <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour au site
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-bold text-white uppercase tracking-tight mb-8">
          Espace Professionnel
        </h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notes internes */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                Notes internes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <div className="bg-zinc-800 rounded-lg p-3">
                <h4 className="font-bold text-amber-400 mb-1">Procédure de commande</h4>
                <p className="text-sm text-gray-400">
                  1. Vérifier stock disponible<br />
                  2. Confirmer compatibilité avec plaque/VIN<br />
                  3. Envoyer devis au client<br />
                  4. Attendre confirmation + paiement
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <h4 className="font-bold text-amber-400 mb-1">Retours / SAV</h4>
                <p className="text-sm text-gray-400">
                  Délai retour: 14 jours<br />
                  Pièces dans emballage d'origine<br />
                  Remboursement sous 7 jours ouvrés
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informations fournisseurs */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                Fournisseurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h4 className="font-bold text-white">Fournisseur A - Carrosserie</h4>
                <div className="text-sm text-gray-400 mt-1 space-y-1">
                  <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> 01 23 45 67 89</p>
                  <p className="flex items-center gap-2"><Clock className="h-3 w-3" /> Lun-Ven 8h-17h</p>
                  <p className="flex items-center gap-2"><Truck className="h-3 w-3" /> Livraison J+1</p>
                </div>
              </div>
              <div className="border-b border-zinc-800 pb-3">
                <h4 className="font-bold text-white">Fournisseur B - Éclairage</h4>
                <div className="text-sm text-gray-400 mt-1 space-y-1">
                  <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> 01 98 76 54 32</p>
                  <p className="flex items-center gap-2"><Clock className="h-3 w-3" /> Lun-Ven 9h-18h</p>
                  <p className="flex items-center gap-2"><Truck className="h-3 w-3" /> Livraison J+2</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white">Fournisseur C - Mécanique</h4>
                <div className="text-sm text-gray-400 mt-1 space-y-1">
                  <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> 01 11 22 33 44</p>
                  <p className="flex items-center gap-2"><Clock className="h-3 w-3" /> Lun-Sam 8h-16h</p>
                  <p className="flex items-center gap-2"><Truck className="h-3 w-3" /> Livraison 24-48h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Références prioritaires */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Références prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">Pièces les plus demandées à garder en stock :</p>
              <ul className="space-y-2">
                {[
                  { ref: "PC-CLIO4-AV", name: "Pare-choc Clio 4" },
                  { ref: "PH-208-AVG", name: "Phare 208" },
                  { ref: "RV-GOLF7-D", name: "Rétro Golf 7" },
                  { ref: "RAD-C3-1.4", name: "Radiateur C3" },
                  { ref: "PC-308-AR", name: "Pare-choc 308" },
                  { ref: "FEU-POLO-ARD", name: "Feu arrière Polo" },
                  { ref: "CAP-206-AV", name: "Capot 206" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2">
                    <span className="font-mono text-amber-400 text-sm">{item.ref}</span>
                    <span className="text-gray-300 text-sm">{item.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="bg-zinc-900 border-zinc-800 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                Conditions & Informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-gray-300">
                <div>
                  <h4 className="font-bold text-white mb-2">Délais de livraison</h4>
                  <ul className="text-sm space-y-1 text-gray-400">
                    <li>• En stock : 24-48h</li>
                    <li>• Sur commande : 72h-5 jours</li>
                    <li>• Pièces rares : sur devis</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Modes de paiement</h4>
                  <ul className="text-sm space-y-1 text-gray-400">
                    <li>• CB / Virement bancaire</li>
                    <li>• Paiement en ligne (Stripe)</li>
                    <li>• Espèces (sur place)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Garantie</h4>
                  <ul className="text-sm space-y-1 text-gray-400">
                    <li>• Pièces neuves : 1 an</li>
                    <li>• Pièces occasion : 3 mois</li>
                    <li>• Échange standard possible</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Main Pro Page
const ProPage = () => {
  const [hasAccess, setHasAccess] = useState(false);

  if (!hasAccess) {
    return <ProGatekeeper onAccessGranted={() => setHasAccess(true)} />;
  }

  return <ProDashboard />;
};

export default ProPage;
