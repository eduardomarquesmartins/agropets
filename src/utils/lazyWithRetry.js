import { lazy } from 'react';

const isChunkLoadError = (error) => /dynamically imported module|importing a module script|loading chunk/i.test(String(error?.message || error));

/**
 * Recarrega uma única vez quando o navegador ainda possui o HTML de uma
 * implantação anterior e tenta buscar um chunk com hash que já não existe.
 */
export const lazyWithRetry = (importer) => lazy(async () => {
  try {
    const module = await importer();
    sessionStorage.removeItem('agropets:chunk-reload');
    return module;
  } catch (error) {
    const reloadKey = 'agropets:chunk-reload';
    if (isChunkLoadError(error) && !sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(reloadKey);
    throw error;
  }
});
