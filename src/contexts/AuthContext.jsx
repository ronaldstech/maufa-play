import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password, name) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Create user profile in Firestore
        const profileData = {
            uid: user.uid,
            email: user.email,
            displayName: name,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profileData);
        setUserProfile(profileData);
        return result;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function loginWithGoogle() {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check/Sync with Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const profileData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`,
                createdAt: new Date().toISOString()
            };
            await setDoc(userRef, profileData);
            setUserProfile(profileData);
        }

        return result;
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        let unsubProfile = () => { }; // Initialize as a no-op function

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Listen to user profile changes
                const userRef = doc(db, 'users', user.uid);
                unsubProfile = onSnapshot(userRef, (doc) => {
                    if (doc.exists()) {
                        setUserProfile(doc.data());
                    } else {
                        setUserProfile(null); // User profile might have been deleted
                    }
                });
            } else {
                setUserProfile(null);
                unsubProfile(); // Unsubscribe from profile listener when user logs out
            }
            setLoading(false);
        });

        return () => {
            unsubscribe(); // Unsubscribe from auth state changes
            unsubProfile(); // Unsubscribe from profile listener
        };
    }, []);

    const value = {
        currentUser,
        userProfile,
        login,
        signup,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
