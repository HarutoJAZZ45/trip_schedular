"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, MapPin, Trash2, Edit2, X, ChevronRight, Share2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useTrips, Trip } from "@/hooks/useTrip";
import { useRouter } from "next/navigation";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_THEME_COLOR } from "@/constants/colors";
import { auth } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";

import { Map, User as UserIcon } from "lucide-react";

export default function Home() {
  const { trips, addTrip, deleteTrip, updateTrip, selectTrip } = useTrips();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u: User | null) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // New Trip Form State
  const [title, setTitle] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);

  // Join Trip State
  const [isJoining, setIsJoining] = useState(false);
  const [joinTripId, setJoinTripId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleJoinTrip = () => {
    if (!joinTripId.trim()) return;
    // Check if already in list
    if (trips.some(t => t.id === joinTripId.trim())) {
      alert("この旅行はすでに追加されています。");
      return;
    }

    // We add it to the 'my-trips' list (which is cloud synced to user profile)
    // The data for the trip itself will be fetched via onSnapshot in useTripStorage
    // once the trip is selected.
    // For now, we need to know the title etc. to show it in the list.
    // In a real app, we'd fetch the trip metadata first.
    // Let's assume for now we just add the ID and let it populate or ask for a simple title.

    const newTrip: Trip = {
      id: joinTripId.trim(),
      title: "読み込み中...", // Temporary
      destinations: [],
      startDate: "",
      endDate: "",
      themeColor: DEFAULT_THEME_COLOR
    };

    addTrip(newTrip); // This needs to be modified to accept a full Trip object for joining
    setIsJoining(false);
    setJoinTripId("");
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    setTitle("");
    setDestinations([]);
    setNewCity("");
    setStartDate("");
    setEndDate("");
    setIsAdding(true);
  };

  const handleOpenEdit = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setTitle(trip.title);
    setDestinations(trip.destinations || []);
    setNewCity("");
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setThemeColor(trip.themeColor);
    setIsAdding(true);
  };



  const handleSaveTrip = () => {
    if (!title) return;

    if (editingTrip) {
      updateTrip(editingTrip.id, { title, destinations, startDate, endDate, themeColor });
    } else {
      const newTripId = addTrip({ title, destinations, startDate, endDate, themeColor });

      // Auto-generate schedule if dates are present
      if (startDate && endDate) {
        try {
          const days = eachDayOfInterval({
            start: parseISO(startDate),
            end: parseISO(endDate)
          });

          const initialSchedule = days.map((date, index) => ({
            day: `Day ${index + 1}`,
            date: format(date, "M/d"),
            events: []
          }));

          if (typeof window !== "undefined") {
            localStorage.setItem(`trip_${newTripId}_my-itinerary`, JSON.stringify(initialSchedule));
          }
        } catch (e) {
          console.error("Invalid dates for schedule generation", e);
        }
      }
    }
    setIsAdding(false);

    // User requested reload to ensure it's added.
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("この旅行を削除しますか？\n(データは復元できません)")) {
      deleteTrip(id);
    }
  };

  const handleSelectTrip = (id: string) => {
    selectTrip(id);
    router.push("/schedule");
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-32 pt-12 px-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-serif text-3xl text-gray-900 mb-2">My Trips</h1>
          <p className="text-gray-500 text-sm">以前の旅行とこれからの計画</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-100 shadow-sm">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white">
            <UserIcon size={16} />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Traveler ID</div>
            <div className="text-[10px] font-mono text-gray-600 max-w-[80px] truncate">{user?.uid || "..."}</div>
          </div>
        </div>
      </div>


      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MapPin size={24} />
          </div>
          <p>まだ旅行がありません。<br />新しい旅を追加しましょう！</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {trips.map((trip) => (
            <motion.div
              key={trip.id}
              variants={item}
              onClick={() => handleSelectTrip(trip.id)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative group active:scale-[0.98] transition-transform cursor-pointer overflow-hidden"
            >
              {/* Color Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: trip.themeColor || DEFAULT_THEME_COLOR }} />
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-bold text-lg text-gray-900 leading-tight">{trip.title}</h2>
                    {trip.destinations?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {trip.destinations.map((dest, idx) => (
                          <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wider">
                            {dest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>
                      {trip.startDate ? format(new Date(trip.startDate), 'yyyy/MM/dd') : '未定'}
                      {trip.endDate ? ` - ${format(new Date(trip.endDate), 'MM/dd')}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleCopyId(e, trip.id)}
                    className="p-2 text-gray-300 hover:text-blue-500 transition-colors z-10 relative"
                    title="Copy Trip ID"
                  >
                    {copiedId === trip.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(trip, e)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors z-10"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors z-10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 pointer-events-none">
                <ChevronRight size={20} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <button
        onClick={handleOpenAdd}
        className="fixed bottom-24 right-6 bg-gray-900 text-white p-4 rounded-full shadow-lg shadow-gray-900/30 hover:scale-105 transition-transform z-30 flex items-center gap-2"
      >
        <Plus size={24} />
      </button>

      {/* Join Button */}
      <button
        onClick={() => setIsJoining(true)}
        className="fixed bottom-24 right-24 bg-white text-gray-900 p-4 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform z-30 flex items-center gap-2"
      >
        <Share2 size={24} />
      </button>

      {/* Join Modal */}
      <AnimatePresence>
        {isJoining && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl">共有された旅行に参加</h2>
                <button onClick={() => setIsJoining(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">参加したい旅行の「Trip ID」を入力してください。</p>
                <input
                  value={joinTripId}
                  onChange={(e) => setJoinTripId(e.target.value)}
                  placeholder="Trip ID を入力"
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-mono text-xs"
                />
                <button
                  onClick={handleJoinTrip}
                  className="w-full py-4 bg-gray-900 text-white font-medium rounded-2xl shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"
                >
                  参加する
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl">{editingTrip ? "旅行を編集" : "新しい旅行"}</h2>
                <button onClick={() => setIsAdding(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="space-y-6 pb-32">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">タイトル</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: スペイン・ポルトガル旅行"
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all mb-6"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">目的地 (複数追加可)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCity.trim()) {
                            setDestinations([...destinations, newCity.trim()]);
                            setNewCity("");
                          }
                        }
                      }}
                      placeholder="例: Paris"
                      className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        if (newCity.trim()) {
                          setDestinations([...destinations, newCity.trim()]);
                          setNewCity("");
                        }
                      }}
                      className="p-4 bg-gray-100 rounded-2xl text-gray-600"
                    >
                      追加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {destinations.map((city, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-full text-xs animate-in fade-in zoom-in">
                        {city}
                        <button onClick={() => setDestinations(destinations.filter((_, i) => i !== idx))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">開始日</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">終了日</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">テーマカラー</label>
                  <ColorPicker selectedColor={themeColor} onSelect={setThemeColor} />
                </div>

                <button
                  onClick={handleSaveTrip}
                  disabled={!title}
                  className="w-full py-4 bg-gray-900 text-white font-medium rounded-2xl shadow-lg shadow-gray-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
