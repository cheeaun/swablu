import { createContext, useContext, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import store from '../utils/store';

const ViewModeContext = createContext({});

export const ViewModeProvider = ({ value: defaultValue, children }) => {
  const router = useRouter();
  const { latestLocation } = router;
  const [viewMode, setViewMode] = useState(
    defaultValue?.viewMode ||
      store.account.get('viewMode', latestLocation.pathname) ||
      'list',
  );

  const value = {
    viewMode,
    setViewMode: (value) => {
      console.log('setViewMode', value);
      setViewMode(value);
      store.account.set('viewMode', latestLocation.pathname, value);
    },
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => useContext(ViewModeContext);
