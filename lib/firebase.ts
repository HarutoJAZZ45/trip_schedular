import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD5S7XtTnpPRtmHWtUiiHxMaAs0cl22bZQ",
    authDomain: "trip-scheduler45.firebaseapp.com",
    projectId: "trip-scheduler45",
    storageBucket: "trip-scheduler45.firebasestorage.app",
    messagingSenderId: "789144108322",
    appId: "1:789144108322:web:4c279ebcbd8ad01ba6b97b",
    measurementId: "G-L7760JNBY6"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
