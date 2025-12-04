import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { MuiThemeProvider, LinearProgress } from "@material-ui/core";
import { Provider } from "react-redux";
import MomentUtils from "@date-io/moment";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import { IntlProvider } from "react-intl";

import * as serviceWorker from "./serviceWorker";
import createAppTheme from "./helpers/theme";
import store from "./helpers/store";
import LocalesManager from "./LocalesManager";
import ModulesManager from "./ModulesManager";
import ModulesManagerProvider from "./ModulesManagerProvider";
import { App, FatalError, baseApiUrl, apiHeaders } from "@openimis/fe-core";
import getConfiguredLogo from "./helpers/logo";
import messages_ref from "./translations/ref.json";
import "./index.css";
import "./rc-cascader.css";

const loadConfiguration = async () => {
  const response = await fetch(`${baseApiUrl}/graphql`, {
    method: "post",
    headers: apiHeaders(),
    body: JSON.stringify({
      query:
        "{ moduleConfigurations { module, config, controls{ field, usage } } }",
    }),
  });
  if (!response.ok) {
    throw response;
  } else {
    const { data } = await response.json();
    data.moduleConfigurations.unshift({});
    const out = data.moduleConfigurations.reduce((acc, c) => {
      try {
        acc[c.module] = { controls: c.controls, ...JSON.parse(c.config) };
      } catch (error) {
        console.error(`Failed to parse module ${c.module} config`, error);
      }
      return acc;
    }, {});
    return out;
  }
};

// --- React-Intl root config (used for both App and FatalError) ---
const browserLanguage =
  (navigator.languages && navigator.languages[0]) ||
  navigator.language ||
  "en";

const localeKey =
  Object.keys(messages_ref).find((k) =>
    browserLanguage.toLowerCase().startsWith(k.toLowerCase())
  ) || "en";

const intlMessages = messages_ref[localeKey] || messages_ref["en"] || {};

const AppContainer = () => {
  const [appState, setAppState] = React.useState({
    isLoading: true,
    config: undefined,
    error: null,
  });
  const localesManager = new LocalesManager();

  useEffect(() => {
    loadConfiguration().then(
      (config) =>
        setAppState({
          error: null,
          isLoading: false,
          config,
        }),
      (error) =>
        setAppState({
          error,
          isLoading: false,
        })
    );
  }, []);

  const themeColor = appState?.config?.["fe-core"]?.theme;
  const dynamicTheme = createAppTheme(themeColor || {});
  const logo = getConfiguredLogo(appState.config);
  const disableTextLogo =
    appState?.config?.["fe-core"]?.logo?.disableTextLogo || false;

  if (appState.isLoading) {
    return (
      <MuiThemeProvider theme={dynamicTheme}>
        <LinearProgress className="bootstrap" />
      </MuiThemeProvider>
    );
  } else if (appState.error) {
    // NOTE: This is now wrapped in IntlProvider at the root,
    // so FatalError can safely use useTranslations/useIntl.
    return (
      <MuiThemeProvider theme={dynamicTheme}>
        <FatalError
          error={{
            code: appState.error.status,
            message: appState.error.statusText,
          }}
        />
      </MuiThemeProvider>
    );
  } else {
    const modulesManager = new ModulesManager(appState.config);
    const reducers = modulesManager.getContribs("reducers").reduce(
      (reds, red) => {
        reds[red.key] = red.reducer;
        return reds;
      },
      {}
    );

    const middlewares = modulesManager.getContribs("middlewares");

    return (
      <MuiThemeProvider theme={dynamicTheme}>
        <Provider store={store(reducers, middlewares)}>
          <MuiPickersUtilsProvider utils={MomentUtils}>
            <ModulesManagerProvider modulesManager={modulesManager}>
              <App
                basename={process.env.PUBLIC_URL}
                localesManager={localesManager}
                messages={messages_ref}
                logo={logo}
                disableTextLogo={disableTextLogo}
              />
            </ModulesManagerProvider>
          </MuiPickersUtilsProvider>
        </Provider>
      </MuiThemeProvider>
    );
  }
};

// Wrap the entire app (including FatalError branch) with IntlProvider
ReactDOM.render(
  <IntlProvider locale={localeKey} messages={intlMessages}>
    <AppContainer />
  </IntlProvider>,
  document.getElementById("root")
);

serviceWorker.register();
