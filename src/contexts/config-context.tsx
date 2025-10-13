import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfigContextType {
  pageSettings: any;
  configType: string;
  setPageSettings: React.Dispatch<React.SetStateAction<any>>;
  setConfigType: (type: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageSettings, setPageSettings] = useState<any>(null);
  const [configType, setConfigType] = useState<string>('');

  return (
    <ConfigContext.Provider value={{ 
      pageSettings, 
      configType, 
      setPageSettings, 
      setConfigType 
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
