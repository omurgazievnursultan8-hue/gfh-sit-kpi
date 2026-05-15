import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './App'
import { AppShell } from './components/shell/AppShell'
import { DensityProvider } from './hooks/useDensity'
import './index.css'
import './i18n'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element missing from index.html — cannot mount React app')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <DensityProvider>
          <AppShell>
            <App />
          </AppShell>
        </DensityProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
