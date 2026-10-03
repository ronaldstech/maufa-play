import { createContext, useContext } from 'react';

/**
 * Context object and hook live in a plain .js file so the provider component can be
 * exported on its own (keeps `react-refresh` happy about component-only exports).
 */
export const SettingsContext = createContext(null);

export const useSettings = () => useContext(SettingsContext);