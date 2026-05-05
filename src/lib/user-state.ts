type AnonymousUserLike = {
  is_anonymous?: boolean | null;
};

export function isAnonymousUser(user: AnonymousUserLike | null | undefined) {
  return Boolean(user?.is_anonymous);
}
