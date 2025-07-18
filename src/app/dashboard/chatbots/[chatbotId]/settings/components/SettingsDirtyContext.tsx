import React, { createContext, useContext, useState, useCallback } from "react";

interface DirtySections {
  general: boolean;
  appearance: boolean;
  behavior: boolean;
}

type SaveHandlers = {
  general?: () => Promise<void>;
  appearance?: () => Promise<void>;
  behavior?: () => Promise<void>;
};

type ResetHandlers = {
  general?: () => Promise<void>;
  appearance?: () => Promise<void>;
  behavior?: () => Promise<void>;
};

interface SettingsDirtyContextType {
  dirty: DirtySections;
  setDirty: (section: keyof DirtySections, value: boolean) => void;
  isAnyDirty: boolean;
  registerSaveHandler: (section: keyof SaveHandlers, handler: () => Promise<void>) => void;
  registerResetHandler: (section: keyof ResetHandlers, handler: () => Promise<void>) => void;
  saveAll: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const SettingsDirtyContext = createContext<SettingsDirtyContextType | undefined>(undefined);

export const useSettingsDirty = () => {
  const ctx = useContext(SettingsDirtyContext);
  if (!ctx) throw new Error("useSettingsDirty must be used within SettingsDirtyProvider");
  return ctx;
};

export const SettingsDirtyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dirty, setDirtyState] = useState<DirtySections>({ general: false, appearance: false, behavior: false });
  const [saveHandlers, setSaveHandlers] = useState<SaveHandlers>({});
  const [resetHandlers, setResetHandlers] = useState<ResetHandlers>({});

  const setDirty = useCallback((section: keyof DirtySections, value: boolean) => {
    setDirtyState((prev) => ({ ...prev, [section]: value }));
  }, []);

  const registerSaveHandler = useCallback((section: keyof SaveHandlers, handler: () => Promise<void>) => {
    setSaveHandlers((prev) => ({ ...prev, [section]: handler }));
  }, []);

  const registerResetHandler = useCallback((section: keyof ResetHandlers, handler: () => Promise<void>) => {
    setResetHandlers((prev) => ({ ...prev, [section]: handler }));
  }, []);

  const isAnyDirty = dirty.general || dirty.appearance || dirty.behavior;

  const saveAll = useCallback(async () => {
    const promises: Promise<void>[] = [];
    (Object.keys(saveHandlers) as (keyof SaveHandlers)[]).forEach((section) => {
      if (dirty[section as keyof DirtySections] && saveHandlers[section]) {
        promises.push(saveHandlers[section]!());
      }
    });
    await Promise.all(promises);
    setDirtyState({ general: false, appearance: false, behavior: false });
  }, [dirty, saveHandlers]);

  const resetAll = useCallback(async () => {
    const promises: Promise<void>[] = [];
    (Object.keys(resetHandlers) as (keyof ResetHandlers)[]).forEach((section) => {
      if (dirty[section as keyof DirtySections] && resetHandlers[section]) {
        promises.push(resetHandlers[section]!());
      }
    });
    await Promise.all(promises);
    setDirtyState({ general: false, appearance: false, behavior: false });
  }, [dirty, resetHandlers]);

  return (
    <SettingsDirtyContext.Provider value={{ dirty, setDirty, isAnyDirty, registerSaveHandler, registerResetHandler, saveAll, resetAll }}>
      {children}
    </SettingsDirtyContext.Provider>
  );
}; 