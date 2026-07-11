import { createSlice } from '@reduxjs/toolkit';

let toastId = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    createPostOpen: false,
    toasts: [],
  },
  reducers: {
    openCreatePost(state) {
      state.createPostOpen = true;
    },
    closeCreatePost(state) {
      state.createPostOpen = false;
    },
    pushToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
      },
      prepare(message, tone = 'default', action = null) {
        return { payload: { id: ++toastId, message, tone, action } };
      },
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { openCreatePost, closeCreatePost, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
