import { createBrowserRouter } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import { CaregiverDetailPage } from "../pages/CaregiverDetailPage"
import { NewCareProfilePage } from "../pages/NewCareProfilePage"
import { NotFoundPage } from "../pages/NotFoundPage"
import { SearchPage } from "../pages/SearchPage"
import { UserProfilePage } from "../pages/UserProfilePage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <UserProfilePage />,
      },
      {
        path: "profiles/new",
        element: <NewCareProfilePage />,
      },
      {
        path: "profiles/:profileId/edit",
        element: <NewCareProfilePage />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "caregivers/:caregiverId",
        element: <CaregiverDetailPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
])
