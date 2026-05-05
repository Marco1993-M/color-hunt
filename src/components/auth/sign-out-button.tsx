import { signOutAction } from "@/app/actions";

type SignOutButtonProps = {
  isAnonymous?: boolean;
};

export function SignOutButton({ isAnonymous = false }: SignOutButtonProps) {
  return (
    <form action={signOutAction} className="w-full sm:w-auto">
      <button className="button-secondary w-full sm:w-auto" type="submit">
        {isAnonymous ? "End guest session" : "Sign out"}
      </button>
    </form>
  );
}
