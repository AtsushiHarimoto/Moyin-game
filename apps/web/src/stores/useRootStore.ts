import { create } from 'zustand'

export interface RootState {
  imgUrl: string
  nextImgUrl: string
  isLoading: boolean
  lang: string
  firstLaunch: boolean
}

export interface RootActions {
  overFirstLaunch: () => void
  setImgUrl: (url: string) => void
  setNextImgUrl: (url: string) => void
  showLoading: (flag: boolean) => void
  setLang: (lang: string) => void
}

export const useRootStore = create<RootState & RootActions>()((set) => ({
  imgUrl: '',
  nextImgUrl: '',
  isLoading: false,
  lang: localStorage.getItem('user-locale') || '',
  firstLaunch: true,

  overFirstLaunch: () => set({ firstLaunch: false }),

  setImgUrl: (url) => set({ imgUrl: url }),

  setNextImgUrl: (url) => set({ nextImgUrl: url }),

  showLoading: (flag) => set({ isLoading: !!flag }),

  setLang: (lang) => set({ lang }),
}))
