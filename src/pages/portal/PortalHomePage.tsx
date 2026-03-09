import AdminPage from "../master/pages/AdminPage";
import UserHomePage from "../master/pages/AllUsers";
import { useAuth } from "../../context/AuthContext";
import { isAdminUser } from "../../utils/accessControl";

const PortalHomePage = () => {
  const { user } = useAuth();

  if (isAdminUser(user)) {
    return <AdminPage />;
  }

  return <UserHomePage />;
};

export default PortalHomePage;
