import { create } from 'zustand'

export interface UserState {
  apiKey: string
  secretKey: string
  shareToken: string
  accessToken: string
}

export interface UserActions {
  updateUser: (payload: Partial<UserState>) => void
  clearUser: () => void
}

const initialState: UserState = {
  apiKey: '',
  secretKey: '',
  shareToken: '',
  accessToken: '',
}

export const useUserStore = create<UserState & UserActions>()((set) => ({
  ...initialState,

  updateUser: (payload) => set((state) => ({ ...state, ...payload })),

  clearUser: () => set(initialState),
}))
