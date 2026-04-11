import { AppState } from './types';

type Listener = (state: AppState) => void;

const initialState: AppState = {
  phase: 'idle',
  sourceImage: null,
  sourceImageData: null,
  gridRows: 8,
  gridCols: 8,
  tiles: [],
  videos: new Map(),
  completedCount: 0,
};

export function createStore() {
  let state: AppState = { ...initialState, videos: new Map() };
  const listeners = new Set<Listener>();

  function getState(): AppState {
    return state;
  }

  function update(partial: Partial<AppState>): void {
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function reset(): void {
    state = { ...initialState, videos: new Map() };
    listeners.forEach((listener) => listener(state));
  }

  return { getState, update, subscribe, reset };
}
