"use client";

import Cookies from "js-cookie";
import { PropsWithChildren, useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import { SettingsContext } from "../../src/context/contexts";
import { getSettings } from "../../src/util/client";
import { DEFAULT_SETTINGS, Settings } from "../../src/util/settings";

export default function Wrapper({
  messages,
  locale,
  children,
}: PropsWithChildren<{ messages: Record<string, string>; locale: string }>) {
  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      onError={(err) => {
        if (err.code === "MISSING_TRANSLATION") {
          return;
        }
        console.log(err);
      }}
    >
      {children}
    </IntlProvider>
  );
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function updateSetting<T extends keyof Settings>(
    setting: T,
    value: Settings[T],
  ) {
    setSettings((settings) => {
      const newSettings: Settings = {
        ...settings,
        [setting]: value,
      };
      Cookies.set("settings", JSON.stringify(newSettings));
      return newSettings;
    });
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
