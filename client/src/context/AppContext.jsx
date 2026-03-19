import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { channelApi, videoApi, notifApi } from "../lib/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [selChannel, setSelChannel] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ch, vd, nf] = await Promise.all([
        channelApi.list(),
        videoApi.list(),
        notifApi.list(),
      ]);
      setChannels(ch);
      setVideos(vd);
      setNotifs(nf);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refreshChannels = useCallback(async () => {
    try { setChannels(await channelApi.list()); } catch {}
  }, []);

  const refreshVideos = useCallback(async () => {
    try { setVideos(await videoApi.list()); } catch {}
  }, []);

  const refreshNotifs = useCallback(async () => {
    try { setNotifs(await notifApi.list()); } catch {}
  }, []);

  return (
    <AppContext.Provider value={{
      channels, videos, notifs, selChannel,
      setChannels, setVideos, setNotifs, setSelChannel,
      refreshChannels, refreshVideos, refreshNotifs,
      loading, fetchAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
