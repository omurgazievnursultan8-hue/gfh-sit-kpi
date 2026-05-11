import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../app/api'
import type { AxiosError } from 'axios'

interface AuthState {
  userId: number | null
  email: string | null
  role: string | null
  isAuthenticated: boolean
  passwordExpired: boolean
  pdpaRequired: boolean
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  userId: null,
  email: null,
  role: null,
  isAuthenticated: false,
  passwordExpired: false,
  pdpaRequired: false,
  loading: false,
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false
      state.userId = null
      state.email = null
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
        state.role = null
      })
  },
})

export const { logout, setAuthState, clearError } = authSlice.actions
export default authSlice.reducer
