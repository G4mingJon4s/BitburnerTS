import React from 'react';
import ReactDOM from 'react-dom/client';

import { Root } from './Root';

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("Root Element not found!");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
