import { CheckCircle2, BookOpen, Tag, Upload, ListChecks, Image as ImageIcon, FileSpreadsheet, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Step = ({ number, title, children }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">{number}</div>
    <div className="flex-1">
      <h4 className="font-bold mb-1">{title}</h4>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  </div>
);

const HowToGuide = () => {
  return (
    <div className="space-y-6" data-testid="how-to-guide">
      <h2 className="font-heading text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Guide d'utilisation rapide</h2>
      <p className="text-sm text-gray-600">Bienvenue ! Voici les 5 étapes pour gérer votre boutique en quelques minutes.</p>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-red-600" /> 1. Importer vos produits en masse (CSV)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step number={1} title="Ouvrir l'onglet Produits → Import CSV">Cliquez sur l'onglet "Produits" puis cherchez le bouton d'import CSV.</Step>
          <Step number={2} title="Télécharger le modèle">Bouton "Télécharger le modèle CSV". Ouvrez-le dans Excel/LibreOffice.</Step>
          <Step number={3} title="Remplir les colonnes">Colonnes : reference (unique), name, price (nombre avec point), stock, category, vehicle. Sauvegardez en .csv.</Step>
          <Step number={4} title="Importer le fichier">Cliquez sur "Choisir un fichier CSV" et sélectionnez votre fichier rempli.</Step>
          <Step number={5} title="Vérifier puis valider">Examinez l'aperçu, corrigez les erreurs si besoin, puis cliquez "Valider l'import".</Step>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-5 w-5 text-red-600" /> 2. Ajouter un produit avec photos et PDF</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step number={1} title="Ouvrir le formulaire produit">Bouton "Ajouter un produit" en haut de la liste.</Step>
          <Step number={2} title="Remplir les infos">Référence (unique), nom, prix, stock et catégorie.</Step>
          <Step number={3} title="Téléverser les images">Cliquez sur "Ajouter" dans la zone images. Sélectionnez jusqu'à 8 photos (JPG/PNG/WebP, max 5 Mo). Conversion WebP et thumbnails automatiques.</Step>
          <Step number={4} title="Joindre un PDF (optionnel)">Fiche technique ou garantie, max 10 Mo.</Step>
          <Step number={5} title="Sauvegarder">Le produit est immédiatement visible sur le site public.</Step>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-5 w-5 text-red-600" /> 3. Créer une promotion</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step number={1} title="Onglet Promotions">Cliquez sur "Promotions" dans le menu admin.</Step>
          <Step number={2} title="Nouvelle promotion">Bouton "Nouvelle promotion".</Step>
          <Step number={3} title="Titre, description, badge">Ex: Titre = "Soldes d'été", Badge = "-20%".</Step>
          <Step number={4} title="Image bannière (optionnelle)">Téléversez une image attractive (JPG/PNG, max 5 Mo).</Step>
          <Step number={5} title="Planifier et activer">Choisissez les dates de début et fin, puis activez. La bannière apparaît sur la page d'accueil.</Step>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5 text-red-600" /> 4. Personnaliser le site (logo, options, liens)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step number={1} title="Onglet Paramètres">Téléverser votre logo officiel, activer l'animation et choisir le type.</Step>
          <Step number={2} title="Onglet Liens rapides">Gérer téléphone, WhatsApp, Leboncoin et autres marketplaces. Activer/désactiver et réordonner.</Step>
          <Step number={3} title="Options ON/OFF">Section "Options du site" — activez/désactivez WhatsApp, Stripe, FAQ, Promotions, etc. selon vos besoins.</Step>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-5 w-5 text-red-600" /> 5. Gérer les demandes (Devis & Pros)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step number={1} title="Onglet Devis">Toutes les demandes de devis particuliers. Changez le statut (En attente / Traité / Devis envoyé / Refusé).</Step>
          <Step number={2} title="Onglet Demandes Pro">Garages/Carrossiers ayant demandé un compte pro. Approuvez ou rejetez. Bouton WhatsApp direct pour les contacter.</Step>
          <Step number={3} title="Tableau de bord">Vue d'ensemble avec compteurs et activité récente.</Step>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-300">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-5 w-5 text-amber-600" /> Sauvegardes & stockage</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Les fichiers téléversés (images, PDFs, logo) sont stockés sur le serveur dans le dossier <code className="bg-white px-1 rounded">/app/backend/uploads</code>.</p>
          <p>Pour télécharger une sauvegarde : copiez ce dossier régulièrement. Les données produits/devis/promotions sont dans MongoDB.</p>
          <p className="font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Soft-delete activé : la suppression d'un produit le met en corbeille (restaurable).</p>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-300">
        <CardHeader><CardTitle className="text-base">Vérifications rapides (3 tests à faire)</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Test import CSV :</strong> Téléchargez le modèle, ajoutez 1 ligne et importez. Vérifiez que le produit apparaît.</li>
            <li><strong>Test PDF :</strong> Sur n'importe quel produit, joignez un PDF puis téléchargez-le pour vérifier l'ouverture.</li>
            <li><strong>Test promotion :</strong> Créez une promotion active sans date de fin. Vérifiez l'apparition sur la page d'accueil.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default HowToGuide;
