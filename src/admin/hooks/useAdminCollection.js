import { useCallback, useEffect, useState } from 'react';
import { fetchCollectionPage } from '../../services/adminService';

/**
 * Loads one page of a Firestore collection for the admin tables and exposes a manual
 * refresh. Reads are deliberately paged rather than live so a busy collection cannot
 * flood the client.
 *
 * @param {string} collectionName
 * @param {{pageSize?: number, orderField?: string}} options
 */
export const useAdminCollection = (collectionName, { pageSize = 100, orderField = 'createdAt' } = {}) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshedAt, setRefreshedAt] = useState(null);

    const refresh = useCallback(async () => {
        if (!collectionName) return;
        setLoading(true);
        setError(null);
        try {
            const page = await fetchCollectionPage(collectionName, { pageSize, orderField });
            setItems(page);
            setRefreshedAt(new Date());
        } catch (err) {
            setError(err.message || `Could not load ${collectionName}.`);
        } finally {
            setLoading(false);
        }
    }, [collectionName, pageSize, orderField]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { items, loading, error, refresh, refreshedAt };
};