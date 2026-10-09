import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmergencyService {
  id: string;
  osmType: 'node' | 'way' | 'relation';
  name: string;
  type: 'hospital' | 'police' | 'fire_station';
  latitude: number;
  longitude: number;
  phone: string | null;
  address: string;
  distanceKm: number;
}

interface NearbyServicesCache {
  services: EmergencyService[];
  latitude: number;
  longitude: number;
  updatedAt: number;
}

export interface NearbyServicesContextValue {
  services: EmergencyService[];
  userLocation: { latitude: number; longitude: number; } | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  locationDenied: boolean;
  isUsingCache: boolean;
  lastUpdated: number | null;
  refreshServices: () => Promise<void>;
}

const CACHE_KEY = '@nearby_emergency_services_v2';
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const NearbyServicesContext = createContext<NearbyServicesContextValue | undefined>(undefined);

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export const NearbyServicesProvider = ({ children }: { children: ReactNode }) => {
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const inFlightRef = useRef(false);

  const loadCache = async (): Promise<NearbyServicesCache | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as NearbyServicesCache;
      }
    } catch (e) {
      // ignore cache errors
    }
    return null;
  };

  const saveCache = async (data: NearbyServicesCache) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore cache errors
    }
  };

  const fetchServices = async (isRefresh: boolean = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    
    setError(null);
    setLocationDenied(false);
    let cache: NearbyServicesCache | null = null;

    try {
      // 1. Check Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }

      // 2. Get Location
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced 
      });
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      // 3. Check Cache Validity (15 mins and < 1km movement)
      cache = await loadCache();
      const now = Date.now();
      if (!isRefresh && cache) {
        const distMoved = calculateDistance(latitude, longitude, cache.latitude, cache.longitude);
        const ageMs = now - cache.updatedAt;
        const isFresh = ageMs < 15 * 60 * 1000;
        
        if (distMoved < 1.0 && isFresh) {
          setServices(cache.services);
          setIsUsingCache(false); // True freshness, not fallback cache
          setLastUpdated(cache.updatedAt);
          inFlightRef.current = false;
          setIsInitialLoading(false);
          setIsRefreshing(false);
          return;
        }
        // If cache exists but we are refreshing or it's stale, show it temporarily if we don't have services loaded yet
        if (services.length === 0) {
          setServices(cache.services);
          setIsUsingCache(true);
          setLastUpdated(cache.updatedAt);
        }
      }

      // 4. Overpass API Query execution function
      const executeQuery = async (radius: number): Promise<any | null> => {
        const query = `[out:json][timeout:20];(nwr(around:${radius},${latitude},${longitude})["amenity"="hospital"];nwr(around:${radius},${latitude},${longitude})["amenity"="police"];nwr(around:${radius},${latitude},${longitude})["amenity"="fire_station"];);out tags center qt;`;
        
        for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
          const endpoint = OVERPASS_ENDPOINTS[i];
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            let res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'FloodGuardApp/1.0 (contact@floodguard.com)'
              },
              body: `data=${encodeURIComponent(query.trim())}`,
              signal: controller.signal,
            });

            if (res.status === 406) {
              console.info(`Overpass endpoint ${endpoint} returned 406 on POST. Retrying with GET.`);
              res = await fetch(`${endpoint}?data=${encodeURIComponent(query.trim())}`, {
                method: 'GET',
                headers: { 
                  'Accept': 'application/json',
                  'User-Agent': 'FloodGuardApp/1.0 (contact@floodguard.com)'
                },
                signal: controller.signal
              });
            }

            clearTimeout(timeoutId);

            if (res.ok) {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const resultData = await res.json();
                if (resultData && Array.isArray(resultData.elements)) {
                   return resultData;
                }
              }
            }
            console.info(`Overpass endpoint unavailable: ${endpoint} (Status: ${res.status})`);
          } catch (e) {
            clearTimeout(timeoutId);
            console.info(`Overpass endpoint unavailable: ${endpoint} (Network/Timeout)`);
          }
          
          // Wait 750ms before fallback
          if (i < OVERPASS_ENDPOINTS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 750));
          }
        }
        return null;
      };

      let data = await executeQuery(5000);
      if (data && data.elements.length === 0) {
        console.info('No services found within 5km, trying 10km fallback.');
        const largerData = await executeQuery(10000);
        if (largerData) {
           data = largerData;
        }
      }

      if (!data) {
        throw new Error('All endpoints failed');
      }

      // 5. Parse, Filter, and Deduplicate
      const parsedServices: EmergencyService[] = [];
      const exactSeen = new Set<string>();

      for (const element of data.elements) {
        const uniqueId = `${element.type}:${element.id}`;
        if (exactSeen.has(uniqueId)) continue;
        exactSeen.add(uniqueId);

        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        
        if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon)) continue;

        const tags = element.tags || {};
        
        // Exclude specific police types
        const isPolice = tags.amenity === 'police';
        if (isPolice) {
          const lowerTags = JSON.stringify(tags).toLowerCase();
          if (
            lowerTags.includes('mess') || 
            lowerTags.includes('barracks') || 
            lowerTags.includes('quarters') ||
            lowerTags.includes('academy') ||
            lowerTags.includes('training centre')
          ) {
            continue;
          }
        }
        if (tags.access === 'private' || tags.access === 'no') continue;

        let name = tags['name:en'] || tags.name || tags.official_name || tags.short_name || tags.operator || null;
        if (!name) continue;
        
        if (isPolice && !name.toLowerCase().includes('police')) {
          name = `${name} Police Station`;
        }

        let type: 'hospital' | 'police' | 'fire_station' = 'hospital';
        if (tags.amenity === 'police') type = 'police';
        else if (tags.amenity === 'fire_station') type = 'fire_station';

        const phone = tags.phone || 
                      tags['contact:phone'] || 
                      tags['emergency:phone'] || 
                      tags.mobile || 
                      tags['contact:mobile'] || 
                      null;

        // Address generation
        let address = '';
        if (tags['addr:full']) address = tags['addr:full'];
        else {
          const parts = [];
          if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
          if (tags['addr:street']) parts.push(tags['addr:street']);
          if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
          if (tags['addr:city']) parts.push(tags['addr:city']);
          if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
          address = parts.join(', ');
        }
        if (!address) address = 'Location available on map';

        const distanceKm = calculateDistance(latitude, longitude, lat, lon);

        parsedServices.push({
          id: element.id.toString(),
          osmType: element.type,
          name,
          type,
          latitude: lat,
          longitude: lon,
          phone,
          address,
          distanceKm
        });
      }

      // Semantic deduplication
      const uniqueSortedServices: EmergencyService[] = [];
      
      for (const service of parsedServices) {
        const normalizedName = service.name.trim().toLowerCase().replace(/\s+/g, " ");
        
        const existingIndex = uniqueSortedServices.findIndex(s => {
          const isSameType = s.type === service.type;
          const isSameName = s.name.trim().toLowerCase().replace(/\s+/g, " ") === normalizedName;
          const isNearby = calculateDistance(s.latitude, s.longitude, service.latitude, service.longitude) < 0.1;
          return isSameType && isSameName && isNearby;
        });

        if (existingIndex !== -1) {
          const existing = uniqueSortedServices[existingIndex];
          // Decide which one is better
          let existingScore = 0;
          let newScore = 0;
          if (existing.phone) existingScore++;
          if (service.phone) newScore++;
          if (existing.address !== 'Location available on map') existingScore++;
          if (service.address !== 'Location available on map') newScore++;
          
          if (newScore > existingScore) {
            uniqueSortedServices[existingIndex] = service;
          }
        } else {
          uniqueSortedServices.push(service);
        }
      }

      uniqueSortedServices.sort((a, b) => a.distanceKm - b.distanceKm);
      
      setServices(uniqueSortedServices);
      setIsUsingCache(false);
      setLastUpdated(Date.now());
      
      await saveCache({
        services: uniqueSortedServices,
        latitude,
        longitude,
        updatedAt: Date.now()
      });

    } catch (err: any) {
      if (!cache && services.length === 0) {
        setError('Could not connect to emergency service databases.');
      } else {
        setIsUsingCache(true);
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <NearbyServicesContext.Provider value={{
      services,
      userLocation,
      isInitialLoading,
      isRefreshing,
      error,
      locationDenied,
      isUsingCache,
      lastUpdated,
      refreshServices: () => fetchServices(true),
    }}>
      {children}
    </NearbyServicesContext.Provider>
  );
};

export const useNearbyServicesContext = () => {
  const context = useContext(NearbyServicesContext);
  if (context === undefined) {
    throw new Error('useNearbyServicesContext must be used within a NearbyServicesProvider');
  }
  return context;
};
