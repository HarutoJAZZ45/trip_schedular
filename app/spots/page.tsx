"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, X, Trash2, Map, ChevronLeft, Search, Filter, Edit2, ChevronRight } from "lucide-react";
import { useTripStorage, useTrips } from "@/hooks/useTrip";
import Link from "next/link";
import { Spot } from "@/types/spot";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_THEME_COLOR } from "@/constants/colors";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const INITIAL_SPOTS: Spot[] = [];

function SpotsContent() {
    const searchParams = useSearchParams();
    const cityParam = searchParams.get("city");

    const [spots, setSpots] = useTripStorage<Spot[]>("saved-spots", INITIAL_SPOTS);
    const { getCurrentTrip } = useTrips();
    const currentTrip = getCurrentTrip();
    const tripDestinations = currentTrip?.destinations || [];
    const defaultCity = tripDestinations[0] || "Barcelona";

    const [isAdding, setIsAdding] = useState(false);
    const [filterCity, setFilterCity] = useState(cityParam || "All");
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);

    // Update filterCity if cityParam changes (e.g. navigating from schedule)
    useEffect(() => {
        if (cityParam) {
            setFilterCity(cityParam);
        }
    }, [cityParam]);

    // Form state
    const [formData, setFormData] = useState<{ name: string, category: string, location: string, color: string }>({
        name: "",
        category: "Sightseeing",
        location: defaultCity,
        color: DEFAULT_THEME_COLOR
    });

    const cities = useMemo(() => {
        const uniqueCities = new Set(["All", ...tripDestinations, ...spots.map(s => s.location)]);
        return Array.from(uniqueCities);
    }, [tripDestinations, spots]);

    const filteredSpots = filterCity === "All" ? spots : spots.filter(s => s.location === filterCity);

    const handleEditClick = (spot: Spot) => {
        setEditingSpot(spot);
        setFormData({
            name: spot.name,
            category: spot.category,
            location: spot.location,
            color: spot.color || DEFAULT_THEME_COLOR
        });
        setIsAdding(true);
    };

    const handleAddClick = () => {
        setEditingSpot(null);
        setFormData({ name: "", category: "Sightseeing", location: defaultCity, color: DEFAULT_THEME_COLOR });
        setIsAdding(true);
    };

    const saveSpot = () => {
        if (!formData.name) return;

        if (editingSpot) {
            // Update existing
            setSpots(spots.map(s => s.id === editingSpot.id ? { ...s, ...formData } : s));
        } else {
            // Add new
            const spot: Spot = {
                id: Date.now(),
                ...formData,
                rating: 0,
            };
            setSpots([spot, ...spots]);
        }
        setIsAdding(false);
        setEditingSpot(null);
    };

    const deleteSpot = (id: number) => {
        if (confirm("このスポットを削除しますか？")) {
            setSpots(spots.filter(s => s.id !== id));
        }
    };

    return (
        <div className="min-h-full bg-slate-50 pb-32">
            <div className="pt-12 px-6 pb-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <Link href="/" className="flex items-center gap-1 p-2 -ml-2 mb-2 text-gray-400 hover:text-gray-900 transition-colors group">
                            <ChevronLeft size={24} />
                            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Home</span>
                        </Link>
                        <h1 className="font-serif text-3xl text-gray-900 mb-2">Saved Spots</h1>
                        <p className="text-muted text-sm">行きたい場所リスト</p>
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="bg-gray-900 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* City Filter */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {cities.map(city => (
                        <button
                            key={city}
                            onClick={() => setFilterCity(city)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCity === city
                                ? "bg-gray-900 text-white"
                                : "bg-white text-gray-500 border border-gray-200"
                                }`}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-6 grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {filteredSpots.map((spot) => (
                        <motion.div
                            key={spot.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group relative flex justify-between items-center"
                        >
                            {/* Color Dot */}
                            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ backgroundColor: spot.color || DEFAULT_THEME_COLOR }} />

                            <div className="flex-1 pl-3">
                                <h3 className="font-serif text-lg text-gray-900 mb-1">{spot.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        {spot.location}
                                    </div>
                                    <span className="text-gray-300">•</span>
                                    <span>{spot.category}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + " " + spot.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-blue-500 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                                    title="Google Mapで見る"
                                >
                                    <Map size={18} />
                                </a>
                                <button
                                    onClick={() => handleEditClick(spot)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                    onClick={() => deleteSpot(spot.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-serif text-xl">{editingSpot ? "スポット編集" : "スポット追加"}</h2>
                                <button onClick={() => setIsAdding(false)}><X size={20} className="text-gray-400" /></button>
                            </div>
                            <div className="space-y-4 pb-32">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">名前</label>
                                    <input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="例: サン・ジョルジェ城"
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">都市</label>
                                        <select
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        >
                                            <option value="" disabled>都市を選択</option>
                                            {tripDestinations.map((city: string) => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                            {/* fallback for any legacy spots with custom locations */}
                                            {spots.map(s => s.location).filter(l => !tripDestinations.includes(l)).map(l => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">タイプ</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="Sightseeing">観光</option>
                                            <option value="Food">食事</option>
                                            <option value="Shop">買い物</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">カラータグ</label>
                                    <ColorPicker selectedColor={formData.color} onSelect={(color) => setFormData({ ...formData, color })} />
                                </div>

                                <button
                                    onClick={saveSpot}
                                    className="w-full py-4 bg-gray-900 text-white font-medium rounded-xl shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"
                                >
                                    保存
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SpotsPage() {
    return (
        <Suspense fallback={<div className="min-h-full bg-slate-50 pt-20 px-6 text-gray-400">Loading spots...</div>}>
            <SpotsContent />
        </Suspense>
    );
}
