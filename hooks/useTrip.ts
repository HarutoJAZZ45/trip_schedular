"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, getDoc, DocumentSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

export interface Trip {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    themeColor: string; // hex code
    destinations: string[];
}

// Keys that should be synced to the cloud
const CLOUD_SYNC_KEYS = [
    "my-trips",        // User profile: list of trips
    "my-itinerary",    // Trip-shared: schedule
    "saved-spots",     // Trip-shared: spots
    "trip-expenses",   // Trip-shared: expenses
    "trip-members",    // Trip-shared: members
    "packing-list"     // User-specific: packing list (not shared)
];

// Keys that should be stored per-user (not shared with trip collaborators)
const USER_SPECIFIC_KEYS = [
    "packing-list"
];

// Wrapper for useLocalStorage that optionally syncs with Firestore
export function useTripStorage<T>(key: string, initialValue: T) {
    const [currentTripId] = useLocalStorage<string | null>("current-trip-id", null);
    const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

    // 1. Local Storage fallback
    const namespacedKey = currentTripId ? `trip_${currentTripId}_${key}` : `global_${key}`;
    const [localValue, setLocalValue] = useLocalStorage<T>(namespacedKey, initialValue);

    // 2. State to hold the final value (either local or cloud)
    const [value, setValue] = useState<T>(localValue);
    const isCloudSync = CLOUD_SYNC_KEYS.includes(key);
    const skipCloudUpdate = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            setUserId(user ? user.uid : null);
        });
        return () => unsubscribe();
    }, []);

    // 3. Firestore Sync Logic
    useEffect(() => {
        if (!isCloudSync || !userId) {
            setValue(localValue);
            return;
        }

        // Determine Firestore doc path
        let docPath: string | null = null;
        if (key === "my-trips") {
            // User profile data
            docPath = `users/${userId}/profile/${key}`;
        } else if (USER_SPECIFIC_KEYS.includes(key) && currentTripId) {
            // User-specific trip data (e.g., packing list)
            docPath = `users/${userId}/trips/${currentTripId}/${key}`;
        } else if (currentTripId) {
            // Trip-shared data (e.g., schedule, spots, expenses)
            docPath = `trips/${currentTripId}/data/${key}`;
        }

        if (!docPath) {
            setValue(localValue);
            return;
        }

        const docRef = doc(db, docPath);

        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloudData = (docSnap.data() as { value: T }).value;
                skipCloudUpdate.current = true;
                setValue(cloudData);
                setLocalValue(cloudData); // Keeps local in sync for offline
                setTimeout(() => { skipCloudUpdate.current = false; }, 100);
            } else {
                // Document doesn't exist yet, use local value
                setValue(localValue);
            }
        });

        return () => unsub();
    }, [isCloudSync, userId, currentTripId, key, setLocalValue]);

    // 4. Update function
    const updateValue = async (newValue: T | ((prev: T) => T)) => {
        const resolvedValue = newValue instanceof Function ? newValue(value) : newValue;

        // Always update local for responsiveness
        setValue(resolvedValue);
        setLocalValue(resolvedValue);

        if (isCloudSync && userId && !skipCloudUpdate.current) {
            let docPath: string | null = null;
            if (key === "my-trips") {
                // User profile data
                docPath = `users/${userId}/profile/${key}`;
            } else if (USER_SPECIFIC_KEYS.includes(key) && currentTripId) {
                docPath = `users/${userId}/trips/${currentTripId}/${key}`;
            } else if (currentTripId) {
                docPath = `trips/${currentTripId}/data/${key}`;
            }

            if (docPath) {
                console.log(`[useTripStorage] Writing to Firestore:`, { key, docPath, userId, dataLength: JSON.stringify(resolvedValue).length });
                await setDoc(doc(db, docPath), { value: resolvedValue }, { merge: true });
                console.log(`[useTripStorage] Write successful:`, { key, docPath });
            }
        }
    };

    return [value, updateValue] as const;
}

// Hook to manage the trips list itself
export function useTrips() {
    // We use the new useTripStorage for "my-trips" so it syncs to user's profile
    const [trips, setTrips] = useTripStorage<Trip[]>("my-trips", []);
    const [currentTripId, setCurrentTripId] = useLocalStorage<string | null>("current-trip-id", null);
    const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u: User | null) => setUserId(u ? u.uid : null));
        return () => unsubscribe();
    }, []);

    const addTrip = async (tripData: Omit<Trip, "id"> | Trip) => {
        const isJoining = 'id' in tripData;
        const newTripId = isJoining ? tripData.id : Date.now().toString();
        const newTrip = { ...tripData, id: newTripId } as Trip;

        setTrips([...trips, newTrip]);

        if (!isJoining && userId) {
            await setDoc(doc(db, `trips/${newTripId}/metadata/main`), { ...newTrip }, { merge: true });
        }

        return newTripId;
    };

    const updateTrip = (id: string, updates: Partial<Trip>) => {
        setTrips(trips.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTrip = (id: string) => {
        setTrips(trips.filter(t => t.id !== id));
        if (currentTripId === id) {
            setCurrentTripId(null);
        }
    };

    const selectTrip = (id: string) => {
        setCurrentTripId(id);
    };

    const getCurrentTrip = () => trips.find(t => t.id === currentTripId);

    return {
        trips,
        currentTripId,
        addTrip,
        updateTrip,
        deleteTrip,
        selectTrip,
        getCurrentTrip
    };
}
