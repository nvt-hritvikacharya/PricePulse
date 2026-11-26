import { redirect } from "next/navigation";

/** Middleware sends signed-out visitors to /login; signed-in users land on search. */
export default function Index() {
  redirect("/home");
}
