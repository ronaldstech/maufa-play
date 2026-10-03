import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'app_settings', 'platform');

/**
 * Per-game availability, stored in `app_settings/platform`.
 *
 * Shape: { games: { "1": { enabled: boolean, comingSoon: boolean }, ... } }
 */
export const fetchPlatformSettings = async () => {
    try {
        const snapshot = await getDoc(SETTINGS_DOC);
        return snapshot.exists() ? snapshot.data() : { games: {} };
    } catch (error) {
        console.error('Error loading platform settings:', error);
        return { games: {} };
    }
};

export const savePlatformSettings = async (settings) => {
    await setDoc(SETTINGS_DOC, settings, { merge: true });
};