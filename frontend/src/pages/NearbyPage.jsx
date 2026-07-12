import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Radar } from 'lucide-react';
import Avatar from '../components/Avatar';
import { usersApi } from '../api/resources';
import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';

const RADIUS_OPTIONS = [1, 5, 10, 50];
const LOCATION_KEY = 'nearbi:location-granted';

function getBrowserPosition() {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 5 * 60 * 1000, timeout: 10000 }));
}

export default function NearbyPage() {
  const dispatch = useDispatch();
  const [permission, setPermission] = useState('checking');
  const [radius, setRadius] = useState(5);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState(null);

  const loadNearby = async (nextRadius = radius) => {
    setLoading(true);
    try { const { data } = await usersApi.getNearby(nextRadius); setUsers(data.users || []); }
    catch (err) { dispatch(pushToast(err.response?.data?.message || 'Could not load nearby users.', 'error')); }
    finally { setLoading(false); }
  };
  const saveAndLoadPosition = async () => {
    const position = await getBrowserPosition();
    const coords = { longitude: position.coords.longitude, latitude: position.coords.latitude };
    sessionStorage.setItem(LOCATION_KEY, 'true');
    setMyLocation(coords);
    setPermission('granted');
    try {
      await usersApi.updateLocation(coords.longitude, coords.latitude);
      await loadNearby();
    } catch (err) {
      // Browser access is still granted even if the server cannot sync it.
      dispatch(pushToast(err.response?.data?.message || 'Location is allowed, but could not be synced yet.', 'error'));
    }
  };

  useEffect(() => {
    let active = true;
    const restoreLocation = async () => {
      if (!navigator.geolocation) { if (active) setPermission('denied'); return; }
      let browserPermission = 'prompt';
      if (navigator.permissions?.query) {
        try { browserPermission = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch { /* Permissions API is optional. */ }
      }
      if (!active) return;
      if (browserPermission === 'denied') { setPermission('denied'); return; }
      if (browserPermission === 'granted' || sessionStorage.getItem(LOCATION_KEY) === 'true') {
        try { await saveAndLoadPosition(); } catch { if (active) setPermission('denied'); }
      } else setPermission('idle');
    };
    restoreLocation();
    return () => { active = false; };
  }, []);

  const requestLocation = async () => { setPermission('asked'); try { await saveAndLoadPosition(); } catch { setPermission('denied'); dispatch(pushToast('Location permission was not granted.', 'error')); } };
  const handleRadiusChange = (value) => { setRadius(value); if (permission === 'granted') loadNearby(value); };

  return <div className="mx-auto max-w-4xl px-4 py-6"><div className="mb-6 flex items-center gap-2"><Radar size={22} className="text-teal-bright" /><h1 className="font-display text-2xl">Nearby</h1></div>{permission === 'checking' && <p className="text-sm text-slate-faint">Checking your location settings…</p>}{permission === 'idle' && <LocationPrompt onAllow={requestLocation} onDeny={() => setPermission('denied')} />}{permission === 'denied' && <p className="text-sm text-slate-faint">Location is off. Turn it on to see people who share their location.<button onClick={requestLocation} className="ml-2 text-teal-bright hover:underline">Try again</button></p>}{permission === 'granted' && <><div className="mb-5 flex gap-2">{RADIUS_OPTIONS.map((value) => <button key={value} onClick={() => handleRadiusChange(value)} className={`rounded-full border px-3 py-1.5 font-mono text-sm ${radius === value ? 'border-teal bg-teal text-paper' : 'border-ink-line text-slate-faint hover:text-paper'}`}>{value}km</button>)}</div><PhilippinesMap users={users} me={myLocation} /><div className="mt-6">{loading ? <p className="text-sm text-slate-faint">Finding people nearby…</p> : users.length === 0 ? <p className="text-sm text-slate-faint">No location-sharing accounts are within {radius}km. Accounts must select Location sharing and choose who can see them in Privacy settings.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{users.map((user) => <Link key={user._id} to={`/profile/${user.username}`} className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft p-3 hover:bg-ink"><Avatar src={user.profilePicture?.url} alt={user.username} size="md" online={user.isOnline} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.username}</span><span className="block truncate text-xs text-slate-faint">{user.locationLabel || 'Nearby'}</span></span></Link>)}</div>}</div></>}</div>;
}

function LocationPrompt({ onAllow, onDeny }) { return <div className="rounded-2xl border border-ink-line bg-ink-soft p-6 text-center"><p className="mb-2 font-display text-lg">Allow this application to access your location?</p><p className="mb-5 text-sm text-slate-faint">See people nearby and share your own presence. You can change this anytime in Settings → Privacy.</p><div className="flex justify-center gap-3"><button onClick={onAllow} className="rounded-xl bg-coral px-5 py-2 font-semibold text-ink">Allow</button><button onClick={onDeny} className="rounded-xl border border-ink-line px-5 py-2 hover:bg-ink">Deny</button></div></div>; }

function PhilippinesMap({ users, me }) {
  const markerStyle = (location) => { const [longitude, latitude] = location?.coordinates || []; return { left: `${Math.max(5, Math.min(95, ((longitude - 116) / 11) * 100))}%`, top: `${Math.max(5, Math.min(95, ((22 - latitude) / 18) * 100))}%` }; };
  return <div className="relative h-[280px] overflow-hidden rounded-2xl border border-ink-line bg-[#0d2734] shadow-inner sm:h-[360px]"><div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(#2fa39c33 1px, transparent 1px), linear-gradient(90deg, #2fa39c33 1px, transparent 1px)', backgroundSize: '36px 36px' }} /><svg viewBox="0 0 300 450" className="absolute inset-0 m-auto h-full w-full opacity-70" aria-label="Map of the Philippines"><path fill="#1f6f6b" d="M149 25l20 25-10 22 20 19-12 33-23-2-18-33 8-30zM120 150l25-17 27 12 8 35-22 30-35-12-10-28zM182 199l18 10-3 30-18 20-16-28zM106 230l35 10 23 40-13 45-38 22-30-38 8-48zM167 307l20 18-13 42-25 22-14-28 10-36zM75 340l28 8 8 35-22 26-25-20z" /></svg><p className="absolute left-4 top-4 text-xs font-semibold tracking-widest text-teal-bright">PHILIPPINES · LIVE LOCATIONS</p>{me && <span title="Your location" className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-paper bg-coral" style={{ ...markerStyle({ coordinates: [me.longitude, me.latitude] }) }}><MapPin size={15} className="text-ink" /></span>}{users.map((user) => <Link key={user._id} to={`/profile/${user.username}`} title={user.username} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={markerStyle(user.location)}><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-paper bg-teal shadow-lg"><Avatar src={user.profilePicture?.url} alt={user.username} size="sm" /></span></Link>)}</div>;
}
