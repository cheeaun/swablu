import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

const usePreferences = () => {
  const { agent } = useAuth();
  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => agent.getPreferences(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!agent?.did,
  });
  return preferences || {};
};

export default usePreferences;
