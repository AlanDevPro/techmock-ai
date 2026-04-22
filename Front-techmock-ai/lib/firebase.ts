// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSa_-dIopUKLBcwfVp_19N1ZeXooFqNJ4",
  authDomain: "techmock-ai.firebaseapp.com",
  projectId: "techmock-ai",
  storageBucket: "techmock-ai.firebasestorage.app",
  messagingSenderId: "1087146527627",
  appId: "1:1087146527627:web:f3a83828121d0daaa6bd8e",
  measurementId: "G-MB0QR155V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export { analytics };
export default app;