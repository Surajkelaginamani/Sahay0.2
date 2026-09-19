import localforage from 'localforage';
import axios from 'axios';

// ── 1. Initialize IndexedDB Stores via localforage ──────────────────────────
export const dataCache = localforage.createInstance({
  name: 'sahay-offline',
  storeName: 'sahay-data-cache',
  description: 'Cached JSON responses for critical offline GET requests',
});

export const syncQueueStore = localforage.createInstance({
  name: 'sahay-offline',
  storeName: 'sahay-sync-queue',
  description: 'Queued write actions pending background sync',
});

// ── 2. Event Dispatcher for Toast Notifications ─────────────────────────────
export const dispatchOfflineToast = (type, payload = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sahay:offline-toast', {
        detail: { type, ...payload },
      })
    );
  }
};

// Resolve absolute endpoint URL combining baseURL if present
export const resolveUrl = (url = '', baseURL = '') => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (baseURL) {
    const base = baseURL.replace(/\/+$/, '');
    const path = url.replace(/^\/+/, '');
    return `${base}/${path}`;
  }
  return url;
};

// Normalize cache keys
export const getCacheKey = (url = '', params = {}, baseURL = '') => {
  try {
    const resolved = resolveUrl(url, baseURL);
    const cleanUrl = resolved.replace(/^https?:\/\/[^/]+/, '');
    const queryString = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return `${cleanUrl}${queryString}`;
  } catch {
    return url;
  }
};

// ── 3. Data Cache Read / Write Methods ──────────────────────────────────────
export const cacheResponse = async (url, params, data, baseURL = '') => {
  if (!url || data === undefined || data === null) return;
  try {
    const key = getCacheKey(url, params, baseURL);
    await dataCache.setItem(key, {
      data,
      cachedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to cache response in IndexedDB:', err);
  }
};

export const getCachedResponse = async (url, params, baseURL = '') => {
  try {
    const key = getCacheKey(url, params, baseURL);
    const item = await dataCache.getItem(key);
    if (item && item.data !== undefined) {
      return item.data;
    }
    return null;
  } catch (err) {
    console.warn('Failed to read cached response from IndexedDB:', err);
    return null;
  }
};

// ── 4. Offline Action Queue Methods ─────────────────────────────────────────
export const enqueueOfflineAction = async ({ url, method, data, headers }) => {
  const item = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url,
    method: (method || 'POST').toUpperCase(),
    data: data ? (typeof data === 'string' ? JSON.parse(data) : data) : null,
    headers: {
      Authorization: headers?.Authorization || headers?.authorization || '',
      'Content-Type': 'application/json',
    },
    timestamp: Date.now(),
  };

  try {
    await syncQueueStore.setItem(item.id, item);
  } catch (err) {
    console.error('Failed to store offline action in IndexedDB:', err);
  }

  // Trigger UI toast notification: <CloudOff /> "Offline: Action saved locally. Will sync automatically."
  dispatchOfflineToast('action-queued', {
    message: 'Offline: Action saved locally. Will sync automatically.',
    action: item,
  });

  return {
    data: {
      success: true,
      offlineQueued: true,
      message: 'Offline: Action saved locally. Will sync automatically.',
      actionId: item.id,
    },
    status: 200,
    statusText: 'OK (Offline Queued)',
    headers: {},
    isOfflineQueued: true,
  };
};

export const getPendingSyncQueue = async () => {
  const items = [];
  try {
    await syncQueueStore.iterate((value, key) => {
      items.push({ ...value, id: key });
    });
    items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } catch (err) {
    console.error('Failed to retrieve sync queue from IndexedDB:', err);
  }
  return items;
};

export const clearPendingSyncQueue = async () => {
  try {
    await syncQueueStore.clear();
  } catch (err) {
    console.error('Failed to clear sync queue:', err);
  }
};

// ── 5. Background Sync Execution ────────────────────────────────────────────
let isSyncing = false;

export const syncQueue = async () => {
  if (isSyncing || typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  isSyncing = true;
  try {
    const items = await getPendingSyncQueue();
    if (items.length === 0) {
      isSyncing = false;
      return;
    }

    dispatchOfflineToast('sync-started', {
      count: items.length,
      message: `Syncing ${items.length} pending offline actions...`,
    });

    let syncedCount = 0;

    for (const item of items) {
      try {
        await axios({
          url: item.url,
          method: item.method,
          data: item.data,
          headers: item.headers,
          skipOfflineInterceptor: true,
        });

        // Remove item on success
        await syncQueueStore.removeItem(item.id);
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync queued action (${item.method} ${item.url}):`, err);

        // Discard if unrecoverable client validation error (400, 404, 422)
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          await syncQueueStore.removeItem(item.id);
        } else {
          // Network issue or server 5xx: halt sync loop and retry later
          break;
        }
      }
    }

    if (syncedCount > 0) {
      dispatchOfflineToast('sync-success', {
        count: syncedCount,
        message: 'Connection restored: Pending actions synced successfully!',
      });
      // Notify active dashboards to refresh live queries
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahay:sync-completed', { detail: { syncedCount } }));
      }
    }
  } catch (err) {
    console.error('Background sync process error:', err);
  } finally {
    isSyncing = false;
  }
};

// Attach listeners for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    dispatchOfflineToast('online', { message: 'Back online. Syncing pending data...' });
    syncQueue();
  });

  window.addEventListener('offline', () => {
    dispatchOfflineToast('offline', { message: 'You are currently offline. Local changes will be saved.' });
  });
}

// ── 6. Axios Interceptors for Offline Read & Write ──────────────────────────
export const setupOfflineInterceptors = (axiosInstance) => {
  if (!axiosInstance || !axiosInstance.interceptors) return;

  // Request Interceptor: Detect offline status before network dispatch
  axiosInstance.interceptors.request.use(
    async (config) => {
      if (config.skipOfflineInterceptor) return config;

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        const method = (config.method || 'get').toLowerCase();

        // Offline GET: immediate IndexedDB fallback
        if (method === 'get') {
          config.adapter = async () => {
            const cachedData = await getCachedResponse(config.url, config.params, config.baseURL);
            if (cachedData !== null) {
              return {
                data: cachedData,
                status: 200,
                statusText: 'OK (Offline Cache)',
                headers: {},
                config,
                isFromCache: true,
              };
            }
            throw new Error(`Offline: No cached data found for ${config.url}`);
          };
          return config;
        }

        // Offline Write (POST, PUT, PATCH, DELETE): queue in IndexedDB
        if (['post', 'put', 'patch', 'delete'].includes(method)) {
          config.adapter = async () => {
            const targetUrl = resolveUrl(config.url, config.baseURL);
            return await enqueueOfflineAction({
              url: targetUrl,
              method: config.method,
              data: config.data,
              headers: config.headers,
            });
          };
          return config;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Cache successful GETs and recover from network drops
  axiosInstance.interceptors.response.use(
    (response) => {
      if (
        response &&
        response.config &&
        !response.config.skipOfflineInterceptor &&
        (response.config.method || 'get').toLowerCase() === 'get' &&
        response.status === 200 &&
        response.data
      ) {
        cacheResponse(response.config.url, response.config.params, response.data, response.config.baseURL);
      }
      return response;
    },
    async (error) => {
      const config = error.config;
      if (!config || config.skipOfflineInterceptor) {
        return Promise.reject(error);
      }

      const isNetworkDrop =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isNetworkDrop) {
        const method = (config.method || 'get').toLowerCase();

        // Fallback to cached GET response
        if (method === 'get') {
          const cached = await getCachedResponse(config.url, config.params, config.baseURL);
          if (cached !== null) {
            return Promise.resolve({
              data: cached,
              status: 200,
              statusText: 'OK (Offline Cache Fallback)',
              headers: {},
              config,
              isFromCache: true,
            });
          }
        }

        // Queue write actions that failed due to network drop
        if (['post', 'put', 'patch', 'delete'].includes(method)) {
          const targetUrl = resolveUrl(config.url, config.baseURL);
          const syntheticResponse = await enqueueOfflineAction({
            url: targetUrl,
            method: config.method,
            data: config.data,
            headers: config.headers,
          });
          return Promise.resolve(syntheticResponse);
        }
      }

      return Promise.reject(error);
    }
  );
};
