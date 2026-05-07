type AnonymousUserLike = {
  is_anonymous?: boolean | null;
  email?: string | null;
  identities?: Array<{
    provider?: string | null;
  }> | null;
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
};

export function isAnonymousUser(user: AnonymousUserLike | null | undefined) {
  if (!user) {
    return false;
  }

  const providers = new Set(
    [
      user.app_metadata?.provider,
      ...(user.app_metadata?.providers ?? []),
      ...(user.identities?.map((identity) => identity.provider) ?? []),
    ].filter((provider): provider is string => Boolean(provider)),
  );

  const hasPermanentIdentity = [...providers].some((provider) => provider !== "anonymous");

  if (hasPermanentIdentity || user.email) {
    return false;
  }

  return Boolean(user.is_anonymous);
}
