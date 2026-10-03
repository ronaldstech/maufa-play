import {
    collection,
    count,
    deleteDoc,
    doc,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_ROLE } from '../admin/permissions';

const USERS = 'users';
const RESULTS = 'quiz_results';
const COMPANION_SESSIONS = 'companion_sessions';

/**
 * Every community-generated content collection the admin area can moderate.
 * `playsField` differs because scenario runs were introduced with a `plays` counter.
 */
export const CONTENT_SOURCES = [
    {
        key: 'quizzes',
        label: 'Quizzes',
        collection: 'quizzes',
        gameType: 'AI Quiz Generator',
        gameId: 1,
        playsField: 'attempts',
        itemLabel: 'question',
        itemsLabel: 'questions'
    },
    {
        key: 'flashcards',
        label: 'Flashcards',
        collection: 'flashcards',
        gameType: 'AI Flashcard Battle',
        gameId: 2,
        playsField: 'attempts',
        itemLabel: 'card',
        itemsLabel: 'cards'
    },
    {
        key: 'puzzles',
        label: 'Puzzles',
        collection: 'puzzles',
        gameType: 'AI Puzzle Generator',
        gameId: 5,
        playsField: 'attempts',
        itemLabel: 'puzzle',
        itemsLabel: 'puzzles'
    },
    {
        key: 'bosses',
        label: 'Boss Battles',
        collection: 'bosses',
        gameType: 'AI Boss Battle',
        gameId: 6,
        playsField: 'attempts',
        itemLabel: 'round',
        itemsLabel: 'rounds'
    },
    {
        key: 'debates',
        label: 'Debates',
        collection: 'debates',
        gameType: 'AI Debate Game',
        gameId: 3,
        playsField: 'attempts',
        itemLabel: 'topic',
        itemsLabel: 'topics'
    },
    {
        key: 'scenarios',
        label: 'Scenarios',
        collection: 'scenarios',
        gameType: 'AI Scenario Simulator',
        gameId: 4,
        playsField: 'plays',
        itemLabel: 'scenario',
        itemsLabel: 'scenarios'
    }
];

export const getContentSource = (key) => CONTENT_SOURCES.find((source) => source.key === key) || null;

const normalise = (docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data()
});

/** Reads a page of a collection, newest first. */
export const fetchCollectionPage = async (collectionName, { pageSize = 100, orderField = 'createdAt' } = {}) => {
    const q = query(collection(db, collectionName), orderBy(orderField, 'desc'), limit(pageSize));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalise);
};

/** Cheap server-side count, used for the dashboard cards. */
export const fetchCollectionCount = async (collectionName) => {
    try {
        const snapshot = await getCountFromServer(query(collection(db, collectionName), count()));
        return snapshot.data().count;
    } catch (error) {
        console.error(`Count failed for ${collectionName}:`, error);
        return null;
    }
};

export const deleteRecord = async (collectionName, id) => {
    await deleteDoc(doc(db, collectionName, id));
};

export const fetchUsers = async ({ pageSize = 200 } = {}) => {
    const q = query(collection(db, USERS), limit(pageSize));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalise).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
};

export const fetchUsersPageCount = async () => fetchCollectionCount(USERS);

export const updateUserRole = async (uid, role) => {
    await setDoc(doc(db, USERS, uid), { role }, { merge: true });
};

export const setUserBanned = async (uid, { banned, reason = '' }) => {
    await setDoc(doc(db, USERS, uid), {
        banned: Boolean(banned),
        bannedReason: banned ? reason || null : null,
        bannedAt: banned ? serverTimestamp() : null
    }, { merge: true });
};

export const fetchResults = async ({ pageSize = 200 } = {}) => {
    const q = query(collection(db, RESULTS), orderBy('timestamp', 'desc'), limit(pageSize));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalise);
};

export const fetchCompanionSessions = async ({ pageSize = 200 } = {}) => {
    const q = query(collection(db, COMPANION_SESSIONS), orderBy('updatedAt', 'desc'), limit(pageSize));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalise);
};

export const fetchActivityCounts = async () => {
    const entries = await Promise.all([
        fetchCollectionCount(RESULTS),
        fetchCollectionCount(COMPANION_SESSIONS)
    ]);
    return { results: entries[0], companionSessions: entries[1] };
};

export const fetchPlatformCounts = async () => {
    const names = [USERS, ...CONTENT_SOURCES.map((source) => source.collection)];
    const counts = await Promise.all(names.map((name) => fetchCollectionCount(name)));

    const byCollection = names.reduce((acc, name, index) => {
        acc[name] = counts[index];
        return acc;
    }, {});

    const contentTotal = CONTENT_SOURCES.reduce((sum, source) => sum + (byCollection[source.collection] || 0), 0);

    return {
        users: byCollection[USERS],
        contentTotal,
        contentBySource: CONTENT_SOURCES.map((source) => ({
            ...source,
            count: byCollection[source.collection] || 0
        }))
    };
};

export const getStaffCounts = async () => {
    const users = await fetchUsers({ pageSize: 500 });
    return {
        total: users.length,
        staff: users.filter((user) => user.role && user.role !== DEFAULT_ROLE).length,
        banned: users.filter((user) => user.banned === true).length
    };
};