export const clientMetadata = ({
  REDIRECT_URI = `${location.origin}${location.pathname}`,
  SCOPE = 'atproto transition:generic',
  CLIENT_ID,
} = {}) => {
  const client_id =
    CLIENT_ID ||
    `http://localhost?redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}&scope=${encodeURIComponent(SCOPE)}`;
  return {
    client_id,
    scope: SCOPE,
    redirect_uris: [REDIRECT_URI],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
    grant_types: ['authorization_code', 'refresh_token'],
  };
};
