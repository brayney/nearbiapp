import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Radar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import Avatar from '../components/Avatar';
import { usersApi } from '../api/resources';
import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';

const RADIUS_OPTIONS = [1, 5, 10, 50];
const LOCATION_KEY = 'nearbi:location-granted';
const PHILIPPINES_CENTER = [12.8797, 121.774];

function getBrowserPosition() {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    maximumAge: 5 * 60 * 1000,
    timeout: 10000,
  }));
}

function hasCoordinates(location) {
  const coordinates = location?.coordinates;
  return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite);
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13, { animate: true });
  }, [center, map]);
  return null;
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
    try {
      const { data } = await usersApi.getNearby(nextRadius);
      setUsers(data.users || []);
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not load nearby users.', 'error'));
    } finally {
      setLoading(false);
    }
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
      dispatch(pushToast(err.response?.data?.message || 'Location is allowed, but could not be synced yet.', 'error'));
    }
  };

  useEffect(() => {
    let active = true;
    const restoreLocation = async () => {
      if (!navigator.geolocation) {
        if (active) setPermission('denied');
        return;
      }
      let browserPermission = 'prompt';
      if (navigator.permissions?.query) {
        try {
          browserPermission = (await navigator.permissions.query({ name: 'geolocation' })).state;
        } catch {
          // The Permissions API is not supported in every browser.
        }
      }
      if (!active) return;
      if (browserPermission === 'denied') {
        setPermission('denied');
        return;
      }
      if (browserPermission === 'granted' || sessionStorage.getItem(LOCATION_KEY) === 'true') {
        try {
          await saveAndLoadPosition();
        } catch {
          if (active) setPermission('denied');
        }
      } else {
        setPermission('idle');
      }
    };
    restoreLocation();
    return () => { active = false; };
  }, []);

  const requestLocation = async () => {
    setPermission('asked');
    try {
      await saveAndLoadPosition();
    } catch {
      setPermission('denied');
      dispatch(pushToast('Location permission was not granted.', 'error'));
    }
  };

  const handleRadiusChange = (value) => {
    setRadius(value);
    if (permission === 'granted') loadNearby(value);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Radar size={22} className="text-teal-bright" />
        <h1 className="font-display text-2xl">Nearby</h1>
      </div>

      {permission === 'checking' && <p className="text-sm text-slate-faint">Checking your location settings…</p>}
      {permission === 'idle' && <LocationPrompt onAllow={requestLocation} onDeny={() => setPermission('denied')} />}
      {permission === 'denied' && (
        <p className="text-sm text-slate-faint">
          Location is off. Turn it on to see people who share their location.
          <button onClick={requestLocation} className="ml-2 text-teal-bright hover:underline">Try again</button>
        </p>
      )}

      {permission === 'granted' && (
        <>
          <div className="mb-5 flex gap-2">
            {RADIUS_OPTIONS.map((value) => (
              <button key={value} onClick={() => handleRadiusChange(value)} className={`rounded-full border px-3 py-1.5 font-mono text-sm ${radius === value ? 'border-teal bg-teal text-paper' : 'border-ink-line text-slate-faint hover:text-paper'}`}>
                {value}km
              </button>
            ))}
          </div>
          <NearbyMap users={users} me={myLocation} />
          <div className="mt-6">
            {loading ? <p className="text-sm text-slate-faint">Finding people nearby…</p> : users.length === 0 ? (
              <p className="text-sm text-slate-faint">No location-sharing accounts are within {radius}km. Accounts must select Location sharing and choose who can see them in Privacy settings.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {users.map((user) => (
                  <Link key={user._id} to={`/profile/${user.username}`} className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft p-3 hover:bg-ink">
                    <Avatar src={user.profilePicture?.url} alt={user.username} size="md" online={user.isOnline} />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{user.username}</span><span className="block truncate text-xs text-slate-faint">{user.locationLabel || 'Nearby'}</span></span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LocationPrompt({ onAllow, onDeny }) {
  return <div className="rounded-2xl border border-ink-line bg-ink-soft p-6 text-center"><p className="mb-2 font-display text-lg">Allow this application to access your location?</p><p className="mb-5 text-sm text-slate-faint">See people nearby and share your own presence. You can change this anytime in Settings → Privacy.</p><div className="flex justify-center gap-3"><button onClick={onAllow} className="rounded-xl bg-coral px-5 py-2 font-semibold text-ink">Allow</button><button onClick={onDeny} className="rounded-xl border border-ink-line px-5 py-2 hover:bg-ink">Deny</button></div></div>;
}

function NearbyMap({ users, me }) {
  const center = me ? [me.latitude, me.longitude] : PHILIPPINES_CENTER;
  const mappableUsers = users.filter((user) => hasCoordinates(user.location));

  return (
    <div className="h-[280px] overflow-hidden rounded-2xl border border-ink-line shadow-inner sm:h-[360px]">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full" aria-label="Interactive nearby users map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />
        {me && (
          <CircleMarker center={[me.latitude, me.longitude]} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ff5a5f', fillOpacity: 1 }}>
            <Tooltip permanent direction="top" offset={[0, -10]}>You</Tooltip>
          </CircleMarker>
        )}
        {mappableUsers.map((user) => {
          const [longitude, latitude] = user.location.coordinates;
          return (
            <CircleMarker key={user._id} center={[latitude, longitude]} radius={9} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#137c8b', fillOpacity: 1 }}>
              <Popup>
                <Link to={`/profile/${user.username}`} className="flex items-center gap-2 text-slate-900">
                  <Avatar src={user.profilePicture?.url} alt={user.username} size="sm" />
                  <span><strong className="block">{user.displayName || user.username}</strong><span>@{user.username}</span></span>
                </Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
