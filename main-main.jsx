import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import './index.css';
import {
  Car,
  Wrench,
  Hammer,
  ShieldCheck,
  Check,
  ArrowRight,
  Wallet,
  Gauge,
  MapPin,
  Clock,
  Users,
  Menu,
  X,
  ChevronDown,
  Info,
  Truck,
  Briefcase,
  Calendar,
  Send,
  Search,
  ArrowLeftRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Map as MapIcon,
  Package,
  Layers,
  ChevronRight,
  Sparkles,
  Star,
  Quote,
  MessageSquare,
  Settings,
  Shield,
  Building2,
  User,
  History,
  LayoutDashboard
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';

// Predefined coordinates for the 21 major French hubs
const CITY_COORDINATES = {
  'Montpellier': { lat: 43.611, lng: 3.877 },
  'Saint-Jean-de-Védas': { lat: 43.578, lng: 3.824 },
  'Juvignac': { lat: 43.615, lng: 3.805 },
  'Castelnau-le-Lez': { lat: 43.633, lng: 3.921 },
  'Lattes': { lat: 43.568, lng: 3.903 },
  'Pérols': { lat: 43.563, lng: 3.973 },
  'Rennes': { lat: 48.111, lng: -1.679 },
  'Fougères': { lat: 48.356, lng: -1.203 },
  'Saint-Malo': { lat: 48.649, lng: -2.025 },
  'Dinan': { lat: 48.455, lng: -2.048 },
  'Vitré': { lat: 48.124, lng: -1.211 },
  'Lamballe': { lat: 48.468, lng: -2.516 },
  'Paris': { lat: 48.856, lng: 2.352 },
  'Lyon': { lat: 45.764, lng: 4.835 },
  'Marseille': { lat: 43.296, lng: 5.369 },
  'Toulouse': { lat: 43.604, lng: 1.444 },
  'Bordeaux': { lat: 44.837, lng: -0.579 },
  'Nantes': { lat: 47.218, lng: -1.553 },
  'Lille': { lat: 50.629, lng: 3.057 },
  'Strasbourg': { lat: 48.573, lng: 7.752 },
  'Nice': { lat: 43.710, lng: 7.262 }
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Component to dynamically fit map view to the selected route
function MapBoundsHandler({ departCoords, arriveCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !departCoords || !arriveCoords) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(departCoords);
      bounds.extend(arriveCoords);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } catch (e) {
      // Map SDK not loaded yet
    }
  }, [map, departCoords, arriveCoords]);

  return null;
}

// Places Autocomplete Input using Google Maps JS SDK via @vis.gl wrapper
function PlaceAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
  id
}) {
  const inputRef = useRef(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    try {
      const autocomplete = new placesLib.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
        componentRestrictions: { country: 'fr' }
      });

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place) {
          const placeName = place.formatted_address || place.name || inputRef.current?.value || '';
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();

          onChange(placeName);
          if (onPlaceSelect && typeof lat === 'number' && typeof lng === 'number') {
            onPlaceSelect(placeName, lat, lng);
          }
        }
      });

      return () => {
        if (google && google.maps && google.maps.event) {
          google.maps.event.removeListener(listener);
        }
      };
    } catch (e) {
      // Graceful fallback if autocomplete unavailable
    }
  }, [placesLib, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}

export default function MutualJobApp() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.gm_authFailure = () => {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      };
      const origError = console.error;
      console.error = (...args) => {
        origError.apply(console, args);
        const msg = args.map((a) => String(a)).join(' ');
        if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      };

      const handleQuota = () => setQuotaExceeded(true);
      window.addEventListener('gmp-quota-exceeded', handleQuota);
      return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
    }
  }, []);

  // Search state
  const [searchDepartCity, setSearchDepartCity] = useState('Montpellier');
  const [searchDepartExact, setSearchDepartExact] = useState('');
  const [searchDepartCoords, setSearchDepartCoords] = useState({ lat: 43.611, lng: 3.877 });
  const [searchArriveCity, setSearchArriveCity] = useState('Saint-Jean-de-Védas');
  const [searchArriveExact, setSearchArriveExact] = useState('');
  const [searchArriveCoords, setSearchArriveCoords] = useState({ lat: 43.578, lng: 3.824 });
  const [searchDate, setSearchDate] = useState('2026-09-29');
  const [searchResults, setSearchResults] = useState(null);
  const [alternativeResults, setAlternativeResults] = useState(null);
  const [searchAttempted, setSearchPerformed] = useState(false);
  const [searchRequiredSeats, setSearchRequiredSeats] = useState(1);
  const [searchMaterialVolume, setSearchMaterialVolume] = useState('Indifférent');

  // Form tab & data
  const [formRole, setFormTabRole] = useState('driver');
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    siret: '',
    departCity: 'Montpellier',
    departExact: '',
    arriveCity: 'Saint-Jean-de-Védas',
    arriveExact: '',
    days: ['Lundi', 'Mardi', 'Jeudi'],
    schedule: '6h-9h',
    vehicleType: 'Utilitaire',
    kmPerWeek: 150,
    freeSeats: 2,
    driverMaterialCapacity: 'Moyen volume (Coffre/Caisses)',
    requiredSeats: 1,
    passengerMaterialVolume: 'Moyenne caisse à outils'
  });

  const [formDepartCoords, setFormDepartCoords] = useState({ lat: 43.611, lng: 3.877 });
  const [formArriveCoords, setFormArriveCoords] = useState({ lat: 43.578, lng: 3.824 });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKmInfo, setShowKmInfo] = useState(false);

  // Views & artisan dashboard
  const [currentView, setCurrentView] = useState('landing');
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview');
  const [activeChatId, setActiveChatId] = useState(1);
  const [chatInput, setChatInput] = useState('');
  const [chatConversations, setChatConversations] = useState({
    1: [
      { sender: 'Plomberie Martin', text: "Salut Sébastien, d'accord pour lundi 6h30 au dépôt. J'ai deux caisses à outils moyennes, ça loge ?", time: "09:32", isUser: false },
      { sender: 'Moi', text: "Salut ! Oui sans aucun problème, l'arrière de mon utilitaire est à moitié vide. On se retrouve là-bas !", time: "09:45", isUser: true },
      { sender: 'Plomberie Martin', text: "Génial, merci beaucoup ! À lundi.", time: "09:47", isUser: false }
    ],
    2: [
      { sender: 'Électricité Breizh', text: "Parfait pour le covoiturage de mardi matin sur Rennes. Je prépare le café thermos !", time: "Hier", isUser: false },
      { sender: 'Moi', text: "Top, rendez-vous à la station Total comme convenu.", time: "Hier", isUser: true },
      { sender: 'Électricité Breizh', text: "Ah super idée, à mardi 7h alors !", time: "Hier", isUser: false }
    ],
    3: [
      { sender: 'BTP Sud Carrelage', text: "Bonjour, avez-vous toujours 1 place pour mon apprenti jeudi matin vers Montpellier ?", time: "24 Sept", isUser: false },
      { sender: 'Moi', text: "Oui tout à fait, c'est pile sur ma route...", time: "24 Sept", isUser: true }
    ]
  });

  // Cities catalogue
  const cities = [
    'Bordeaux', 'Castelnau-le-Lez', 'Dinan', 'Fougères', 'Juvignac',
    'Lamballe', 'Lattes', 'Lille', 'Lyon', 'Marseille', 'Montpellier',
    'Nantes', 'Nice', 'Paris', 'Pérols', 'Rennes', 'Saint-Jean-de-Védas',
    'Saint-Malo', 'Strasbourg', 'Toulouse', 'Vitré'
  ];

  const daysOfWeek = [
    { label: 'Lun', value: 'Lundi' },
    { label: 'Mar', value: 'Mardi' },
    { label: 'Mer', value: 'Mercredi' },
    { label: 'Jeu', value: 'Jeudi' },
    { label: 'Ven', value: 'Vendredi' }
  ];

  const schedulesList = ['6h-9h', '9h-12h', '12h-14h', '14h-17h', '17h-19h'];
  const materialCapacities = [
    'Petit outillage (Sac/Caisse à main)',
    'Moyen volume (Coffre/Caisses)',
    'Grand volume (Fourgon vide)',
    'Très grand volume (Remorque/Benne)'
  ];

  // Active verified trips database
  const mockDatabase = [
    {
      id: 1,
      driver: 'Plomberie Martin & Fils',
      depart: 'Rennes',
      arrivee: 'Fougères',
      schedule: '6h-9h',
      vehicle: 'Utilitaire Fourgon',
      days: ['Lundi', 'Mercredi', 'Vendredi'],
      freeSeats: 2,
      materialCapacity: 'Grand volume (Fourgon vide)',
      materialSpace: 'Grand volume disponible (arrière vide)'
    },
    {
      id: 2,
      driver: 'Electricité Breizh Pro',
      depart: 'Rennes',
      arrivee: 'Saint-Malo',
      schedule: '6h-9h',
      vehicle: 'Utilitaire Compact',
      days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      freeSeats: 1,
      materialCapacity: 'Moyen volume (Coffre/Caisses)',
      materialSpace: 'Moyen coffre dispo'
    },
    {
      id: 3,
      driver: 'BTP Sud Carrelage',
      depart: 'Montpellier',
      arrivee: 'Saint-Jean-de-Védas',
      schedule: '6h-9h',
      vehicle: 'Camion Benne Pro',
      days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      freeSeats: 2,
      materialCapacity: 'Très grand volume (Remorque/Benne)',
      materialSpace: 'Benne disponible pour gravats et outillage lourd'
    },
    {
      id: 4,
      driver: 'Hérault Plomberie Services',
      depart: 'Montpellier',
      arrivee: 'Juvignac',
      schedule: '12h-14h',
      vehicle: 'Fourgonnette',
      days: ['Lundi', 'Mardi', 'Jeudi'],
      freeSeats: 1,
      materialCapacity: 'Moyen volume (Coffre/Caisses)',
      materialSpace: 'Galerie de toit + coffre'
    },
    {
      id: 5,
      driver: 'Sébastien J. (Maçonnerie Générale)',
      depart: 'Fougères',
      arrivee: 'Dinan',
      schedule: '6h-9h',
      vehicle: 'Camion 3.5t',
      days: ['Mardi', 'Jeudi'],
      freeSeats: 2,
      materialCapacity: 'Grand volume (Fourgon vide)',
      materialSpace: 'Benne disponible'
    },
    {
      id: 6,
      driver: 'Rennes Electricité Générale',
      depart: 'Rennes',
      arrivee: 'Vitré',
      schedule: '17h-19h',
      vehicle: 'Break Commercial',
      days: ['Lundi', 'Mardi', 'Jeudi'],
      freeSeats: 1,
      materialCapacity: 'Petit outillage (Sac/Caisse à main)',
      materialSpace: 'Petit outillage uniquement'
    },
    {
      id: 7,
      driver: 'Atelier Menuiserie Lamballe',
      depart: 'Lamballe',
      arrivee: 'Saint-Malo',
      schedule: '9h-12h',
      vehicle: 'Utilitaire L2H2',
      days: ['Mardi', 'Mercredi', 'Vendredi'],
      freeSeats: 2,
      materialCapacity: 'Grand volume (Fourgon vide)',
      materialSpace: 'Galerie de toit + grand coffre'
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchPerformed(true);

    const matched = mockDatabase.filter(trip => {
      const cityMatch = trip.depart.toLowerCase() === searchDepartCity.toLowerCase() &&
                        trip.arrivee.toLowerCase() === searchArriveCity.toLowerCase();
      const seatsMatch = trip.freeSeats >= searchRequiredSeats;
      return cityMatch && seatsMatch;
    });

    const alternatives = mockDatabase.filter(trip => {
      const cityMatch = trip.depart.toLowerCase() === searchDepartCity.toLowerCase() &&
                        trip.arrivee.toLowerCase() === searchArriveCity.toLowerCase();
      const isMainMatch = matched.some(m => m.id === trip.id);
      return cityMatch && !isMainMatch;
    });

    setSearchResults(matched);
    setAlternativeResults(alternatives);

    setTimeout(() => {
      const el = document.getElementById('search-results-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const setPopularRoute = (dep, arr) => {
    setSearchDepartCity(dep);
    setSearchArriveCity(arr);
    setSearchDepartExact('');
    setSearchArriveExact('');
    if (CITY_COORDINATES[dep]) setSearchDepartCoords(CITY_COORDINATES[dep]);
    if (CITY_COORDINATES[arr]) setSearchArriveCoords(CITY_COORDINATES[arr]);
    setSearchPerformed(true);
    const matched = mockDatabase.filter(trip => trip.depart === dep && trip.arrivee === arr);
    const alternatives = mockDatabase.filter(trip => trip.depart === dep && trip.arrivee === arr && !matched.some(m => m.id === trip.id));
    setSearchResults(matched);
    setAlternativeResults(alternatives);
    setTimeout(() => {
      const el = document.getElementById('search-results-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleDayCheckboxToggle = (value) => {
    setFormData(prev => {
      const currentDays = [...prev.days];
      const index = currentDays.indexOf(value);
      if (index > -1) {
        currentDays.splice(index, 1);
      } else {
        currentDays.push(value);
      }
      return { ...prev, days: currentDays };
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.companyName.trim()) errors.companyName = "Le nom de l'entreprise est obligatoire.";
    if (!formData.email.trim()) {
      errors.email = "L'adresse email est obligatoire.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "L'adresse email n'est pas valide.";
    }
    const cleanedPhone = formData.phone.trim().replace(/[\s.-]/g, '');
    if (!formData.phone.trim()) {
      errors.phone = "Le numéro de téléphone est obligatoire.";
    } else if (!/^\+?[0-9]{8,15}$/.test(cleanedPhone)) {
      errors.phone = "Format de numéro invalide (ex: 06 12 34 56 78).";
    }
    if (formData.departCity === formData.arriveCity) {
      errors.cities = "Les villes de départ et d'arrivée doivent être différentes.";
    }
    if (formData.days.length === 0) {
      errors.days = "Sélectionnez au moins un jour régulier.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const formEl = document.getElementById('onboarding-form-card');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    // Simulate instant validation & persistence
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
    }, 600);
  };

  // Live savings formula: (kmPerWeek * 52 weeks * 0.09L/km * 1.85€/L * 50% split)
  const annualSavings = Math.round((formData.kmPerWeek * 52 * 0.09 * 1.85) * 0.45);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">

        {/* Quota Defence Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-2.5 text-xs text-center sticky top-0 z-50 shadow-xs font-medium">
            Mode démonstration cartographique actif. Renseignez votre clé Google Maps dans .env pour débloquer l&apos;accès complet.
          </div>
        )}

        {/* HEADER ÉPURÉ (Deel / Figma style) */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            {/* Zone 1: Logo Brand Wordmark */}
            <a href="#" className="flex items-center gap-2 text-xl font-black text-[#111827] tracking-tight font-display hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white shadow-xs">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span>Mutual<span className="text-[#3B82F6]">Job</span></span>
            </a>

            {/* Zone 2: Nav Items */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280]">
              <a href="#" className="hover:text-[#3B82F6] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#3B82F6] after:transition-all">Accueil</a>
              <a href="#pourquoi" className="hover:text-[#3B82F6] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#3B82F6] after:transition-all">Solutions</a>
              <a href="#fonctionnement" className="hover:text-[#3B82F6] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#3B82F6] after:transition-all">Sécurité & SIRET</a>
              <a href="#temoignages" className="hover:text-[#3B82F6] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#3B82F6] after:transition-all">Avis Artisans</a>
            </nav>

            {/* Zone 3: Primary Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setCurrentView(currentView === 'landing' ? 'dashboard' : 'landing')}
                className="h-[44px] px-5 border border-slate-200 hover:bg-slate-50 text-[#111827] font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0"
              >
                <LayoutDashboard className="w-4 h-4 text-[#3B82F6]" />
                <span>{currentView === 'landing' ? 'Espace Pro (Dashboard)' : 'Retour au Site'}</span>
              </button>

              {currentView === 'landing' && (
                <a
                  href="#onboarding-section"
                  className="h-[44px] px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  Démarrer
                </a>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* MOBILE NAV PANEL */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-0 w-full bg-white border-b border-slate-200 shadow-xl z-50 md:hidden text-left"
            >
              <div className="px-6 py-6 flex flex-col gap-4">
                <a href="#" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-[#111827]">Accueil</a>
                <a href="#pourquoi" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-[#111827]">Solutions</a>
                <a href="#fonctionnement" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-[#111827]">Sécurité</a>
                <a href="#temoignages" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-[#111827]">Avis Artisans</a>
                <hr className="border-slate-100" />
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setCurrentView(currentView === 'landing' ? 'dashboard' : 'landing');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-3 text-sm font-semibold text-[#111827] bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#3B82F6]" />
                    <span>{currentView === 'landing' ? 'Espace Pro (Dashboard)' : 'Retour au Site'}</span>
                  </button>
                  {currentView === 'landing' && (
                    <a
                      href="#onboarding-section"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 text-sm font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-xl block"
                    >
                      Démarrer
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentView === 'landing' ? (
          <>
            {/* HERO SECTION */}
            <section className="bg-[#F9FAFB] pt-12 pb-20 md:py-24 relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                  {/* Left Column (50%) */}
                  <div className="lg:col-span-6 space-y-8 text-left">
                    <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-[#111827] leading-[1.05] font-display">
                      Partagez les trajets.<br />
                      <span className="text-[#3B82F6]">Partagez les coûts.</span>
                    </h1>
                    <p className="text-lg text-[#6B7280] leading-[1.6] max-w-lg">
                      La plateforme de covoiturage exclusive aux artisans et professionnels du bâtiment. Économisez jusqu&apos;à 40% sur votre carburant de chantier.
                    </p>

                    <div className="flex flex-wrap gap-4">
                      <a
                        href="#onboarding-section"
                        className="h-[44px] px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm rounded-xl flex items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        Commencer
                      </a>
                      <button
                        onClick={() => {
                          setCurrentView('dashboard');
                          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                        }}
                        className="h-[44px] px-6 border border-slate-200 hover:bg-slate-50 text-[#3B82F6] font-semibold text-sm rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        Voir la démo
                      </button>
                    </div>

                    <p className="text-sm text-[#6B7280] flex items-center gap-1.5 pt-2">
                      <span className="text-[#10B981] font-semibold">1 200+ artisans</span> font confiance à MutualJob <span aria-hidden="true" className="text-slate-300">·</span> <span className="text-amber-400">★</span> <span className="font-semibold text-[#111827]">4.8/5</span>
                    </p>
                  </div>

                  {/* Right Column (Hero Visual) */}
                  <div className="lg:col-span-6 relative">
                    <div className="relative aspect-[16/9] lg:aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white">
                      <img
                        src="/hero_artisans_covoiturage_1790629480626.jpg"
                        alt="Artisans en covoiturage de chantier"
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* SEARCH BAR (Ultra-clean Pro Layout) */}
            <section className="relative z-10 -mt-10 max-w-6xl mx-auto px-6">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 md:p-3">
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-1 text-left"
                >
                  {/* Depart */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 px-4 py-2 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="w-full">
                        <label className="block text-[11px] font-semibold text-[#6B7280]">Secteur de départ</label>
                        <select
                          value={searchDepartCity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchDepartCity(val);
                            if (CITY_COORDINATES[val] && !searchDepartExact) {
                              setSearchDepartCoords(CITY_COORDINATES[val]);
                            }
                          }}
                          className="w-full bg-transparent text-sm font-semibold text-[#111827] focus:outline-none appearance-none cursor-pointer"
                        >
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <PlaceAutocompleteInput
                        value={searchDepartExact}
                        onChange={setSearchDepartExact}
                        onPlaceSelect={(place, lat, lng) => {
                          if (lat && lng) setSearchDepartCoords({ lat, lng });
                        }}
                        placeholder="Lieu exact (Chantier, dépôt...)"
                        className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none border-b border-dashed border-slate-200 focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>

                  {/* Arrivee */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 px-4 py-2 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 text-[#3B82F6] shrink-0" />
                      <div className="w-full">
                        <label className="block text-[11px] font-semibold text-[#6B7280]">Secteur d&apos;arrivée</label>
                        <select
                          value={searchArriveCity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchArriveCity(val);
                            if (CITY_COORDINATES[val] && !searchArriveExact) {
                              setSearchArriveCoords(CITY_COORDINATES[val]);
                            }
                          }}
                          className="w-full bg-transparent text-sm font-semibold text-[#111827] focus:outline-none appearance-none cursor-pointer"
                        >
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <PlaceAutocompleteInput
                        value={searchArriveExact}
                        onChange={setSearchArriveExact}
                        onPlaceSelect={(place, lat, lng) => {
                          if (lat && lng) setSearchArriveCoords({ lat, lng });
                        }}
                        placeholder="Chantier exact (rue, ZAC...)"
                        className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none border-b border-dashed border-slate-200 focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>

                  {/* Date & Ouvriers */}
                  <div className="px-4 py-2 flex flex-col md:flex-row items-stretch md:items-center gap-4 lg:border-r border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="w-full">
                        <label className="block text-[11px] font-semibold text-[#6B7280]">Date de départ</label>
                        <input
                          type="date"
                          value={searchDate}
                          onChange={(e) => setSearchDate(e.target.value)}
                          className="bg-transparent text-sm font-semibold text-[#111827] focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Users className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="w-full">
                        <label className="block text-[11px] font-semibold text-[#6B7280]">Nombre d&apos;ouvriers</label>
                        <select
                          value={searchRequiredSeats}
                          onChange={(e) => setSearchRequiredSeats(Number(e.target.value))}
                          className="bg-transparent text-sm font-semibold text-[#111827] focus:outline-none cursor-pointer"
                        >
                          <option value="1">1 personne</option>
                          <option value="2">2 personnes</option>
                          <option value="3">3 personnes</option>
                          <option value="4">4 personnes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="p-2 shrink-0">
                    <button
                      type="submit"
                      className="w-full lg:w-auto h-[48px] lg:px-8 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:-translate-y-0.5"
                    >
                      <Search className="w-4 h-4" />
                      <span>Rechercher</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* SEARCH RESULTS & MAP */}
            <AnimatePresence>
              {searchAttempted && (
                <motion.section
                  id="search-results-section"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="py-16 bg-white border-y border-slate-150 scroll-mt-20 text-left"
                >
                  <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                      <div>
                        <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2 font-display">
                          <MapIcon className="w-5 h-5 text-[#3B82F6]" />
                          <span>Trajets correspondants : {searchDepartCity} → {searchArriveCity}</span>
                        </h3>
                        <p className="text-xs text-[#6B7280] mt-1">Filtré pour la date du {searchDate}</p>
                      </div>
                      <button
                        onClick={() => setSearchPerformed(false)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                      >
                        Réinitialiser la recherche
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left side list */}
                      <div className="lg:col-span-7 space-y-4">
                        {searchResults && searchResults.length > 0 ? (
                          searchResults.map((trip) => (
                            <div key={trip.id} className="p-5 bg-[#F9FAFB] border border-slate-200 rounded-2xl hover:border-[#3B82F6] hover:bg-white transition-all shadow-2xs flex flex-col justify-between gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <span>{trip.vehicle}</span>
                                  <span aria-hidden="true" className="text-slate-300">·</span>
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                    <Shield className="w-3.5 h-3.5" /> Siret vérifié
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 font-bold text-slate-900 text-sm">
                                  <span>{trip.depart}</span>
                                  <ArrowRight className="w-4 h-4 text-slate-400" />
                                  <span>{trip.arrivee}</span>
                                </div>

                                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#6B7280]">
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Horaires : {trip.schedule}</span>
                                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Jours : {trip.days.join(', ')}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                  <div className="text-xs text-slate-600 bg-white p-2 border border-slate-100 rounded-lg flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-[#10B981]" />
                                    <span>Places libres : <strong>{trip.freeSeats}</strong></span>
                                  </div>
                                  <div className="text-xs text-slate-600 bg-white p-2 border border-slate-100 rounded-lg flex items-center gap-1.5">
                                    <Package className="w-4 h-4 text-[#3B82F6]" />
                                    <span>Matériel : <strong>{trip.materialCapacity.split(' (')[0]}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                  <div className="text-[10px] text-[#6B7280] font-medium">Artisan Conducteur</div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{trip.driver}</div>
                                </div>
                                <a
                                  href="#onboarding-section"
                                  className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                                >
                                  Contacter l&apos;artisan
                                </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-6">
                            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                              <Truck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                              <p className="font-bold text-sm text-[#111827]">Aucun trajet trouvé pour vos critères exacts.</p>
                              <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">Créez votre propre annonce pour proposer votre véhicule ou trouver un copilote !</p>
                              <a href="#onboarding-section" className="mt-4 inline-flex items-center px-5 py-2.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-xl transition-colors">
                                Proposer mon trajet
                              </a>
                            </div>

                            {alternativeResults && alternativeResults.length > 0 && (
                              <div className="space-y-3">
                                <div className="text-xs font-semibold text-[#111827] bg-[#F9FAFB] border border-slate-200 p-3.5 rounded-xl flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                                  <span>Alternatives sur le même axe :</span>
                                </div>
                                {alternativeResults.map((trip) => (
                                  <div key={`alt-${trip.id}`} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#3B82F6] transition-all flex items-center justify-between gap-4 shadow-2xs">
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{trip.driver}</div>
                                      <div className="text-xs text-[#6B7280] mt-0.5">{trip.depart} ➜ {trip.arrivee} • {trip.schedule} • {trip.freeSeats} places</div>
                                    </div>
                                    <a href="#onboarding-section" className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-lg">
                                      Voir
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Map */}
                      <div className="lg:col-span-5">
                        <div className="sticky top-20 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs h-[400px]">
                          {searchDepartCoords && searchArriveCoords ? (
                            <Map
                              mapId="DEMO_MAP_ID"
                              defaultZoom={11}
                              defaultCenter={searchDepartCoords}
                              gestureHandling="cooperative"
                              className="w-full h-full"
                            >
                              <AdvancedMarker position={searchDepartCoords} title="Départ">
                                <div className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-md flex items-center gap-1 shadow-md border border-slate-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                  <span>Départ</span>
                                </div>
                              </AdvancedMarker>
                              <AdvancedMarker position={searchArriveCoords} title="Arrivée">
                                <div className="px-2.5 py-1 bg-[#3B82F6] text-white text-[10px] font-semibold rounded-md flex items-center gap-1 shadow-md">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  <span>Arrivée</span>
                                </div>
                              </AdvancedMarker>
                              <MapBoundsHandler departCoords={searchDepartCoords} arriveCoords={searchArriveCoords} />
                            </Map>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <MapIcon className="w-6 h-6 animate-pulse" />
                              <span className="text-xs mt-2">Chargement de la carte...</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* SECTION STATS */}
            <section className="py-16 bg-white border-b border-slate-150">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="block text-4xl font-extrabold text-[#3B82F6] font-mono tracking-tight">1 200+</span>
                    <span className="block text-sm text-[#6B7280] font-medium">Artisans actifs</span>
                  </div>
                  <div className="space-y-1 text-center md:text-left">
                    <span className="block text-4xl font-extrabold text-[#3B82F6] font-mono tracking-tight">45k</span>
                    <span className="block text-sm text-[#6B7280] font-medium">Trajets partagés</span>
                  </div>
                  <div className="space-y-1 text-center md:text-left">
                    <span className="block text-4xl font-extrabold text-[#3B82F6] font-mono tracking-tight">€250k</span>
                    <span className="block text-sm text-[#6B7280] font-medium">Économisés collectivement</span>
                  </div>
                  <div className="space-y-1 text-center md:text-left">
                    <span className="block text-4xl font-extrabold text-[#3B82F6] font-mono tracking-tight">4.8★</span>
                    <span className="block text-sm text-[#6B7280] font-medium">Satisfaction globale</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION "POURQUOI MUTUALJOB" */}
            <section id="pourquoi" className="py-24 bg-white border-b border-slate-150">
              <div className="max-w-7xl mx-auto px-6">
                <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                  <h2 className="text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight font-display">
                    Pourquoi les artisans choisissent MutualJob
                  </h2>
                  <p className="text-lg text-[#6B7280] leading-[1.6]">
                    Plus sûr, plus économique et taillé sur-mesure pour les contraintes de chantiers réels.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200 border-l-4 border-l-[#3B82F6]">
                    <div className="text-3xl mb-4">💰</div>
                    <h3 className="text-lg font-bold text-[#111827] mb-2 font-display">Économisez jusqu&apos;à 40%</h3>
                    <p className="text-sm text-[#6B7280] leading-[1.6]">
                      Divisez les frais de carburant et de péage avec d&apos;autres professionnels. Transparent, sans frais cachés.
                    </p>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200 border-l-4 border-l-[#3B82F6]">
                    <div className="text-3xl mb-4">🔐</div>
                    <h3 className="text-lg font-bold text-[#111827] mb-2 font-display">100% vérifiés et sécurisés</h3>
                    <p className="text-sm text-[#6B7280] leading-[1.6]">
                      Vérification INSEE / SIRET obligatoire. Vos collègues de route sont de vrais professionnels du bâtiment.
                    </p>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200 border-l-4 border-l-[#3B82F6]">
                    <div className="text-3xl mb-4">👥</div>
                    <h3 className="text-lg font-bold text-[#111827] mb-2 font-display">Respect du matériel & horaires</h3>
                    <p className="text-sm text-[#6B7280] leading-[1.6]">
                      Caisses à outils, perfo, échelles : chaque trajet prend en compte l&apos;outillage embarqué et les horaires matinaux.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION "COMMENT ÇA MARCHE" */}
            <section id="fonctionnement" className="py-24 bg-[#F9FAFB] border-b border-slate-150">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight font-display mb-16">
                  3 étapes simples pour démarrer
                </h2>

                <div className="relative">
                  <div className="hidden lg:block absolute top-[24px] left-[15%] right-[15%] h-0.5 bg-slate-200 z-0" />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[#3B82F6] text-white font-semibold flex items-center justify-center text-lg shadow-xs">
                        1
                      </div>
                      <h3 className="text-lg font-bold text-[#111827] mt-2 font-display">Créez votre profil artisan</h3>
                      <p className="text-sm text-[#6B7280] max-w-xs leading-[1.6]">
                        Renseignez votre SIRET, votre véhicule de chantier et vos coordonnées en 2 minutes.
                      </p>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[#3B82F6] text-white font-semibold flex items-center justify-center text-lg shadow-xs">
                        2
                      </div>
                      <h3 className="text-lg font-bold text-[#111827] mt-2 font-display">Proposez ou cherchez</h3>
                      <p className="text-sm text-[#6B7280] max-w-xs leading-[1.6]">
                        Trouvez des trajets réguliers ou ponctuels sur votre axe de chantier quotidien.
                      </p>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[#3B82F6] text-white font-semibold flex items-center justify-center text-lg shadow-xs">
                        3
                      </div>
                      <h3 className="text-lg font-bold text-[#111827] mt-2 font-display">Partagez et économisez</h3>
                      <p className="text-sm text-[#6B7280] max-w-xs leading-[1.6]">
                        Validez le trajet via la messagerie intégrée et divisez vos dépenses par deux.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION "TRAJETS POPULAIRES" */}
            <section className="py-24 bg-white border-b border-slate-150">
              <div className="max-w-7xl mx-auto px-6 text-left">
                <h2 className="text-3xl font-bold text-[#111827] tracking-tight font-display mb-12">
                  Trajets partagés aujourd&apos;hui
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Google Map */}
                  <div className="lg:col-span-8 h-[450px] lg:h-auto rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative bg-slate-50 min-h-[350px]">
                    <Map
                      defaultZoom={8.5}
                      defaultCenter={{ lat: 48.3, lng: -1.6 }}
                      mapId="DEMO_MAP_ID_POPULAR"
                      gestureHandling="cooperative"
                    >
                      <AdvancedMarker position={CITY_COORDINATES['Rennes']} title="Rennes" />
                      <AdvancedMarker position={CITY_COORDINATES['Fougères']} title="Fougères" />
                      <AdvancedMarker position={CITY_COORDINATES['Saint-Malo']} title="Saint-Malo" />
                      <AdvancedMarker position={CITY_COORDINATES['Montpellier']} title="Montpellier" />
                      <AdvancedMarker position={CITY_COORDINATES['Saint-Jean-de-Védas']} title="Saint-Jean-de-Védas" />
                    </Map>
                  </div>

                  {/* Commute cards */}
                  <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="text-[#3B82F6] font-bold">Demain 8h00</span>
                          <span>★ 4.9 (12 avis)</span>
                        </div>
                        <h4 className="font-bold text-sm text-[#111827] font-display mt-1.5">Rennes ➜ Fougères</h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <span>12 km</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span>Plomberie</span>
                        </div>
                        <p className="text-xs font-semibold text-[#10B981] mt-1">€54 d&apos;économies</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs font-mono">
                          PM
                        </div>
                        <button
                          onClick={() => setPopularRoute('Rennes', 'Fougères')}
                          className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="text-[#3B82F6] font-bold">Demain 7h15</span>
                          <span>★ 4.8 (8 avis)</span>
                        </div>
                        <h4 className="font-bold text-sm text-[#111827] font-display mt-1.5">Montpellier ➜ Saint-Jean</h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <span>8 km</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span>Carrelage</span>
                        </div>
                        <p className="text-xs font-semibold text-[#10B981] mt-1">€32 d&apos;économies</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 font-semibold flex items-center justify-center text-xs font-mono">
                          SC
                        </div>
                        <button
                          onClick={() => setPopularRoute('Montpellier', 'Saint-Jean-de-Védas')}
                          className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="text-[#3B82F6] font-bold">Mardi 6h30</span>
                          <span>★ 5.0 (21 avis)</span>
                        </div>
                        <h4 className="font-bold text-sm text-[#111827] font-display mt-1.5">Rennes ➜ Saint-Malo</h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <span>65 km</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span>Électricité</span>
                        </div>
                        <p className="text-xs font-semibold text-[#10B981] mt-1">€145 d&apos;économies</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#3B82F6] font-semibold flex items-center justify-center text-xs font-mono">
                          EB
                        </div>
                        <button
                          onClick={() => setPopularRoute('Rennes', 'Saint-Malo')}
                          className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION "TÉMOIGNAGES" */}
            <section id="temoignages" className="py-24 bg-[#F9FAFB] border-b border-slate-150 text-left">
              <div className="max-w-7xl mx-auto px-6">
                <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                  <h2 className="text-3xl font-bold text-[#111827] tracking-tight font-display">
                    Ils covoiturent au quotidien avec MutualJob
                  </h2>
                  <p className="text-sm text-[#6B7280]">
                    Découvrez les retours d&apos;expérience des électriciens, plombiers et artisans de nos régions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      name: "Sébastien D.",
                      role: "Électricien — Montpellier",
                      ini: "SD",
                      quote: "Depuis que je covoiture avec mon confrère électricien, je gagne plus de 200€ par mois en carburant. En plus des économies, c'est super d'échanger sur les techniques de chantier."
                    },
                    {
                      name: "Mathieu B.",
                      role: "Plombier chauffagiste — Rennes",
                      ini: "MB",
                      quote: "Mon fourgon consomme 9L aux 100km. Partager les frais à 2 ou 3 sur l'aller-retour Rennes/Saint-Malo a sauvé notre budget carburant cette année."
                    },
                    {
                      name: "Amandine R.",
                      role: "Peintre en bâtiment — Castelnau",
                      ini: "AR",
                      quote: "La validation SIRET obligatoire me rassure. L'outillage est respecté, les horaires matinaux sont compris de part et d'autre. Vraiment parfait."
                    }
                  ].map((t, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between relative hover:shadow-xs transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex text-amber-400 gap-0.5">
                          {[...Array(5)].map((_, idx) => <Star key={idx} className="w-3.5 h-3.5 fill-current" />)}
                        </div>
                        <p className="text-sm text-[#6B7280] italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                      </div>
                      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center font-semibold text-xs font-mono">{t.ini}</div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                            <span>{t.name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                          </div>
                          <p className="text-[10px] text-slate-400">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ONBOARDING FORM */}
            <section id="onboarding-section" className="py-20 bg-slate-100 border-t border-slate-200 text-left">
              <div className="max-w-3xl mx-auto px-6">
                <div className="text-center space-y-3 mb-10">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                    Formulaire express
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#111827] font-display">Enregistrez votre trajet de chantier</h3>
                  <p className="text-xs text-[#6B7280]">Divisez vos frais de carburant en publiant votre itinéraire régulier.</p>
                </div>

                {/* Tabs Conducteur / Passager */}
                <div className="max-w-sm mx-auto grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl mb-6">
                  <button
                    onClick={() => setFormTabRole('driver')}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formRole === 'driver' ? 'bg-[#3B82F6] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Je propose mon véhicule</span>
                  </button>
                  <button
                    onClick={() => setFormTabRole('passenger')}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formRole === 'passenger' ? 'bg-[#3B82F6] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Je cherche un trajet</span>
                  </button>
                </div>

                <div id="onboarding-form-card" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {!formSubmitted ? (
                      <motion.form
                        key={`${formRole}-form`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleFormSubmit}
                        className="p-6 sm:p-8 space-y-6"
                      >
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                          {formRole === 'driver' ? (
                            <span>Vous proposez les places libres et la capacité de stockage de votre véhicule de chantier.</span>
                          ) : (
                            <span>Vous cherchez des places pour covoiturer vos ouvriers ainsi que vos caisses à outils.</span>
                          )}
                        </div>

                        {/* Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Nom de l&apos;entreprise</label>
                            <input
                              type="text"
                              placeholder="ex: Plomberie Martin"
                              value={formData.companyName}
                              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none ${
                                formErrors.companyName ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-[#3B82F6]'
                              }`}
                            />
                            {formErrors.companyName && <p className="text-[10px] text-red-500 font-semibold">{formErrors.companyName}</p>}
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">SIRET de l&apos;entreprise (Optionnel)</label>
                            <input
                              type="text"
                              maxLength={14}
                              placeholder="ex: 12345678900012"
                              value={formData.siret}
                              onChange={e => setFormData({ ...formData, siret: e.target.value.replace(/\D/g, '') })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                            />
                            <p className="text-[10px] text-slate-400">14 chiffres. Permet d&apos;obtenir le badge de confiance.</p>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Email professionnel</label>
                            <input
                              type="email"
                              placeholder="ex: contact@entreprise.fr"
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none ${
                                formErrors.email ? 'border-red-500' : 'border-slate-200 focus:border-[#3B82F6]'
                              }`}
                            />
                            {formErrors.email && <p className="text-[10px] text-red-500 font-semibold">{formErrors.email}</p>}
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Téléphone de contact</label>
                            <input
                              type="tel"
                              placeholder="ex: 06 12 34 56 78"
                              value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none ${
                                formErrors.phone ? 'border-red-500' : 'border-slate-200 focus:border-[#3B82F6]'
                              }`}
                            />
                            {formErrors.phone && <p className="text-[10px] text-red-500 font-semibold">{formErrors.phone}</p>}
                          </div>
                        </div>

                        {/* Row 3 - Departure autocomplete */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Secteur de départ</label>
                            <select
                              value={formData.departCity}
                              onChange={e => {
                                const val = e.target.value;
                                setFormData({ ...formData, departCity: val });
                                if (CITY_COORDINATES[val] && !formData.departExact) {
                                  setFormDepartCoords(CITY_COORDINATES[val]);
                                }
                              }}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                            >
                              {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Adresse exacte de départ</label>
                            <PlaceAutocompleteInput
                              value={formData.departExact}
                              onChange={val => setFormData({ ...formData, departExact: val })}
                              onPlaceSelect={(place, lat, lng) => {
                                if (lat && lng) setFormDepartCoords({ lat, lng });
                              }}
                              placeholder="Saisissez le dépôt ou l'adresse..."
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                            />
                          </div>
                        </div>

                        {/* Row 4 - Arrival autocomplete */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Secteur d&apos;arrivée</label>
                            <select
                              value={formData.arriveCity}
                              onChange={e => {
                                const val = e.target.value;
                                setFormData({ ...formData, arriveCity: val });
                                if (CITY_COORDINATES[val] && !formData.arriveExact) {
                                  setFormArriveCoords(CITY_COORDINATES[val]);
                                }
                              }}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                            >
                              {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-500">Adresse exacte du chantier</label>
                            <PlaceAutocompleteInput
                              value={formData.arriveExact}
                              onChange={val => setFormData({ ...formData, arriveExact: val })}
                              onPlaceSelect={(place, lat, lng) => {
                                if (lat && lng) setFormArriveCoords({ lat, lng });
                              }}
                              placeholder="ex: Zone artisanale de Juvignac"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                            />
                          </div>
                        </div>
                        {formErrors.cities && <p className="text-xs text-red-500 font-semibold text-center">{formErrors.cities}</p>}

                        {/* Dynamic fields */}
                        {formRole === 'driver' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="space-y-1 text-left">
                              <label className="block text-xs font-semibold text-slate-500">Places passagers disponibles</label>
                              <select
                                value={formData.freeSeats}
                                onChange={e => setFormData({ ...formData, freeSeats: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                              >
                                {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num}>{num} {num > 1 ? 'places libres' : 'place libre'}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="block text-xs font-semibold text-slate-500">Outillage admis</label>
                              <select
                                value={formData.driverMaterialCapacity}
                                onChange={e => setFormData({ ...formData, driverMaterialCapacity: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                              >
                                {materialCapacities.map(cap => <option key={cap} value={cap}>{cap.split(' (')[0]}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="space-y-1 text-left">
                              <label className="block text-xs font-semibold text-slate-500">Ouvriers à transporter</label>
                              <select
                                value={formData.requiredSeats}
                                onChange={e => setFormData({ ...formData, requiredSeats: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                              >
                                {[1, 2, 3, 4].map(num => <option key={num} value={num}>{num} {num > 1 ? 'personnes' : 'personne'}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="block text-xs font-semibold text-slate-500">Volume de matériel</label>
                              <select
                                value={formData.passengerMaterialVolume}
                                onChange={e => setFormData({ ...formData, passengerMaterialVolume: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                              >
                                <option value="Petit outillage (Sac/Caisse à main)">Sac d&apos;outils à main</option>
                                <option value="Moyenne caisse à outils">Caisse à outils moyenne</option>
                                <option value="Gros outillage / Perfo / Échelles">Gros matériel (perfo, échelles)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Days of week */}
                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-semibold text-slate-500">Jours réguliers de route</label>
                          <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map((day) => {
                              const isSelected = formData.days.includes(day.value);
                              return (
                                <button
                                  type="button"
                                  key={day.value}
                                  onClick={() => handleDayCheckboxToggle(day.value)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-50 border-[#3B82F6] text-[#3B82F6] shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {isSelected ? '✓ ' : ''}{day.label}
                                </button>
                              );
                            })}
                          </div>
                          {formErrors.days && <p className="text-[10px] text-red-500 font-semibold">{formErrors.days}</p>}
                        </div>

                        {/* Schedule */}
                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-semibold text-slate-500">Créneau horaire de route (Aller)</label>
                          <select
                            value={formData.schedule}
                            onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none"
                          >
                            {schedulesList.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        {/* Weekly mileage slider with live calculation */}
                        <div className="space-y-3 pt-2 text-left">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <label className="block text-xs font-semibold text-slate-500">Kilométrage hebdomadaire estimé</label>
                              <button
                                type="button"
                                onClick={() => setShowKmInfo(!showKmInfo)}
                                className="text-[10px] font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded border-none cursor-pointer hover:bg-blue-100 transition-colors"
                              >
                                Pourquoi estimer ?
                              </button>
                            </div>
                            <span className="text-xs font-extrabold text-[#3B82F6] bg-blue-50 px-2.5 py-1 rounded-full font-mono">{formData.kmPerWeek} km/semaine</span>
                          </div>

                          <AnimatePresence>
                            {showKmInfo && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2 mb-2 mt-1">
                                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <Info className="w-4 h-4 text-[#3B82F6]" />
                                    <span>Utilité de cette estimation</span>
                                  </h5>
                                  <ul className="list-disc pl-4 space-y-1 text-[#6B7280]">
                                    <li><strong>Calculateur de carburant :</strong> Estime en temps réel vos économies d&apos;essence sur la base d&apos;une consommation moyenne (~9L/100km).</li>
                                    <li><strong>Bilan RSE d&apos;entreprise :</strong> MutualJob certifie officiellement vos kilomètres d&apos;entraide pour valoriser vos appels d&apos;offres.</li>
                                    <li><strong>Maintenance :</strong> Prolongez la durée de vie de votre véhicule en alternant les trajets.</li>
                                  </ul>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <input
                            type="range"
                            min="50"
                            max="500"
                            step="10"
                            value={formData.kmPerWeek}
                            onChange={e => setFormData({ ...formData, kmPerWeek: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                          />

                          {/* Savings box */}
                          <div className="p-4 bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl flex items-center justify-between gap-4 mt-2">
                            <div>
                              <p className="text-xs font-semibold text-[#10B981]">Budget carburant économisé :</p>
                              <p className="text-xs text-slate-500 mt-0.5">En partageant vos trajets sur {formData.kmPerWeek} km hebdomadaires.</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg sm:text-xl font-bold text-[#10B981] font-mono">~{annualSavings} €</span>
                              <span className="block text-[10px] font-semibold text-slate-400">Sauvegardés/an</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <p className="text-xs text-slate-400 text-center sm:text-left">Données sécurisées et cryptées conformément au RGPD français.</p>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-blue-300 text-white font-semibold text-sm rounded-xl cursor-pointer transition-colors shadow-xs"
                          >
                            {isSubmitting ? "Validation..." : "Proposer mon trajet"}
                          </button>
                        </div>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="form-success"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 text-center space-y-6"
                      >
                        <div className="w-12 h-12 bg-emerald-50 text-[#10B981] rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-slate-900 font-display">Demande de trajet enregistrée !</h4>
                          <p className="text-xs text-[#6B7280]">Votre profil pro est validé. Les artisans de votre axe recevront vos disponibilités.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-2 max-w-md mx-auto">
                          <div className="flex gap-2"><Check className="w-4 h-4 text-[#10B981] shrink-0" /><span>Itinéraire configuré : <strong>{formData.departCity} → {formData.arriveCity}</strong>.</span></div>
                          <div className="flex gap-2"><Check className="w-4 h-4 text-[#10B981] shrink-0" /><span>Notifications directes envoyées par email ({formData.email}) ou SMS ({formData.phone}).</span></div>
                        </div>
                        <button
                          onClick={() => {
                            setFormSubmitted(false);
                            setFormData({
                              companyName: '', email: '', phone: '', siret: '',
                              departCity: 'Montpellier', departExact: '', arriveCity: 'Saint-Jean-de-Védas', arriveExact: '',
                              days: ['Lundi', 'Mercredi'], schedule: '6h-9h', vehicleType: 'Utilitaire', kmPerWeek: 150,
                              freeSeats: 2, driverMaterialCapacity: 'Moyen volume (Coffre/Caisses)',
                              requiredSeats: 1, passengerMaterialVolume: 'Moyenne caisse à outils'
                            });
                          }}
                          className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer border-none"
                        >
                          Publier un autre trajet
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ARTISAN DASHBOARD VIEW */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-6 py-10 min-h-screen text-[#111827] text-left"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-150">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Espace Artisan Certifié</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Shield className="w-3.5 h-3.5" /> Siret validé
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2 tracking-tight font-display">
                  Tableau de bord : {formData.companyName || "Martin Plomberie"}
                </h2>
                <p className="text-xs text-[#6B7280] mt-1">
                  Pilotez votre flotte, estimez vos bilans carbones et connectez vos chantiers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-4 py-2.5 text-xs font-semibold text-[#111827] bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  ← Accueil Public
                </button>
                <button
                  onClick={() => {
                    setCurrentView('landing');
                    setTimeout(() => {
                      const onboardingEl = document.getElementById('onboarding-section');
                      if (onboardingEl) onboardingEl.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-xl cursor-pointer shadow-xs"
                >
                  + Nouveau trajet
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-1">
              {[
                { tab: 'overview', icon: LayoutDashboard, label: "Économies & CO2" },
                { tab: 'matches', icon: Users, label: "Copilotes Compatibles", badge: "3", badgeColor: "bg-blue-100 text-[#3B82F6]" },
                { tab: 'messages', icon: MessageSquare, label: "Messagerie de Chantier", badge: "1", badgeColor: "bg-emerald-100 text-[#10B981]" },
                { tab: 'profile', icon: User, label: "Fiche SIRET & Assurance" }
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveDashboardTab(item.tab)}
                  className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeDashboardTab === item.tab
                      ? 'border-[#3B82F6] text-[#3B82F6]'
                      : 'border-transparent text-[#6B7280] hover:text-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="min-h-[350px]">
              {activeDashboardTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { title: "Litres de carburant économisés", val: "450 Litres", desc: "Environ 25 pleins de fourgon évités", icon: Truck, color: "text-[#3B82F6] bg-blue-50" },
                      { title: "Budget net épargné", val: "832.50 €", desc: `Sur la base de ${formData.kmPerWeek} km/semaine`, icon: Wallet, color: "text-[#10B981] bg-emerald-50" },
                      { title: "Dossier CO2 évité (Certifié)", val: "1 170 kg", desc: "Valeur carbone éligible pour appels d'offres", icon: Shield, color: "text-purple-600 bg-purple-50" }
                    ].map((card, i) => (
                      <div key={i} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">{card.title}</span>
                          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{card.val}</div>
                          <span className="text-[11px] text-slate-500 font-medium block">{card.desc}</span>
                        </div>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                          <card.icon className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                      <h4 className="text-base font-bold text-[#111827] flex items-center gap-1.5 font-display"><History className="w-4 h-4 text-[#3B82F6]" /><span>Mes routes actives déclarées</span></h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#3B82F6]">{formRole === 'driver' ? 'Conducteur' : 'Passager'}</span>
                          <span className="text-xs text-[#10B981] font-semibold">● Recherche automatique active</span>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>Départ : {formData.departExact || `${formData.departCity} (Centre)`}</span></div>
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /><span>Arrivée : {formData.arriveExact || `${formData.arriveCity} (Chantier)`}</span></div>
                            </div>
                            <div className="sm:border-l border-slate-150 sm:pl-5 text-left shrink-0 text-xs text-slate-600">
                              <div><strong>Jours :</strong> {formData.days.length > 0 ? formData.days.join(', ') : 'Lundi, Mercredi'}</div>
                              <div className="mt-1"><strong>Créneau :</strong> {formData.schedule}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-4">
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5 font-display"><Shield className="w-4 h-4 text-[#10B981]" /><span>Justificatif RSE Pro</span></h4>
                      <div className="bg-[#1F2937] text-white p-5 rounded-2xl space-y-3.5 text-left relative overflow-hidden shadow-2xs">
                        <p className="text-xs text-slate-300 leading-relaxed">MutualJob compile vos déplacements de covoiturage pour vos dossiers d&apos;appel d&apos;offres publics.</p>
                        <button
                          onClick={() => alert("Génération du certificat RSE au format PDF en cours...")}
                          className="w-full py-2.5 bg-[#10B981] hover:bg-[#0e9f6e] text-white font-semibold text-xs rounded-xl cursor-pointer border-none shadow-xs transition-colors"
                        >
                          Générer mon attestation RSE (PDF)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeDashboardTab === 'matches' && (
                <motion.div key="matches" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <h4 className="text-base font-bold text-[#111827] font-display">Copilotes locaux compatibles détectés :</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: "Sébastien J. (Rennes Électricité)", cat: "Électricien", match: "95% compatible", sched: formData.schedule, city: "Rennes ➜ Dinan", cId: 2 },
                      { name: "Plomberie Martin & Fils", cat: "Plombier", match: "88% compatible", sched: formData.schedule, city: `${formData.departCity} ➜ ${formData.arriveCity}`, cId: 1 },
                      { name: "BTP Sud Carrelage", cat: "Carreleur / Maçon", match: "82% compatible", sched: formData.schedule, city: "Montpellier ➜ Lattes", cId: 3 }
                    ].map((m, idx) => (
                      <div key={idx} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs hover:border-[#3B82F6] flex flex-col justify-between gap-4 transition-all">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                            <span>{m.cat}</span>
                            <span className="font-mono text-slate-400">{m.match}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-sm font-display">{m.name}</h5>
                          <p className="text-xs text-[#6B7280]">{m.city}</p>
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 border border-slate-100 rounded flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Horaires : {m.sched}
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#10B981]">Siret vérifié</span>
                          <button
                            onClick={() => {
                              setActiveDashboardTab('messages');
                              setActiveChatId(m.cId);
                            }}
                            className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Messagerie
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeDashboardTab === 'messages' && (
                <motion.div key="messages" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col md:flex-row h-[500px]">
                  <div className="w-full md:w-72 border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h5 className="font-bold text-xs text-slate-900">Conversations</h5>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                      {[
                        { id: 1, name: "Plomberie Martin", ini: "PM", last: "Génial, merci beaucoup ! À lundi.", time: "09:47" },
                        { id: 2, name: "Électricité Breizh", ini: "EB", last: "Ah super idée, à mardi 7h alors !", time: "Hier", col: "bg-emerald-50 text-[#10B981]" },
                        { id: 3, name: "BTP Sud Carrelage", ini: "SC", last: "Oui tout à fait, c'est pile sur ma route...", time: "24 Sept" }
                      ].map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => setActiveChatId(conv.id)}
                          className={`w-full p-3.5 text-left flex gap-2.5 transition-colors cursor-pointer border-none outline-none ${
                            activeChatId === conv.id ? 'bg-blue-50/60 border-l-4 border-l-[#3B82F6]' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 font-mono ${conv.col || 'bg-blue-50 text-[#3B82F6]'}`}>{conv.ini}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline gap-1">
                              <span className="font-bold text-xs text-slate-800 truncate">{conv.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">{conv.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.last}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between bg-slate-50">
                    <div className="p-3.5 bg-white border-b border-slate-200 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center font-semibold text-xs font-mono shrink-0">
                        {activeChatId === 1 ? 'PM' : activeChatId === 2 ? 'EB' : 'SC'}
                      </div>
                      <div>
                        <h6 className="font-bold text-xs sm:text-sm text-slate-900 font-display">
                          {activeChatId === 1 ? 'Plomberie Martin & Fils' : activeChatId === 2 ? 'Électricité Breizh Pro' : 'BTP Sud Carrelage'}
                        </h6>
                        <span className="text-[10px] text-[#10B981] font-semibold flex items-center gap-0.5">Artisan vérifié</span>
                      </div>
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto space-y-3">
                      {chatConversations[activeChatId]?.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                          <div className="text-[9px] text-slate-400 mb-0.5 font-semibold">{msg.sender} • {msg.time}</div>
                          <div className={`p-3 rounded-xl max-w-xs text-xs leading-relaxed ${
                            msg.isUser ? 'bg-[#3B82F6] text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                          }`}>{msg.text}</div>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!chatInput.trim()) return;
                        const newMsg = {
                          sender: 'Moi',
                          text: chatInput.trim(),
                          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                          isUser: true
                        };
                        setChatConversations(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), newMsg] }));
                        setChatInput('');
                      }}
                      className="p-3 bg-white border-t border-slate-200 flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Répondez à cet artisan..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#3B82F6]"
                      />
                      <button type="submit" className="px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs rounded-xl shrink-0 flex items-center justify-center cursor-pointer transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeDashboardTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-left max-w-xl mx-auto space-y-6">
                  <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5 font-display"><Building2 className="w-5 h-5 text-[#3B82F6]" /><span>Fiche d&apos;entreprise validée</span></h4>
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-[10px] text-slate-400 font-semibold">Raison sociale</span><div className="font-bold text-slate-800 mt-0.5">{formData.companyName || "Martin Plomberie"}</div></div>
                      <div><span className="text-[10px] text-slate-400 font-semibold">SIRET Certifié</span><div className="font-mono font-bold text-[#10B981] mt-0.5">{formData.siret || "123 456 789 00012"}</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-[10px] text-slate-400 font-semibold">Email pro</span><div className="font-medium text-slate-600 mt-0.5">{formData.email || "contact@entreprise.fr"}</div></div>
                      <div><span className="text-[10px] text-slate-400 font-semibold">Téléphone</span><div className="font-medium text-slate-600 mt-0.5">{formData.phone || "06 12 34 56 78"}</div></div>
                    </div>
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-950 flex gap-2">
                      <Shield className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Vérification INSEE Pro</p>
                        <p className="text-emerald-800 leading-normal mt-0.5">Votre numéro SIRET a été certifié par l&apos;INSEE. Vos propositions de trajets bénéficient du badge artisan certifié.</p>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex gap-2">
                      <Settings className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">Assurance & Responsabilité Civile</p>
                        <p className="leading-normal mt-0.5">La Responsabilité Civile professionnelle (RC Pro) couvre intégralement les personnes et le matériel transportés lors de vos déplacements de chantier.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* FOOTER */}
        <footer className="bg-[#1F2937] text-slate-400 py-12 border-t border-slate-800 mt-20">
          <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
            <div className="flex items-center justify-center gap-2 text-white font-bold text-lg font-display">
              <div className="w-6 h-6 bg-[#3B82F6] rounded-md flex items-center justify-center text-white">
                <Truck className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Mutual<span className="text-[#3B82F6]">Job</span></span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              La première plateforme de covoiturage professionnel de chantiers réguliers pour les artisans et TPE de notre région.
            </p>
            <div className="flex justify-center gap-6 text-xs font-semibold">
              <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
              <span>·</span>
              <a href="#" className="hover:text-white transition-colors">CGU</a>
              <span>·</span>
              <a href="mailto:contact@mutualjob.fr" className="hover:text-[#3B82F6] transition-colors">contact@mutualjob.fr</a>
            </div>
            <div className="border-t border-slate-800 pt-6 text-[11px] text-slate-500">
              &copy; 2026 MutualJob Pro. Tous droits réservés. Design premium Deel & Figma style.
            </div>
          </div>
        </footer>

      </div>
    </APIProvider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<MutualJobApp />);
}
