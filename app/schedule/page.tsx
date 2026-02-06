"use client";

import { useTripStorage, useTrips } from "@/hooks/useTrip";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, School as Hotel, MapPin, Plane, Utensils, Train, Plus, Trash2, X, Edit2, ChevronLeft, Search } from "lucide-react";
import { clsx } from "clsx";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_THEME_COLOR } from "@/constants/colors";
import { Spot } from "@/types/spot";

// --- Types ---
type EventType = 'transit' | 'stay' | 'food' | 'activity' | 'other';

interface ScheduleEvent {
    id: number;
    time: string;
    title: string;
    type: EventType;
    description: string;
    place?: string;
    spotId?: number;
    color?: string;
}

interface DaySchedule {
    day: string;
    date: string;
    events: ScheduleEvent[];
}

const INITIAL_SCHEDULE: DaySchedule[] = [];

const ICONS = {
    transit: Plane,
    stay: Hotel,
    food: Utensils,
    activity: MapPin,
    other: Coffee
}

export default function SchedulePage() {
    const [schedule, setSchedule] = useTripStorage<DaySchedule[]>("my-itinerary", INITIAL_SCHEDULE);
    const [spots, setSpots] = useTripStorage<Spot[]>("saved-spots", []);
    const [selectedDayIndex, setSelectedDayIndex] = useTripStorage<number>("last-viewed-day-index", 0);
    const [isAdding, setIsAdding] = useState(false);
    const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const activeDayRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (activeDayRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const element = activeDayRef.current;
            const scrollLeft = element.offsetLeft - container.offsetWidth / 2 + element.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [selectedDayIndex, schedule]);

    // New Event State
    const [newEvent, setNewEvent] = useState<{
        time: string; title: string; description: string; type: EventType; color: string; place: string; spotId?: number
    }>({
        time: "", title: "", description: "", type: "activity", color: DEFAULT_THEME_COLOR, place: ""
    });

    const [placeSearch, setPlaceSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [isCreatingSpot, setIsCreatingSpot] = useState(false);
    const [newSpotData, setNewSpotData] = useState<{ location: string, category: string, color: string }>({
        location: "", category: "Sightseeing", color: DEFAULT_THEME_COLOR
    });

    const { getCurrentTrip } = useTrips();
    const currentTrip = getCurrentTrip();

    // Get unique cities for autocomplete
    const cities = useMemo(() => {
        const tripDestinations = currentTrip?.destinations || [];
        return Array.from(new Set([...tripDestinations, ...spots.map(s => s.location)]));
    }, [spots, currentTrip]);

    const handleEditEvent = (event: ScheduleEvent) => {
        setEditingEvent(event);
        setNewEvent({
            time: event.time,
            title: event.title,
            description: event.description,
            type: event.type,
            color: event.color || DEFAULT_THEME_COLOR,
            place: event.place || "",
            spotId: event.spotId
        });
        setPlaceSearch(event.place || "");
        setIsAdding(true);
        setIsCreatingSpot(false); // Reset
    };

    const handleAddClick = () => {
        setEditingEvent(null);
        setNewEvent({ time: "", title: "", description: "", type: "activity", color: DEFAULT_THEME_COLOR, place: "" });
        setPlaceSearch("");
        setIsAdding(true);
        setIsCreatingSpot(false); // Reset
    };

    // Spot Search Logic
    const filteredSpots = useMemo(() => {
        if (!placeSearch) return [];
        return spots.filter(s => s.name.toLowerCase().includes(placeSearch.toLowerCase()));
    }, [spots, placeSearch]);

    const handleSelectSpot = (spot: Spot) => {
        setNewEvent(prev => ({ ...prev, spotId: spot.id, place: spot.name })); // Sync place name
        setPlaceSearch(spot.name);
        setShowSuggestions(false);
        setIsCreatingSpot(false);
    };

    const handleInitCreateSpot = () => {
        setIsCreatingSpot(true);
        const tripDestinations = currentTrip?.destinations || [];
        setNewSpotData({ location: tripDestinations[0] || "", category: "Sightseeing", color: DEFAULT_THEME_COLOR });
        setShowSuggestions(false);
    };

    const handleSaveEvent = () => {
        if (!newEvent.title) return;

        let finalSpotId = newEvent.spotId;
        const currentPlaceName = placeSearch; // Use current search text

        // If creating a new spot inline
        if (isCreatingSpot && currentPlaceName) {
            const newSpot: Spot = {
                id: Date.now(),
                name: currentPlaceName,
                category: newSpotData.category,
                location: newSpotData.location || "Unknown",
                rating: 0,
                color: newSpotData.color
            };
            // Save spot
            setSpots([...spots, newSpot]);
            finalSpotId = newSpot.id;
        }

        const updatedSchedule = [...schedule];
        const eventDataToSave = {
            ...newEvent,
            place: currentPlaceName, // Ensure place name matches input
            spotId: finalSpotId
        };

        if (editingEvent) {
            // Update existing
            const dayEvents = updatedSchedule[selectedDayIndex].events;
            const eventIndex = dayEvents.findIndex(e => e.id === editingEvent.id);
            if (eventIndex !== -1) {
                dayEvents[eventIndex] = {
                    ...editingEvent,
                    ...eventDataToSave
                };
            }
        } else {
            // Add new
            const newId = Date.now();
            // Ensure unique ID if created in same ms as spot (unlikely but safe) (Wait, Date.now() collision is possible if fast)
            // Just add 1 to be safe or use random.
            updatedSchedule[selectedDayIndex].events.push({
                id: newId + 1,
                ...eventDataToSave
            });
        }

        // Sort by time roughly
        updatedSchedule[selectedDayIndex].events.sort((a, b) => a.time.localeCompare(b.time));

        setSchedule(updatedSchedule);
        setIsAdding(false);
        setEditingEvent(null);
        setNewEvent({ time: "", title: "", description: "", type: "activity", color: DEFAULT_THEME_COLOR, place: "" });
        setIsCreatingSpot(false);
    };

    const handleDeleteEvent = (id: number) => {
        if (!confirm("この予定を削除しますか？")) return;
        const updatedSchedule = [...schedule];
        updatedSchedule[selectedDayIndex].events = updatedSchedule[selectedDayIndex].events.filter(e => e.id !== id);
        setSchedule(updatedSchedule);
    };

    const currentDay = schedule[selectedDayIndex];

    if (!currentDay) {
        return (
            <div className="min-h-full bg-slate-50 pb-32">
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 pt-12 pb-4 px-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Link href="/" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                        <h1 className="font-serif text-3xl text-gray-900">Itinerary</h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400 px-6 text-center">
                    <p>この旅行の日程はまだありません。</p>
                    <p className="text-sm mt-2">（日程を追加する機能は未実装です。テスト旅行を作成してください）</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-slate-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 pt-12 pb-4 px-6">
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/" className="flex items-center gap-1 p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors group">
                        <ChevronLeft size={24} />
                        <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Home</span>
                    </Link>
                    <h1 className="font-serif text-3xl text-gray-900">Itinerary</h1>
                </div>
                <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
                    {schedule.map((day, i) => (
                        <button
                            key={day.day}
                            ref={i === selectedDayIndex ? activeDayRef : null}
                            onClick={() => setSelectedDayIndex(i)}
                            className={clsx(
                                "flex-shrink-0 px-4 py-2 rounded-2xl transition-all border text-center min-w-[80px]",
                                i === selectedDayIndex
                                    ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20 scale-105"
                                    : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                            )}
                        >
                            <span className="block text-lg font-bold font-mono leading-none mb-1">{day.date}</span>
                            <span className="block text-[10px] uppercase tracking-widest opacity-60">{day.day}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="px-6 pt-6 min-h-[50vh]">
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-12">
                    {currentDay.events.length === 0 && (
                        <p className="text-gray-400 pl-8 pt-4">予定はまだありません。</p>
                    )}

                    <AnimatePresence mode="popLayout">
                        {currentDay.events.map((event, index) => {
                            const Icon = ICONS[event.type] || MapPin;
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={event.id}
                                    className="relative pl-8 group"
                                >
                                    {/* Dot */}
                                    <div
                                        className={clsx(
                                            "absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                                        )}
                                        style={{ backgroundColor: event.color || (event.type === 'transit' ? '#A1A1AA' : DEFAULT_THEME_COLOR) }}
                                    />

                                    {/* Card */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50 relative">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <button
                                                onClick={() => handleEditEvent(event)}
                                                className="p-2 text-gray-300 hover:text-gray-900 transition-opacity"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="p-2 text-gray-300 hover:text-red-400 transition-opacity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-start mb-2 pr-16">
                                            <span className="text-sm font-medium text-gray-500 font-mono tracking-tighter bg-gray-100 px-2 py-0.5 rounded-md">
                                                {event.time}
                                            </span>
                                            <Icon size={16} className="text-gray-400" />
                                        </div>
                                        <h3 className="font-serif text-lg text-gray-900 leading-snug mb-1">
                                            {event.title}
                                        </h3>

                                        {/* Place Link */}
                                        {event.place && (
                                            <Link
                                                href={`/spots?city=${encodeURIComponent(
                                                    event.spotId
                                                        ? spots.find(s => s.id === event.spotId)?.location || ""
                                                        : ""
                                                )}`}
                                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium mb-2 w-fit transition-colors"
                                            >
                                                <MapPin size={10} />
                                                <span className="underline decoration-blue-500/30 underline-offset-2">{event.place}</span>
                                            </Link>
                                        )}
                                        <p className="text-sm text-gray-500 font-light leading-relaxed whitespace-pre-wrap">
                                            {event.description}
                                        </p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Prev/Next Navigation */}
            <div className="fixed bottom-24 left-6 right-6 flex justify-between pointer-events-none z-30">
                <button
                    onClick={() => setSelectedDayIndex(prev => Math.max(0, prev - 1))}
                    disabled={selectedDayIndex === 0}
                    className="bg-white/90 backdrop-blur-md text-gray-900 p-4 rounded-full shadow-lg border border-gray-100 pointer-events-auto disabled:opacity-0 disabled:pointer-events-none active:scale-95 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1" /> {/* Spacer */}
                <button
                    onClick={() => setSelectedDayIndex(prev => Math.min(schedule.length - 1, prev + 1))}
                    disabled={selectedDayIndex === schedule.length - 1}
                    className="bg-white/90 backdrop-blur-md text-gray-900 p-4 rounded-full shadow-lg border border-gray-100 pointer-events-auto disabled:opacity-0 disabled:pointer-events-none active:scale-95 transition-all mr-20"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* FAB */}
            <button
                onClick={handleAddClick}
                className="fixed bottom-24 right-6 bg-gray-900 text-white p-4 rounded-full shadow-lg shadow-gray-900/30 hover:scale-105 transition-transform z-30"
            >
                <Plus size={24} />
            </button>

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
                                <h2 className="font-serif text-xl">{editingEvent ? "予定を編集" : "予定を追加"}</h2>
                                <button onClick={() => setIsAdding(false)}><X size={20} className="text-gray-400" /></button>
                            </div>

                            <div className="space-y-4 pb-32">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">タイトル</label>
                                    <input
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                        placeholder="例: ランチ @ Sol"
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">時間</label>
                                        <input
                                            type="time"
                                            value={newEvent.time}
                                            onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">タイプ</label>
                                        <select
                                            value={newEvent.type}
                                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        >
                                            <option value="activity">観光 (Activity)</option>
                                            <option value="transit">移動 (Transit)</option>
                                            <option value="food">食事 (Food)</option>
                                            <option value="stay">宿泊 (Stay)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Place Input with Auto-Complete */}
                                <div className="relative">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">場所 (スポット)</label>
                                    <div className="relative">
                                        <input
                                            value={placeSearch}
                                            onChange={(e) => {
                                                setPlaceSearch(e.target.value);
                                                setShowSuggestions(true);
                                                setNewEvent(prev => ({ ...prev, place: e.target.value, spotId: undefined }));
                                                if (e.target.value === "") setIsCreatingSpot(false);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder="場所を検索または入力"
                                            className="w-full p-3 pl-9 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        />
                                        <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && placeSearch && !isCreatingSpot && (
                                        <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                                            {filteredSpots.map(spot => (
                                                <button
                                                    key={spot.id}
                                                    onClick={() => handleSelectSpot(spot)}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
                                                >
                                                    <span className="font-medium text-gray-700">{spot.name}</span>
                                                    <span className="text-xs text-gray-400">{spot.location}</span>
                                                </button>
                                            ))}
                                            {/* Create New Option */}
                                            <button
                                                onClick={handleInitCreateSpot}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2"
                                            >
                                                <Plus size={14} />
                                                "{placeSearch}" を新しいスポットとして登録
                                            </button>
                                        </div>
                                    )}

                                    {/* Inline Spot Creation Fields */}
                                    {isCreatingSpot && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="mt-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 space-y-3"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase">新しいスポット詳細</span>
                                                <button onClick={() => setIsCreatingSpot(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                            </div>

                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <select
                                                        value={newSpotData.location}
                                                        onChange={(e) => setNewSpotData({ ...newSpotData, location: e.target.value })}
                                                        className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                                                    >
                                                        <option value="" disabled>都市</option>
                                                        {currentTrip?.destinations?.map((city: string) => (
                                                            <option key={city} value={city}>{city}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <select
                                                        value={newSpotData.category}
                                                        onChange={(e) => setNewSpotData({ ...newSpotData, category: e.target.value })}
                                                        className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                                                    >
                                                        <option>Sightseeing</option>
                                                        <option>Food</option>
                                                        <option>Cafe</option>
                                                        <option>Shopping</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <ColorPicker selectedColor={newSpotData.color} onSelect={(c) => setNewSpotData({ ...newSpotData, color: c })} />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">カラー (イベント用)</label>
                                    <ColorPicker selectedColor={newEvent.color} onSelect={(color) => setNewEvent({ ...newEvent, color })} />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">メモ</label>
                                    <textarea
                                        value={newEvent.description}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-24 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveEvent}
                                    className="w-full py-4 bg-gray-900 text-white font-medium rounded-xl shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"
                                >
                                    保存 {isCreatingSpot ? "& スポット登録" : ""}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
