import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setPropertyId as setApiPropertyId } from '../lib/api';
import { joinPropertyRoom, leavePropertyRoom } from '../lib/socket';

interface PropertyContextValue {
  propertyId: string | null;
  setPropertyId: (id: string) => void;
}

const PropertyContext = createContext<PropertyContextValue>({
  propertyId: null,
  setPropertyId: () => {},
});

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [propertyId, setPropertyIdState] = useState<string | null>(
    searchParams.get('propertyId'),
  );

  function setPropertyId(id: string) {
    setPropertyIdState(id);
    setSearchParams((prev) => {
      prev.set('propertyId', id);
      return prev;
    });
  }

  useEffect(() => {
    setApiPropertyId(propertyId);
    if (propertyId) {
      joinPropertyRoom(propertyId);
      return () => leavePropertyRoom(propertyId);
    }
  }, [propertyId]);

  return (
    <PropertyContext.Provider value={{ propertyId, setPropertyId }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  return useContext(PropertyContext);
}
