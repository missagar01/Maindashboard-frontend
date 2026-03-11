import { useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { isAdminUser } from "../../utils/accessControl";
import AdminHomePage from "../master/pages/AdminPage";
import UserHomePage from "../master/pages/AllUsers";

export default function Home() {
  const { user } = useAuth();
  const allUsersRef = useRef<HTMLDivElement | null>(null);

  if (isAdminUser(user)) {
    return (
      <AdminHomePage
        allUsersRef={allUsersRef}
        showAllUsersModal={false}
        setShowAllUsersModal={() => undefined}
      />
    );
  }

  return <UserHomePage />;
}
