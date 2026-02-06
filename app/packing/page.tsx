"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, ShoppingBag, Wallet, Trash2, X, User, ArrowRight, Settings, Calendar as CalendarIcon, ChevronLeft, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useTripStorage } from "@/hooks/useTrip";
import Link from "next/link";
import { format } from "date-fns";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_THEME_COLOR } from "@/constants/colors";

// --- Types ---
interface PackingItem {
    id: string;
    name: string;
    checked: boolean;
    color?: string;
}

interface PackingGroup {
    category: string;
    items: PackingItem[];
}

// --- Walica (Group Expense) Types ---
interface Member {
    id: string;
    name: string;
}

type Currency = 'JPY' | 'EUR';

interface ExpenseItem {
    id: string;
    title: string;
    amount: number;
    currency: Currency;
    paidBy: string; // memberId
    splitWith: string[]; // memberIds
    date: string; // ISO Date "YYYY-MM-DD"
    category: 'food' | 'transport' | 'hotel' | 'shopping' | 'other';
    createdAt: number;
}

// --- Initial Data ---
const INITIAL_PACKING: PackingGroup[] = [];
// Default members usually include "Yourself" at least, but request said "Empty". 
// However, Walica needs members. Let's keep it empty or just 'Me'. 
// User said: "All empty". So [] for members too? No, you need at least one user to pay.
// Let's stick to [] and let user add members.
const INITIAL_MEMBERS: Member[] = [
    { id: 'm1', name: '自分' }
];

export default function PackingPage() {
    const [activeTab, setActiveTab] = useState<"packing" | "budget">("packing");

    // Persistence
    const [packingList, setPackingList] = useTripStorage<PackingGroup[]>("packing-list", INITIAL_PACKING);
    const [members, setMembers] = useTripStorage<Member[]>("trip-members", INITIAL_MEMBERS);
    const [expenses, setExpenses] = useTripStorage<ExpenseItem[]>("trip-expenses", []);
    const [exchangeRate, setExchangeRate] = useTripStorage<number>("eur-jpy-rate", 165); // Default 1€ = 165¥

    // Packing State
    const [isAddingPacking, setIsAddingPacking] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemCategory, setNewItemCategory] = useState("必需品");
    const [newItemColor, setNewItemColor] = useState(DEFAULT_THEME_COLOR);
    const [editingItem, setEditingItem] = useState<{ categoryIdx: number, item: PackingItem } | null>(null);

    // Budget/Walica State
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<ExpenseItem>>({
        title: "", amount: 0, currency: "JPY", paidBy: "m1", splitWith: [], date: format(new Date(), 'yyyy-MM-dd')
    });
    const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [sortMode, setSortMode] = useState<"recent" | "date-desc" | "date-asc">("recent");

    // Member State
    const [isManagingMembers, setIsManagingMembers] = useState(false);
    const [newMemberName, setNewMemberName] = useState("");

    // --- Packing Handlers ---
    const toggleCheck = (categoryIdx: number, itemId: string) => {
        const newList = [...packingList];
        const category = newList[categoryIdx];
        const item = category.items.find(i => i.id === itemId);
        if (item) item.checked = !item.checked;
        setPackingList(newList);
    };

    const handleEditItem = (categoryIdx: number, item: PackingItem) => {
        setEditingItem({ categoryIdx, item });
        setNewItemName(item.name);
        setNewItemCategory(packingList[categoryIdx].category);
        setNewItemColor(item.color || DEFAULT_THEME_COLOR);
        setIsAddingPacking(true);
    };

    const handleAddPackingClick = () => {
        setEditingItem(null);
        setNewItemName("");
        setNewItemColor(DEFAULT_THEME_COLOR);
        setIsAddingPacking(true);
    };

    const savePackingItem = () => {
        if (!newItemName) return;
        const newList = [...packingList];

        if (editingItem) {
            // Update logic
            const { categoryIdx, item } = editingItem;
            if (packingList[categoryIdx].category === newItemCategory) {
                const targetGroup = newList[categoryIdx];
                const targetItem = targetGroup.items.find(i => i.id === item.id);
                if (targetItem) {
                    targetItem.name = newItemName;
                    targetItem.color = newItemColor;
                }
            } else {
                // Move logic
                newList[categoryIdx].items = newList[categoryIdx].items.filter(i => i.id !== item.id);
                let newCatIdx = newList.findIndex(g => g.category === newItemCategory);
                if (newCatIdx === -1) {
                    newList.push({ category: newItemCategory, items: [] });
                    newCatIdx = newList.length - 1;
                }
                newList[newCatIdx].items.push({ id: item.id, name: newItemName, checked: item.checked, color: newItemColor });
            }
        } else {
            // Add New
            let categoryIndex = newList.findIndex(g => g.category === newItemCategory);
            if (categoryIndex === -1) {
                newList.push({ category: newItemCategory, items: [] });
                categoryIndex = newList.length - 1;
            }
            newList[categoryIndex].items.push({
                id: Date.now().toString(),
                name: newItemName,
                checked: false,
                color: newItemColor
            });
        }
        setPackingList(newList);
        setNewItemName("");
        setIsAddingPacking(false);
        setEditingItem(null);
    };

    const deletePackingItem = (categoryIdx: number, itemId: string) => {
        const newList = [...packingList];
        newList[categoryIdx].items = newList[categoryIdx].items.filter(i => i.id !== itemId);
        setPackingList(newList);
    };

    // --- Walica Handlers ---
    const addMember = () => {
        if (!newMemberName) return;
        const newMember: Member = { id: `m${Date.now()}`, name: newMemberName };
        setMembers([...members, newMember]);
        setNewMemberName("");
    };

    const deleteMember = (id: string) => {
        if (members.length <= 1) return alert("メンバーは最低1人必要です");
        if (confirm("メンバーを削除しますか？")) {
            setMembers(members.filter(m => m.id !== id));
        }
    };

    const handleEditExpense = (expense: ExpenseItem) => {
        setEditingExpense(expense);
        setNewExpense({
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            paidBy: expense.paidBy,
            splitWith: expense.splitWith,
            date: expense.date
        });
        setIsAddingExpense(true);
    };

    const handleAddExpenseClick = () => {
        setEditingExpense(null);
        setNewExpense({
            title: "", amount: 0, currency: "JPY",
            paidBy: members[0]?.id || 'm1',
            splitWith: members.map(m => m.id), // Default split all
            date: format(new Date(), 'yyyy-MM-dd')
        });
        setIsAddingExpense(true);
    };

    const saveExpense = () => {
        if (!newExpense.title || !newExpense.amount) return;

        const expenseData = {
            title: newExpense.title!,
            amount: Number(newExpense.amount),
            currency: newExpense.currency || 'JPY',
            paidBy: newExpense.paidBy || members[0].id,
            splitWith: newExpense.splitWith && newExpense.splitWith.length > 0 ? newExpense.splitWith : members.map(m => m.id),
            date: newExpense.date || format(new Date(), 'yyyy-MM-dd'),
            category: 'other' as const,
        };

        if (editingExpense) {
            setExpenses(expenses.map(e => e.id === editingExpense.id ? { ...e, ...expenseData } : e));
        } else {
            const newId = `e${Date.now()}`;
            setExpenses([{ id: newId, ...expenseData, createdAt: Date.now() }, ...expenses]);
        }
        setIsAddingExpense(false);
        setEditingExpense(null);
    };

    const deleteExpense = (id: string) => {
        if (confirm("削除しますか？")) {
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    const toggleSplitMember = (memberId: string) => {
        const current = newExpense.splitWith || [];
        if (current.includes(memberId)) {
            setNewExpense({ ...newExpense, splitWith: current.filter(id => id !== memberId) });
        } else {
            setNewExpense({ ...newExpense, splitWith: [...current, memberId] });
        }
    };

    // --- Calculations ---
    const getBalances = () => {
        // Init stats
        const stats: Record<string, { paid: number, share: number }> = {};
        members.forEach(m => stats[m.id] = { paid: 0, share: 0 });

        expenses.forEach(e => {
            // Convert to JPY if needed
            const amountInJPY = e.currency === 'EUR' ? e.amount * exchangeRate : e.amount;

            if (stats[e.paidBy]) {
                stats[e.paidBy].paid += amountInJPY;
            }
            const splitCount = e.splitWith.length;
            if (splitCount > 0) {
                const amountPerPerson = amountInJPY / splitCount;
                e.splitWith.forEach(mid => {
                    if (stats[mid]) {
                        stats[mid].share += amountPerPerson;
                    }
                });
            }
        });

        // Convert to array
        return members.map(m => ({
            ...m,
            paid: stats[m.id]?.paid || 0,
            share: stats[m.id]?.share || 0,
            balance: (stats[m.id]?.paid || 0) - (stats[m.id]?.share || 0)
        }));
    };

    const jpyBalances = getBalances();

    // Settlement Algorithm: Calculate who pays whom
    const settlements = useMemo(() => {
        const netBalances = jpyBalances.map(b => ({ id: b.id, name: b.name, balance: b.balance }));
        const debtors = netBalances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
        const creditors = netBalances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

        const transfers: { from: string, fromName: string, to: string, toName: string, amount: number }[] = [];

        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(-debtor.balance, creditor.balance);

            transfers.push({
                from: debtor.id,
                fromName: debtor.name,
                to: creditor.id,
                toName: creditor.name,
                amount: Math.round(amount)
            });

            debtor.balance += amount;
            creditor.balance -= amount;

            if (debtor.balance >= -0.01) i++;
            if (creditor.balance <= 0.01) j++;
        }
        return transfers;
    }, [jpyBalances]);

    // Sorted Expenses
    const sortedExpenses = useMemo(() => {
        const list = [...expenses];
        if (sortMode === "recent") return list; // createdAt desc is default in saveExpense
        if (sortMode === "date-desc") return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
        if (sortMode === "date-asc") return list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
        return list;
    }, [expenses, sortMode]);

    return (
        <div className="min-h-full bg-slate-50 pb-32">
            {/* Tab Header */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md pt-12 p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                    <Link href="/" className="flex items-center gap-1 p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors group">
                        <ChevronLeft size={24} />
                        <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Home</span>
                    </Link>
                    <h1 className="font-serif text-3xl text-gray-900">Preparation</h1>
                </div>
                <div className="flex p-1 bg-gray-100 rounded-xl relative">
                    <motion.div
                        className="absolute top-1 bottom-1 w-1/2 bg-white rounded-lg shadow-sm"
                        initial={false}
                        animate={{ x: activeTab === "packing" ? 0 : "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <button onClick={() => setActiveTab("packing")} className={clsx("flex-1 py-2 text-sm font-medium z-10 transition-colors", activeTab === "packing" ? "text-gray-900" : "text-gray-500")}>Packing</button>
                    <button onClick={() => setActiveTab("budget")} className={clsx("flex-1 py-2 text-sm font-medium z-10 transition-colors", activeTab === "budget" ? "text-gray-900" : "text-gray-500")}>Expenses</button>
                </div>
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {activeTab === "packing" ? (
                        <motion.div
                            key="packing"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {packingList.map((group, gIdx) => (
                                <div key={group.category}>
                                    <h3 className="text-xs uppercase tracking-widest text-muted font-bold mb-3 pl-1">{group.category}</h3>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                        {group.items.map((item) => (
                                            <div key={item.id} className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors group justify-between relative overflow-hidden">
                                                {/* Color Bar */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: item.color || DEFAULT_THEME_COLOR }} />

                                                <label className="flex items-center flex-1 cursor-pointer pl-2">
                                                    <div className="relative flex items-center justify-center w-5 h-5 border-2 border-gray-200 rounded-full group-hover:border-gray-900 transition-colors flex-shrink-0">
                                                        <input type="checkbox" className="peer appearance-none w-full h-full" checked={item.checked} onChange={() => toggleCheck(gIdx, item.id)} />
                                                        <Check size={12} className="text-white opacity-0 peer-checked:opacity-100 absolute pointer-events-none peer-checked:bg-gray-900 rounded-full w-full h-full p-0.5 transition-opacity" />
                                                    </div>
                                                    <span className={clsx("ml-3 text-gray-700 font-medium transition-all", item.checked && "text-gray-400 line-through")}>{item.name}</span>
                                                </label>
                                                <div className="flex gap-1 items-center">
                                                    <button onClick={() => handleEditItem(gIdx, item)} className="text-gray-300 hover:text-gray-900 p-2 transition-colors">
                                                        <Settings size={14} />
                                                    </button>
                                                    <button onClick={() => deletePackingItem(gIdx, item.id)} className="text-gray-300 hover:text-red-400 p-2 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddPackingClick} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-medium hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2">
                                <Plus size={16} /> アイテムを追加
                            </button>

                            {/* Packing Item Modal */}
                            <AnimatePresence>
                                {isAddingPacking && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
                                        >
                                            <div className="flex justify-between items-center mb-6">
                                                <h2 className="font-serif text-xl">{editingItem ? "アイテムを編集" : "アイテムを追加"}</h2>
                                                <button onClick={() => setIsAddingPacking(false)}><X size={20} className="text-gray-400" /></button>
                                            </div>
                                            <div className="space-y-4 pb-32">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">アイテム名</label>
                                                    <input
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        placeholder="例: サングラス"
                                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">カテゴリー</label>
                                                    <input
                                                        value={newItemCategory}
                                                        onChange={(e) => setNewItemCategory(e.target.value)}
                                                        placeholder="例: 必需品、電化製品"
                                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 mb-2"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        {packingList.map(g => (
                                                            <button
                                                                key={g.category}
                                                                onClick={() => setNewItemCategory(g.category)}
                                                                className={clsx("px-2 py-1 text-[10px] rounded border transition-colors", newItemCategory === g.category ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}
                                                            >
                                                                {g.category}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">カラータグ</label>
                                                    <ColorPicker selectedColor={newItemColor} onSelect={setNewItemColor} />
                                                </div>
                                                <button
                                                    onClick={savePackingItem}
                                                    className="w-full py-4 bg-gray-900 text-white font-medium rounded-xl shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"
                                                >
                                                    保存
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="budget"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                {/* JPY Summary Card */}
                                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 opacity-80">
                                            <Wallet size={16} />
                                            <span className="text-xs tracking-wider uppercase">Settlements (JPY)</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingRate(true)} className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-[10px] hover:bg-white/20 transition">
                                                <RefreshCw size={10} /> 1€ = {exchangeRate}¥
                                            </button>
                                            <button onClick={() => setIsManagingMembers(true)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition">
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        {jpyBalances.map(m => (
                                            <div key={m.id} className="flex justify-between border-b border-white/10 pb-2 last:border-0">
                                                <span>{m.name}</span>
                                                <div className="text-right">
                                                    <div className={clsx("font-mono font-bold text-lg", m.balance > 0 ? "text-emerald-400" : m.balance < 0 ? "text-rose-400" : "text-white/60")}>
                                                        {m.balance > 0 ? "+" : ""}{Math.round(m.balance).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-white/40">Paid: {Math.round(m.paid).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}

                                        {settlements.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/20">
                                                <h4 className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Suggested Settlement</h4>
                                                <div className="space-y-2">
                                                    {settlements.map((s, idx) => (
                                                        <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-rose-300">{s.fromName}</span>
                                                                <ArrowRight size={10} className="text-white/20" />
                                                                <span className="font-medium text-emerald-300">{s.toName}</span>
                                                            </div>
                                                            <span className="font-mono font-bold">¥{s.amount.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* History */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs uppercase tracking-wider text-muted font-bold">History</h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSortMode("recent")}
                                            className={clsx("text-[10px] px-2 py-1 rounded-full border transition-colors", sortMode === "recent" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300")}
                                        >
                                            Recent
                                        </button>
                                        <button
                                            onClick={() => setSortMode(sortMode === "date-desc" ? "date-asc" : "date-desc")}
                                            className={clsx("text-[10px] px-2 py-1 rounded-full border transition-colors flex items-center gap-1", sortMode.startsWith("date") ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300")}
                                        >
                                            Date {sortMode === "date-asc" ? "↑" : "↓"}
                                        </button>
                                    </div>
                                </div>
                                {sortedExpenses.map((item) => {
                                    const jpyAmount = item.currency === 'EUR' ? item.amount * exchangeRate : item.amount;
                                    return (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative group">
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <button onClick={() => handleEditExpense(item)} className="text-gray-300 hover:text-gray-900 p-2 transition-colors"><Settings size={14} /></button>
                                                <button onClick={() => deleteExpense(item.id)} className="text-gray-300 hover:text-red-400 p-2 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="flex justify-between items-start mb-1 pr-16">
                                                <div>
                                                    <div className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                                                        <CalendarIcon size={10} /> {item.date}
                                                    </div>
                                                    <div className="font-medium text-gray-900">{item.title}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono text-gray-900 font-bold">
                                                        ¥{Math.round(jpyAmount).toLocaleString()}
                                                    </div>
                                                    {item.currency === 'EUR' && (
                                                        <div className="text-[10px] text-gray-400 font-mono">
                                                            {item.amount.toFixed(2)}€
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{members.find(m => m.id === item.paidBy)?.name}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="text-gray-400">
                                                    {item.splitWith.length === members.length ? 'Everyone' :
                                                        item.splitWith.map(id => members.find(m => m.id === id)?.name).join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={handleAddExpenseClick} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-medium hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2">
                                <Plus size={16} /> 支出を追加
                            </button>

                            {/* Rate Editor Modal */}
                            <AnimatePresence>
                                {isEditingRate && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl"
                                        >
                                            <h2 className="font-bold text-lg mb-4">為替レート設定</h2>
                                            <div className="flex items-center gap-4 mb-6">
                                                <span className="text-2xl font-mono">1€ = </span>
                                                <input
                                                    type="number"
                                                    value={exchangeRate}
                                                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                                                    className="w-24 p-2 text-2xl font-bold border-b-2 border-gray-200 focus:border-gray-900 outline-none text-center font-mono"
                                                />
                                                <span className="text-2xl font-mono">¥</span>
                                            </div>
                                            <button onClick={() => setIsEditingRate(false)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl">完了</button>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Expense Modal (Updated) */}
            <AnimatePresence>
                {isAddingExpense && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[80vh]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-serif text-xl">{editingExpense ? "編集" : "新規追加"}</h2>
                                <button onClick={() => setIsAddingExpense(false)}><X size={20} className="text-gray-400" /></button>
                            </div>
                            <div className="space-y-4 pb-32">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">内容</label>
                                    <input value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="ランチ" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">金額</label>
                                        <input type="number" value={newExpense.amount || ''} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100" />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">通貨</label>
                                        <select value={newExpense.currency} onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value as Currency })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <option value="JPY">JPY</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">日付</label>
                                    <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">支払った人</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {members.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setNewExpense({ ...newExpense, paidBy: m.id })}
                                                className={clsx("px-3 py-2 rounded-lg text-sm border transition-colors", newExpense.paidBy === m.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">対象（誰の分？）</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {members.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => toggleSplitMember(m.id)}
                                                className={clsx("px-3 py-2 rounded-lg text-sm border transition-colors", newExpense.splitWith?.includes(m.id) ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-gray-400 border-gray-200")}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={saveExpense} className="w-full py-4 bg-gray-900 text-white font-medium rounded-xl shadow-lg mt-4">Save</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Member Modal same as before but using updated state */}
            <AnimatePresence>
                {isManagingMembers && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-serif text-xl">メンバー設定</h2>
                                <button onClick={() => setIsManagingMembers(false)}><X size={20} className="text-gray-400" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {members.map(m => (
                                        <div key={m.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                            <span className="font-medium">{m.name}</span>
                                            {members.length > 1 && (
                                                <button onClick={() => deleteMember(m.id)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                    <input
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        placeholder="新しい名前"
                                        className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100"
                                    />
                                    <button
                                        onClick={addMember}
                                        disabled={!newMemberName}
                                        className="px-4 bg-gray-900 text-white rounded-xl disabled:opacity-50"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
