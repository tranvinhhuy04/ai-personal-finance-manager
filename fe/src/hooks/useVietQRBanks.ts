import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export type VietQRBank = {
  id: number;
  code: string;
  name: string;
  shortName: string;
  logo: string;
};

type VietQRResponse = {
  code: string;
  desc: string;
  data: VietQRBank[];
};

export function useVietQRBanks(enabled = true) {
  const [banks, setBanks] = useState<VietQRBank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchBanks = useCallback(async () => {
    if (!enabled) {
      setBanks([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      const response = await axios.get<VietQRResponse>('https://api.vietqr.io/v2/banks', {
        timeout: 10000,
      });

      setBanks(response.data?.data ?? []);
    } catch {
      setIsError(true);
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  return {
    banks,
    isLoading,
    isError,
    refetch: fetchBanks,
  };
}
