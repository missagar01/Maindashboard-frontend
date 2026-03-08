import { useSyncExternalStore } from "react";

type StateUpdater<T> = T | Partial<T> | ((state: T) => T | Partial<T>);

type SetState<T> = (partial: StateUpdater<T>, replace?: boolean) => void;
type GetState<T> = () => T;

type StoreApi<T> = {
  setState: SetState<T>;
  getState: GetState<T>;
  subscribe: (listener: () => void) => () => void;
};

type StateCreator<T> = (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => T;

type Selector<T, U> = (state: T) => U;

type BoundStore<T> = {
  (): T;
  <U>(selector: Selector<T, U>): U;
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (listener: () => void) => () => void;
};

type PersistOptions = {
  name: string;
};

const createBoundStore = <T>(initializer: StateCreator<T>): BoundStore<T> => {
  let state: T;
  const listeners = new Set<() => void>();

  const getState: GetState<T> = () => state;

  const setState: SetState<T> = (partial, replace = false) => {
    const nextState =
      typeof partial === "function" ? (partial as (current: T) => T | Partial<T>)(state) : partial;
    const computedState = replace ? (nextState as T) : ({ ...state, ...nextState } as T);

    if (Object.is(computedState, state)) return;
    state = computedState;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api: StoreApi<T> = {
    setState,
    getState,
    subscribe,
  };

  state = initializer(setState, getState, api);

  const useStore = (<U>(selector?: Selector<T, U>) => {
    const selected = selector ?? ((s: T) => s as unknown as U);
    return useSyncExternalStore(subscribe, () => selected(getState()), () => selected(getState()));
  }) as BoundStore<T>;

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
};

export function create<T>(initializer: StateCreator<T>): BoundStore<T>;
export function create<T>(): (initializer: StateCreator<T>) => BoundStore<T>;
export function create<T>(initializer?: StateCreator<T>) {
  if (initializer) {
    return createBoundStore(initializer);
  }
  return (nextInitializer: StateCreator<T>) => createBoundStore(nextInitializer);
}

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const toSerializableState = <T>(value: T) => {
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).filter(([, entryValue]) => typeof entryValue !== "function")
  );
};

export const persist =
  <T>(
    config: StateCreator<T>,
    options: PersistOptions
  ): StateCreator<T> =>
  (set, get, api) => {
    const storage = getStorage();

    const setWithPersist: SetState<T> = (partial, replace) => {
      set(partial, replace);
      if (!storage) return;

      try {
        storage.setItem(options.name, JSON.stringify(toSerializableState(get())));
      } catch {
        // Ignore persistence failures.
      }
    };

    const initialState = config(setWithPersist, get, api);

    if (!storage) {
      return initialState;
    }

    try {
      const raw = storage.getItem(options.name);
      if (!raw) return initialState;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...initialState,
          ...parsed,
        };
      }
    } catch {
      // Ignore malformed persisted payloads.
    }

    return initialState;
  };
