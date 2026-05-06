import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';

export function useAppPreferences() {
  return useAppPreferencesContext();
}
