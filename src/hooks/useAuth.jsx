import { Agent, AtpAgent } from '@atproto/api';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { initClient } from '../utils/client';
import store from '../utils/store';

const AuthContext = createContext({});

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isTouch = window.matchMedia('(pointer: coarse)').matches;

export const AuthProvider = ({ children }) => {
  const [agent, setAgent] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const clientRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const client = initClient();
        console.log('CLIENT INIT', client);
        clientRef.current = client;
        const { session } = (await client.init()) || {};
        // const currentAccountDid = store.session.get('currentAccountDid');
        // let session;
        // if (currentAccountDid) {
        //   console.log('AUTH RESTORE', { currentAccountDid });
        //   session = await client.restore(currentAccountDid);
        // } else {
        //   console.log('AUTH INIT');
        //   const result = await client.init();
        //   session = result?.session;
        // }
        if (session?.did) {
          console.log('AUTH SESSION', { session });
          setSession(session);
          const theAgent = new Agent(session);
          setAgent(theAgent);
          if (theAgent.did) {
            store.session.set('currentAccountDid', theAgent.did);
          }
        } else {
          console.error('Not signed in', session, client);
          const theAgent = new AtpAgent({
            service: 'https://public.api.bsky.app/',
          });
          setAgent(theAgent);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const login = async (identity, { handleResolver }) => {
    const display = isSafari && isTouch ? undefined : 'popup';
    let client;
    if (handleResolver) {
      client = initClient({ handleResolver });
    } else {
      client = clientRef.current;
    }
    const session = await client.signIn(identity, {
      display,
    });
    console.log('SIGN IN', { client, session });
    if (session?.did) {
      const theAgent = new Agent(session);
      setAgent(theAgent);
      setSession(session);
    }
  };

  const logout = async () => {
    session.signOut();
    setAgent(null);
    store.session.del('currentAccountDid');
  };

  const value = {
    agent,
    loaded,
    login,
    logout,
  };

  if (!loaded) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
