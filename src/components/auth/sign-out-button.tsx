import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction} className="w-full sm:w-auto">
      <button className="button-secondary w-full sm:w-auto" type="submit">
        Sign out
      </button>
    </form>
  );
}
