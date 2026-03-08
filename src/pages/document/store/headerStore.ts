import { create } from './zustandCompat';

interface HeaderState {
    title: string;
    setTitle: (title: string) => void;
}

const useHeaderStore = create<HeaderState>((set) => ({
    title: '',
    setTitle: (title) => set({ title }),
}));

export default useHeaderStore;
