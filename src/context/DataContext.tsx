import React, { createContext, useContext, useState, useEffect } from 'react';

// Add SignalData to the types
interface SignalData {
  symbol: string;
  description: string;
  timestamp?: number;
  risks: string[];
  // ... other signal properties
}

interface CryptoData {
  symbol: string;
  risk: number;
  icon: string;
  price: number;
  volume: number;
  moralisLink: string;
  warnings: string[];
  "1mChange": number;
  "2wChange": number;
  "3mChange": number;
  bubbleSize: number;
}

interface FilterSettings {
  skipPotentialTraps: boolean;
  avoidOverhypedTokens: boolean;
  marketCapFilter: boolean;
}

interface DataContextType {
  data: CryptoData[];
  signals: SignalData[];
  filteredData: CryptoData[];
  loading: boolean;
  error: string | null;
  filters: FilterSettings;
  updateFilters: (newFilters: Partial<FilterSettings>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CryptoData[]>([]);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [filteredData, setFilteredData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterSettings>({
    skipPotentialTraps: false,
    avoidOverhypedTokens: false,
    marketCapFilter: false,
  });

  // Add a retry mechanism
  const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw new Error('Failed to fetch after all retries');
  };

  useEffect(() => {
    let isSubscribed = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchAllData = async () => {
      try {
        // Fetch both endpoints with retry mechanism
        const [risksResponse, signalsResponse] = await Promise.all([
          fetchWithRetry("https://api.coinchart.fun/dex_risks"),
          fetchWithRetry("https://api.coinchart.fun/dex_signals")
        ]);

        if (!isSubscribed) return;

        // Process risks data
        const risksText = await risksResponse.text();
        const sanitizedRisksText = risksText.replace(/NaN/g, "null");
        const risksResult = JSON.parse(sanitizedRisksText);

        // Process signals data
        const signalsData = await signalsResponse.json();
        
        if (!isSubscribed) return;

        // Transform and set data
        const transformedRisksData = Object.entries(risksResult)
          .map(([key, value]: [string, any]) => ({
            symbol: key,
            risk: value.risk,
            icon: value.icon,
            price: value.price,
            volume: value.volume || 0,
            moralisLink: value.moralisLink,
            warnings: value.warnings || [],
            "1mChange": value["1mChange"],
            "2wChange": value["2wChange"],
            "3mChange": value["3mChange"],
            bubbleSize: value.bubbleSize
          }))
          .sort((a, b) => (b.volume || 0) - (a.volume || 0));

        const sortedSignals = signalsData.sort(
          (a: SignalData, b: SignalData) => (b.timestamp || 0) - (a.timestamp || 0)
        );

        setData(transformedRisksData);
        setFilteredData(transformedRisksData);
        setSignals(sortedSignals);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchAllData();
    
    // Set up interval for periodic updates
    intervalId = setInterval(fetchAllData, 60000); // Every minute

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Separate effect for filtering
  useEffect(() => {
    if (!data.length) return;

    const areFiltersActive = Object.values(filters).some(value => value === true);
    
    if (!areFiltersActive) {
      setFilteredData(data);
      return;
    }

    const filtered = data.filter(item => {
      if (!item.warnings || item.warnings.length === 0) return true;

      let shouldInclude = true;

      if (filters.skipPotentialTraps) {
        shouldInclude = shouldInclude && !item.warnings.some(w => 
          w.toLowerCase().includes("cycle is falling")
        );
      }

      if (filters.avoidOverhypedTokens) {
        shouldInclude = shouldInclude && !item.warnings.some(w => 
          w.toLowerCase().includes("cycle spent") && w.toLowerCase().includes("above 80")
        );
      }

      if (filters.marketCapFilter) {
        shouldInclude = shouldInclude && !item.warnings.some(w => 
          w.toLowerCase().includes("cycle has previously failed")
        );
      }

      return shouldInclude;
    });

    setFilteredData(filtered);
  }, [data, filters]);

  const updateFilters = (newFilters: Partial<FilterSettings>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <DataContext.Provider value={{
      data,
      signals,
      filteredData,
      loading,
      error,
      filters,
      updateFilters
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};