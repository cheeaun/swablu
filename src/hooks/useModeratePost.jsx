import { createContext, useContext } from 'react';
import { moderatePost, AtpAgent } from '@atproto/api';
import { useAuth } from './useAuth';
import usePreferences from './usePreferences';
import useLabelDefinitions from './useLabelDefinitions';

const ModeratePostContext = createContext({});

export const ModeratePostProvider = ({ children }) => {
  const { agent } = useAuth();
  const prefs = usePreferences();
  const labelDefs = useLabelDefinitions(prefs);
  const loggedOut = agent instanceof AtpAgent;

  if (!loggedOut && (!agent?.did || !prefs || !labelDefs)) return null;

  const simplerModeratePost = (post) => {
    return moderatePost(post, {
      userDid: agent.did,
      prefs: prefs.moderationPrefs,
      labelDefs,
    });
  };

  return (
    <ModeratePostContext.Provider
      value={{
        moderatePost: simplerModeratePost,
      }}
    >
      {children}
    </ModeratePostContext.Provider>
  );
};

export const useModeratePost = () => {
  return useContext(ModeratePostContext);
};
