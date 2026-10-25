import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./login";
import Bank from "./bank";
import Piggy from "./components/piggy";

export default function App() {
  // undefined = belum tahu, null = belum login
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  if (user === undefined) {
    return (
      <div className="splash">
        <Piggy size={72} bob />
        <p>Membuka celengan...</p>
      </div>
    );
  }
  if (user === null) return <Login />;
  return <Bank user={user} />;
}