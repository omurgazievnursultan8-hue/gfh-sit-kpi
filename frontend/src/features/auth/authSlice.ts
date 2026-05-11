import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../app/api'
import type { AxiosError } from 'axios'

interface AuthState {
  userId: number | null
  email: string | null
  fullName: string | null
  role: string | null
  isAuthenticated: boolean
  passwordExpired: boolean
  pdpaRequired: boolean
  loading: boolean
  bootstrapped: boolean
  error: string | null
}

const initialState: AuthState = {
  userId: null,
  email: null,
  fullName: null,
  role: null,
  isAuthenticated: false,
  passwordExpired: false,
  pdpaRequired: false,
  loading: false,
  bootstrapped: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials)
      return data
    } catch (err) {
      const axiosErr = err as AxiosError<{ message_ru?: string }>
      return rejectWithValue(axiosErr.response?.data?.message_ru || 'Ошибка входа')
    }
  }
)

export const logoutAction = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout')
})

/**
 * Mount-time auth rehydration. Tries /auth/me using the existing JWT cookie.
 * Success → restores auth slice. 401/anything else → stays anonymous.
 * Always sets `bootstrapped: true` so ProtectedRoute can stop showing the splash.
 */
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_arg, { rejectWithValue }) => {
  try {
    // skipAuthRedirect: anonymous visits would otherwise trigger /auth/refresh → 401 → forced redirect to /login.
    const { data } = await api.get('/auth/me', { headers: { 'X-Skip-Auth-Redirect': '1' } })
    return data
  } catch (err) {
    return rejectWithValue(err)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false
      state.userId = null
      state.email = null
      state.fullName = null
      state.role = null
    },
    setAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      Object.assign(state, action.payload)
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.userId = action.payload.userId ?? null
        state.email = action.payload.email ?? null
        state.fullName = action.payload.fullName ?? null
        state.role = action.payload.role ?? null
        state.passwordExpired = action.payload.passwordExpired ?? false
        state.pdpaRequired = action.payload.pdpaRequired ?? false
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.isAuthenticated = false
        state.userId = null
        state.email = null
        state.fullName = null
        state.role = null
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isAuthenticated = true
        state.userId = action.payload.userId ?? null
        state.email = action.payload.email ?? null
        state.fullName = action.payload.fullName ?? null
        state.role = action.payload.role ?? null
        state.passwordExpired = action.payload.passwordExpired ?? false
        state.pdpaRequired = action.payload.pdpaRequired ?? false
        state.bootstrapped = true
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.bootstrapped = true
      })
  },
})

export const { logout, setAuthState, clearError } = authSlice.actions
export default authSlice.reducer
