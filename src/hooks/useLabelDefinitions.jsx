import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

const useLabelDefinitions = (prefs) => {
  const { agent } = useAuth();
  const { data: labelDefinitions } = useQuery({
    queryKey: ['label-definitions'],
    queryFn: () => agent.getLabelDefinitions(prefs),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!agent?.did && !!prefs,
  });
  return labelDefinitions || {};
};

export default useLabelDefinitions;
