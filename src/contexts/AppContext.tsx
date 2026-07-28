
import { createContext, useContext, useState } from "react";
import { AppState } from "@/types";

interface AppContextType extends AppState {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
}

const initialState: AppState = {
  sidebarOpen: false,
  sidebarCollapsed: false,
};

const AppContext = createContext<AppContextType>({
  ...initialState,
  toggleSidebar: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleCollapse: () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(initialState);

  const toggleSidebar = () => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  };

  const openSidebar = () => {
    setState((prev) => ({ ...prev, sidebarOpen: true }));
  };

  const closeSidebar = () => {
    setState((prev) => ({ ...prev, sidebarOpen: false }));
  };

  const toggleCollapse = () => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        toggleCollapse,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
