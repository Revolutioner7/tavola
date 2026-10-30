import * as Updates from "expo-updates";

/**
 * Al abrir la app, si hay una versión nueva publicada, la descarga y reinicia la app
 * en ese momento, en vez de esperar a la siguiente vez que se abra.
 * Devuelve true si va a reiniciar.
 */
export async function applyUpdateIfAvailable(onUpdating?: () => void): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    onUpdating?.();
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}
