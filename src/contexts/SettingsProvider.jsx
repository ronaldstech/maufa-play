import { useCallback, useEffect, useMemo, useState } from 'react';
import { SettingsContext } from './settings-context';
import { fetchPlatformSettings, savePlatformSettings } from '../services/settingsService';
import { resolveGameAvailability } from '../config/games';

const DEFAULT_AVAILABILITY = resolveGameAvailability({ games: {} });

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({ games: {} });
    const [gameAvailability, setGameAvailability] = useState(DEFAULT_AVAILABILITY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        fetchPlatformSettings().then((loaded) => {
            if (!active) return;
            setSettings(loaded);
            setGameAvailability(resolveGameAvailability(loaded));
            setLoading(false);
        });

        return () => {
            active = false;
        };
    }, []);

    const updateGameAvailability = useCallback(async (gameId, patch) => {
        const key = String(gameId);
        const previous = gameAvailability;
        const next = {
            ...gameAvailability,
            [gameId]: { ...gameAvailability[gameId], ...patch }
        };

        setGameAvailability(next);

        const nextSettings = {
            ...settings,
            games: { ...(settings.games || {}), [key]: next[gameId] }
        };

        try {
            await savePlatformSettings(nextSettings);
            setSettings(nextSettings);
        } catch (error) {
            console.error('Error saving game settings:', error);
            setGameAvailability(previous);
            throw error;
        }
    }, [gameAvailability, settings]);

    const refresh = useCallback(async () => {
        setLoading(true);
        const loaded = await fetchPlatformSettings();
        setSettings(loaded);
        setGameAvailability(resolveGameAvailability(loaded));
        setLoading(false);
    }, []);

    const value = useMemo(() => ({
        settings,
        loading,
        gameAvailability,
        isGameEnabled: (id) => Boolean(gameAvailability[id]?.enabled),
        isGameComingSoon: (id) => Boolean(gameAvailability[id]?.comingSoon) || !gameAvailability[id]?.enabled,
        updateGameAvailability,
        refresh
    }), [settings, loading, gameAvailability, updateGameAvailability, refresh]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}